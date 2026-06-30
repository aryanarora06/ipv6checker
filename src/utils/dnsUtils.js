/* ────────────────────────────
   Helpers
   ──────────────────────────── */
export function cleanDomain(input) {
  let s = input.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
    s = 'http://' + s;
  }
  try {
    const urlObj = new URL(s);
    s = urlObj.hostname;
  } catch {
    // Fallback for extremely malformed inputs
    s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
    s = s.split(/[/:?#]/)[0];
  }
  s = s.replace(/\.$/, '');
  return s.toLowerCase();
}

export function isValidDomain(d) {
  return d && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d);
}

export async function dohQuery(name, type, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

/* Check if a hostname has AAAA records */
export async function hasAAAA(hostname) {
  try {
    const data = await dohQuery(hostname, 'AAAA');
    const addrs = (data.Answer || []).filter(a => a.type === 28).map(a => a.data);
    return { hostname, ipv6: addrs, hasIPv6: addrs.length > 0 };
  } catch {
    return { hostname, ipv6: [], hasIPv6: false };
  }
}

/* ── Full domain lookup ── */
export async function lookupDomain(target) {
  const t0 = performance.now();

  /* Phase 1: A, AAAA, MX, NS, DNSKEY, TXT (root), TXT (_dmarc), and CNAMEs in parallel */
  const [dataAAAA, dataA, dataMX, dataNS, dataDNSKEY, dataTXT, dataDMARC, dataCNAME, dataWwwCNAME] = await Promise.all([
    dohQuery(target, 'AAAA'),
    dohQuery(target, 'A'),
    dohQuery(target, 'MX'),
    dohQuery(target, 'NS'),
    dohQuery(target, 'DNSKEY'),
    dohQuery(target, 'TXT'),
    dohQuery(`_dmarc.${target}`, 'TXT'),
    dohQuery(target, 'CNAME'),
    dohQuery(`www.${target}`, 'CNAME')
  ]);

  if (dataAAAA.Status === 3 && dataA.Status === 3) return { domain: target, error: 'NXDOMAIN' };
  if (dataAAAA.Status === 2 && dataA.Status === 2) return { domain: target, error: 'SERVFAIL' };

  const ipv6 = (dataAAAA.Answer || []).filter(a => a.type === 28).map(a => ({ ip: a.data, ttl: a.TTL }));
  const ipv4 = (dataA.Answer || []).filter(a => a.type === 1).map(a => ({ ip: a.data, ttl: a.TTL }));

  /* Extract MX hostnames (type 15, data format: "10 mail.example.com.") */
  const mxHosts = (dataMX.Answer || [])
    .filter(a => a.type === 15)
    .map(a => { const parts = a.data.split(/\s+/); return { priority: parseInt(parts[0]) || 0, host: (parts[1] || '').replace(/\.$/, '').toLowerCase() }; })
    .filter(m => m.host)
    .sort((a, b) => a.priority - b.priority);

  /* Extract NS hostnames (type 2) */
  const nsHosts = (dataNS.Answer || [])
    .filter(a => a.type === 2)
    .map(a => a.data.replace(/\.$/, '').toLowerCase())
    .filter(Boolean);

  /* Phase 2: Check AAAA for each MX and NS host in parallel */
  const [mxResults, nsResults] = await Promise.all([
    Promise.all(mxHosts.map(m => hasAAAA(m.host).then(r => ({ ...r, priority: m.priority })))),
    Promise.all(nsHosts.map(ns => hasAAAA(ns))),
  ]);

  const latencyMs = Math.round(performance.now() - t0);

  const mxHasIPv6 = mxResults.some(m => m.hasIPv6);
  const nsHasIPv6 = nsResults.some(n => n.hasIPv6);

  /* Security / TXT Check */
  const hasDNSSEC = (dataDNSKEY.Answer || []).some(a => a.type === 48);
  const hasSPF = (dataTXT.Answer || []).some(a => a.type === 16 && a.data.includes('v=spf1'));
  const hasDMARC = (dataDMARC.Answer || []).some(a => a.type === 16 && a.data.includes('v=DMARC1'));

  /* ── Cloud Intelligence ── */
  let hosting = null;
  let dnsProvider = null;
  
  const nsStr = nsHosts.join(' ');
  if (nsStr.includes('cloudflare.com')) dnsProvider = 'Cloudflare';
  else if (nsStr.includes('awsdns')) dnsProvider = 'AWS Route53';
  else if (nsStr.includes('vercel-dns')) dnsProvider = 'Vercel';
  else if (nsStr.includes('googledomains')) dnsProvider = 'Google Domains';
  else if (nsStr.includes('namecheap')) dnsProvider = 'Namecheap';
  else if (nsStr.includes('domaincontrol.com')) dnsProvider = 'GoDaddy';
  else if (nsStr.includes('digitalocean.com')) dnsProvider = 'DigitalOcean';

  const cnames = [
    ...(dataCNAME.Answer || []).map(a => a.data.toLowerCase()),
    ...(dataWwwCNAME.Answer || []).map(a => a.data.toLowerCase())
  ];
  
  const cnameStr = cnames.join(' ');
  const ipStr = ipv4.map(i => i.ip).join(' ');

  if (cnameStr.includes('github.io') || ipStr.includes('185.199.108')) hosting = 'GitHub Pages';
  else if (cnameStr.includes('vercel-dns') || ipStr.includes('76.76.21.21')) hosting = 'Vercel';
  else if (cnameStr.includes('myshopify.com') || ipStr.includes('23.227.38')) hosting = 'Shopify';
  else if (cnameStr.includes('netlify.app')) hosting = 'Netlify';
  else if (cnameStr.includes('herokudns.com') || cnameStr.includes('herokuapp.com')) hosting = 'Heroku';
  else if (cnameStr.includes('amazonaws.com') || cnameStr.includes('cloudfront.net')) hosting = 'AWS';
  else if (cnameStr.includes('fastly.net')) hosting = 'Fastly';
  else if (dnsProvider === 'Cloudflare' && !hosting) hosting = 'Cloudflare (Proxy)';

  /* Scoring: 100 total */
  let score = 0;
  const breakdown = [];

  if (ipv6.length > 0) { score += 40; breakdown.push({ text: 'Root domain has AAAA record', points: '+40', color: 'green' }); }
  else { breakdown.push({ text: 'Root domain missing AAAA record', points: '0', color: 'red' }); }

  if (ipv4.length > 0 && ipv6.length > 0) {
    score += 10;
    breakdown.push({ text: 'Dual-stack configuration', points: '+10', color: 'green' });
  } else if (ipv4.length > 0) {
    breakdown.push({ text: 'IPv4 only (No dual-stack bonus)', points: '0', color: 'red' });
  } else if (ipv6.length > 0) {
    score += 10;
    breakdown.push({ text: 'IPv6-only: Modern but may drop legacy traffic', points: '+10', color: 'amber' });
  }

  if (ipv6.length >= 2) { score += 5; breakdown.push({ text: 'IPv6 redundancy (2+ IPs)', points: '+5', color: 'green' }); }

  if (mxHosts.length === 0) { score += 20; breakdown.push({ text: 'No MX servers (skipping)', points: '+20', color: 'gray' }); }
  else if (mxHasIPv6) { score += 20; breakdown.push({ text: 'Mail server (MX) has IPv6', points: '+20', color: 'green' }); }
  else { breakdown.push({ text: 'Mail server (MX) missing IPv6', points: '0', color: 'red' }); }

  if (nsHosts.length === 0) { score += 15; breakdown.push({ text: 'No NS servers (skipping)', points: '+15', color: 'gray' }); }
  else if (nsHasIPv6) { score += 15; breakdown.push({ text: 'Name server (NS) has IPv6', points: '+15', color: 'green' }); }
  else { breakdown.push({ text: 'Name server (NS) missing IPv6', points: '0', color: 'red' }); }

  if (mxHosts.length > 0 && mxResults.every(m => m.hasIPv6)) { score += 5; breakdown.push({ text: 'All MX servers have IPv6', points: '+5', color: 'green' }); }
  else if (mxHosts.length === 0) { score += 5; }

  if (nsHosts.length > 0 && nsResults.every(n => n.hasIPv6)) { score += 5; breakdown.push({ text: 'All NS servers have IPv6', points: '+5', color: 'green' }); }
  else if (nsHosts.length === 0) { score += 5; }

  return {
    domain: target,
    ipv6, ipv4,
    mx: mxResults,
    ns: nsResults,
    latencyMs,
    score: Math.min(score, 100),
    breakdown,
    hasIPv6: ipv6.length > 0,
    hasIPv4: ipv4.length > 0,
    mxHasIPv6,
    nsHasIPv6,
    hasMX: mxHosts.length > 0,
    hasNS: nsHosts.length > 0,
    hasDNSSEC,
    hasSPF,
    hasDMARC,
    hosting,
    dnsProvider,
    error: null,
  };
}

/* ── WHOIS via RDAP / Fallbacks (async, non-blocking) ── */
export async function fetchWhois(domain) {
    // Attempt 1: who-dat (CORS friendly, nice JSON)
    try {
      const res = await fetch(`https://who-dat.as93.net/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.domain) {
          return {
            registrar: data.registrar?.name || null,
            created: data.dates?.created || null,
            expires: data.dates?.expires || null,
            updated: data.dates?.updated || null,
            nameservers: (data.nameservers || []).map(ns => ns.name),
            status: data.status || []
          };
        }
      }
    } catch { /* ignore */ }

    // Attempt 2: NetworkCalc
    try {
      const res = await fetch(`https://networkcalc.com/api/dns/whois/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.whois) {
          const w = data.whois;
          return {
            registrar: w.registrar || null,
            created: w.registry_created_date || w.created_date || null,
            expires: w.registry_expiration_date || w.expiration_date || null,
            updated: w.registry_updated_date || w.updated_date || null,
            nameservers: [],
            status: []
          };
        }
      }
    } catch { /* ignore */ }

    // Attempt 3: RDAP (might fail due to CORS on redirect)
    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        const events = data.events || [];
        const find = (action) => events.find(e => e.eventAction === action)?.eventDate || null;
        let registrar = null;
        for (const ent of data.entities || []) {
          if (ent.roles?.includes('registrar')) {
            const vcard = ent.vcardArray?.[1];
            if (vcard) {
              const fn = vcard.find(v => v[0] === 'fn');
              if (fn) registrar = fn[3];
            }
            break;
          }
        }
        return {
          registrar,
          created: find('registration'),
          expires: find('expiration'),
          updated: find('last changed'),
          nameservers: (data.nameservers || []).map(ns => ns.ldhName?.toLowerCase()).filter(Boolean),
          status: data.status || [],
        };
      }
    } catch { /* ignore */ }

    return null;
}

export function getConclusion(r) {
  if (r.error) return `Error: ${r.error}`;
  if (r.score >= 100) return 'Perfectly configured for IPv6 across all services.';
  if (r.score >= 80) return 'Excellent IPv6 readiness, with minor non-critical gaps.';
  if (!r.hasIPv6) return 'Completely unreachable via IPv6; immediate action required.';
  if (r.hasIPv6 && !r.hasIPv4) return 'IPv6-only configuration (may be inaccessible to older IPv4 clients).';
  if (!r.mxHasIPv6 && r.hasMX) return 'Web server is IPv6 ready, but mail servers are IPv4 only.';
  if (!r.nsHasIPv6 && r.hasNS) return 'Web server is IPv6 ready, but name servers are IPv4 only.';
  return 'Partial IPv6 support; further configuration needed.';
}

