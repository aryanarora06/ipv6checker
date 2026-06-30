import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import http from 'node:http'
import https from 'node:https'

const reachabilityPlugin = () => ({
  name: 'reachability-api',
  configureServer(server) {
    server.middlewares.use('/api/reachability', async (req, res) => {
      // Parse query string manually since req.url is just the path+query
      const urlMatch = req.url.match(/domain=([^&]+)/);
      const domain = urlMatch ? decodeURIComponent(urlMatch[1]) : null;
      
      res.setHeader('Content-Type', 'application/json');
      if (!domain) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Domain is required' }));
      }

      const checkProto = (protocol, port) => {
        return new Promise((resolve) => {
          const start = Date.now();
          const lib = protocol === 'https:' ? https : http;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);
          const options = { method: 'HEAD', family: 6, signal: controller.signal };
          const clientReq = lib.request(`${protocol}//${domain}:${port}/`, options, (response) => {
            clearTimeout(timeoutId);
            resolve({ reachable: true, status: response.statusCode, latencyMs: Date.now() - start });
          });
          clientReq.on('error', (e) => {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
              resolve({ reachable: false, error: 'Timeout' });
            } else if (e.code === 'ENETUNREACH' || e.code === 'EADDRNOTAVAIL' || (e.code === 'ENOENT' && e.syscall === 'getaddrinfo')) {
              resolve({ reachable: false, error: 'Local network/server lacks IPv6 routing' });
            } else {
              resolve({ reachable: false, error: e.message });
            }
          });
          clientReq.end();
        });
      };

      try {
        const [httpRes, httpsRes] = await Promise.all([ checkProto('http:', 80), checkProto('https:', 443) ]);
        res.end(JSON.stringify({ domain, http: httpRes, https: httpsRes, isReachable: httpRes.reachable || httpsRes.reachable }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    reachabilityPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'IPv6 Checker',
        short_name: 'IPv6 Checker',
        description: 'Check IPv6 readiness for any domain.',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
