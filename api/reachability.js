export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  try {
    // In Vercel Node.js serverless, we can force IPv6 family using native http/https
    const https = await import('node:https');
    const http = await import('node:http');

    const checkProto = (protocol, port) => {
      return new Promise((resolve) => {
        const start = Date.now();
        const lib = protocol === 'https:' ? https : http;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        
        const options = {
          method: 'HEAD',
          family: 6, // STRICTLY IPv6
          signal: controller.signal
        };

        const req = lib.request(`${protocol}//${domain}:${port}/`, options, (response) => {
          clearTimeout(timeoutId);
          resolve({
            reachable: true,
            status: response.statusCode,
            latencyMs: Date.now() - start
          });
        });

        req.on('error', (e) => {
          clearTimeout(timeoutId);
          if (e.name === 'AbortError') {
            resolve({ reachable: false, error: 'Timeout' });
          } else if (e.code === 'ENETUNREACH' || e.code === 'EADDRNOTAVAIL' || (e.code === 'ENOENT' && e.syscall === 'getaddrinfo')) {
            resolve({ reachable: false, error: 'Local network/server lacks IPv6 routing' });
          } else {
            resolve({ reachable: false, error: e.message });
          }
        });
        
        req.end();
      });
    };

    const [httpRes, httpsRes] = await Promise.all([
      checkProto('http:', 80),
      checkProto('https:', 443)
    ]);

    res.status(200).json({
      domain,
      http: httpRes,
      https: httpsRes,
      isReachable: httpRes.reachable || httpsRes.reachable
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
