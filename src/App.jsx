import { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './index.css';
import './App.css';

/* ── Inline SVG Icons ── */
const Icon = {
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="0"/><path d="M4 16V4h12"/>
    </svg>
  ),
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    </svg>
  ),
  share: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
};

/* ────────────────────────────
   Helpers
   ──────────────────────────── */
function cleanDomain(input) {
  let s = input.trim();
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  s = s.split(/[/:?#]/)[0];
  s = s.replace(/\.$/, '');
  return s.toLowerCase();
}

function isValidDomain(d) {
  return d && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d);
}

async function dohQuery(name, type) {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { cache: 'no-store' });
  return res.json();
}

/* Check if a hostname has AAAA records */
async function hasAAAA(hostname) {
  try {
    const data = await dohQuery(hostname, 'AAAA');
    const addrs = (data.Answer || []).filter(a => a.type === 28).map(a => a.data);
    return { hostname, ipv6: addrs, hasIPv6: addrs.length > 0 };
  } catch {
    return { hostname, ipv6: [], hasIPv6: false };
  }
}

/* ── Full domain lookup ── */
async function lookupDomain(target) {
  const t0 = performance.now();

  /* Phase 1: A, AAAA, MX, NS, DNSKEY, TXT (root), TXT (_dmarc) in parallel */
  const [dataAAAA, dataA, dataMX, dataNS, dataDNSKEY, dataTXT, dataDMARC] = await Promise.all([
    dohQuery(target, 'AAAA'),
    dohQuery(target, 'A'),
    dohQuery(target, 'MX'),
    dohQuery(target, 'NS'),
    dohQuery(target, 'DNSKEY'),
    dohQuery(target, 'TXT'),
    dohQuery(`_dmarc.${target}`, 'TXT'),
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

  /* Scoring: 100 total */
  let score = 0;
  const breakdown = [];

  if (ipv6.length > 0) { score += 40; breakdown.push({ text: 'Root domain has AAAA record', points: '+40', color: 'green' }); }
  else { breakdown.push({ text: 'Root domain missing AAAA record', points: '0', color: 'red' }); }

  if (ipv4.length > 0 && ipv6.length > 0) { score += 10; breakdown.push({ text: 'Dual-stack configuration', points: '+10', color: 'green' }); }
  else if (ipv4.length > 0) { breakdown.push({ text: 'IPv4 only (No dual-stack bonus)', points: '0', color: 'red' }); }

  if (ipv6.length >= 2) { score += 5; breakdown.push({ text: 'IPv6 redundancy (≥2 IPs)', points: '+5', color: 'green' }); }

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
    error: null,
  };
}

/* ── WHOIS via RDAP (async, non-blocking) ── */
async function fetchWhois(domain) {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!res.ok) return null;
    const data = await res.json();

    const events = data.events || [];
    const find = (action) => events.find(e => e.eventAction === action)?.eventDate || null;

    /* Registrar name from entities */
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

    /* Nameservers from RDAP */
    const nameservers = (data.nameservers || []).map(ns => ns.ldhName?.toLowerCase()).filter(Boolean);

    return {
      registrar,
      created: find('registration'),
      expires: find('expiration'),
      updated: find('last changed'),
      nameservers,
      status: data.status || [],
    };
  } catch {
    return null;
  }
}

function getConclusion(r) {
  if (r.error) return `Error: ${r.error}`;
  if (r.score >= 100) return 'Perfectly configured for IPv6 across all services.';
  if (r.score >= 80) return 'Excellent IPv6 readiness, with minor non-critical gaps.';
  if (!r.hasIPv6) return 'Completely unreachable via IPv6; immediate action required.';
  if (r.hasIPv6 && !r.hasIPv4) return 'IPv6-only configuration (may be inaccessible to older IPv4 clients).';
  if (!r.mxHasIPv6 && r.hasMX) return 'Web server is IPv6 ready, but mail servers are IPv4 only.';
  if (!r.nsHasIPv6 && r.hasNS) return 'Web server is IPv6 ready, but name servers are IPv4 only.';
  return 'Partial IPv6 support; further configuration needed.';
}

/* ── CSV, JSON, PDF ── */
function generateCSV(results) {
  const header = 'Domain,Score,Verdict,Conclusion,IPv6,IPv4,Dual Stack,MX IPv6,NS IPv6,DNSSEC,SPF,DMARC,Latency (ms),IPv6 Addresses,IPv4 Addresses,MX Hosts,NS Hosts,Error';
  const rows = results.map(r => {
    if (r.error) return `${r.domain},,,,,,,,,,,,,,,,,"${r.error}"`;
    const verdict = r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready';
    const conclusion = getConclusion(r);
    return [
      r.domain, r.score, verdict, `"${conclusion}"`,
      r.hasIPv6 ? 'Yes' : 'No',
      r.hasIPv4 ? 'Yes' : 'No',
      r.hasIPv4 && r.hasIPv6 ? 'Yes' : 'No',
      !r.hasMX ? 'N/A' : r.mxHasIPv6 ? 'Yes' : 'No',
      !r.hasNS ? 'N/A' : r.nsHasIPv6 ? 'Yes' : 'No',
      r.hasDNSSEC ? 'Yes' : 'No',
      r.hasSPF ? 'Yes' : 'No',
      r.hasDMARC ? 'Yes' : 'No',
      r.latencyMs,
      `"${r.ipv6.map(a => a.ip).join('; ')}"`,
      `"${r.ipv4.map(a => a.ip).join('; ')}"`,
      `"${r.mx.map(m => m.hostname).join('; ')}"`,
      `"${r.ns.map(n => n.hostname).join('; ')}"`,
      '',
    ].join(',');
  });
  return header + '\n' + rows.join('\n');
}

function generateJSON(results) {
  const mapped = results.map(r => {
    if (r.error) return { domain: r.domain, error: r.error };
    return {
      domain: r.domain,
      score: r.score,
      verdict: r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready',
      conclusion: getConclusion(r),
      hasIPv6: r.hasIPv6,
      hasIPv4: r.hasIPv4,
      dualStack: !!(r.hasIPv4 && r.hasIPv6),
      mxIPv6: !r.hasMX ? 'N/A' : r.mxHasIPv6,
      nsIPv6: !r.hasNS ? 'N/A' : r.nsHasIPv6,
      hasDNSSEC: r.hasDNSSEC,
      hasSPF: r.hasSPF,
      hasDMARC: r.hasDMARC,
      latencyMs: r.latencyMs,
      ipv6Addresses: r.ipv6,
      ipv4Addresses: r.ipv4,
      mxServers: r.mx,
      nsServers: r.ns
    };
  });
  return JSON.stringify(mapped, null, 2);
}

function generatePDF(results) {
  const doc = new jsPDF();
  doc.text("IPv6 Checker Bulk Results", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

  const head = [['Domain', 'Score', 'Verdict', 'IPv6', 'IPv4', 'Conclusion']];
  const body = results.map(r => {
    if (r.error) return [r.domain, '-', '-', '-', '-', `Error: ${r.error}`];
    return [
      r.domain,
      r.score.toString(),
      r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready',
      r.hasIPv6 ? 'Yes' : 'No',
      r.hasIPv4 ? 'Yes' : 'No',
      getConclusion(r)
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    headStyles: { fillColor: [219, 39, 119] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 35 },
      5: { cellWidth: 'auto' }
    }
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text("Detailed Domain Summaries", 14, 15);
  let currentY = 25;

  results.filter(r => !r.error).forEach((r) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.text(`${r.domain} — Score: ${r.score}%`, 14, currentY);
    currentY += 6;

    const srvBody = [];
    srvBody.push(['IPv6 (AAAA)', r.hasIPv6 ? `${r.ipv6.length} records` : 'Missing', '']);
    srvBody.push(['IPv4 (A)', r.hasIPv4 ? `${r.ipv4.length} records` : 'Missing', '']);
    srvBody.push(['MX Servers', r.hasMX ? `${r.mx.length} configured` : 'None', r.hasMX ? (r.mxHasIPv6 ? 'IPv6 Supported' : 'IPv4 Only') : '-']);
    srvBody.push(['NS Servers', r.hasNS ? `${r.ns.length} found` : 'None', r.hasNS ? (r.nsHasIPv6 ? 'IPv6 Supported' : 'IPv4 Only') : '-']);
    srvBody.push(['Security', 'DNSSEC / SPF / DMARC', `${r.hasDNSSEC ? 'Y' : 'N'} / ${r.hasSPF ? 'Y' : 'N'} / ${r.hasDMARC ? 'Y' : 'N'}`]);

    autoTable(doc, {
      startY: currentY,
      head: [['Resource', 'Details', 'Support / Config']],
      body: srvBody,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 }
    });
    
    currentY = doc.lastAutoTable.finalY + 12;
  });

  return doc;
}

function generateSinglePDF(r) {
  const doc = new jsPDF();
  doc.text(`IPv6 Readiness Report: ${r.domain}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

  doc.setFontSize(14);
  doc.text(`Score: ${r.score}% (${r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready'})`, 14, 35);
  doc.setFontSize(11);
  
  const conclusion = getConclusion(r);
  doc.text(`Conclusion: ${conclusion}`, 14, 45, { maxWidth: 180 });

  autoTable(doc, {
    startY: 55,
    head: [['Configuration', 'Status']],
    body: [
      ['IPv6 (AAAA) Records', r.hasIPv6 ? `${r.ipv6.length} found` : 'Missing'],
      ['IPv4 (A) Records', r.hasIPv4 ? `${r.ipv4.length} found` : 'Missing'],
      ['Dual-stack', (r.hasIPv4 && r.hasIPv6) ? 'Yes' : 'No'],
      ['Mail Servers (MX)', !r.hasMX ? 'None configured' : r.mxHasIPv6 ? 'IPv6 Ready' : 'IPv4 Only'],
      ['Name Servers (NS)', !r.hasNS ? 'None found' : r.nsHasIPv6 ? 'IPv6 Ready' : 'IPv4 Only'],
      ['DNSSEC', r.hasDNSSEC ? 'Enabled' : 'Missing'],
      ['SPF', r.hasSPF ? 'Enabled' : 'Missing'],
      ['DMARC', r.hasDMARC ? 'Enabled' : 'Missing']
    ],
    headStyles: { fillColor: [219, 39, 119] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Score Breakdown', 'Points Awarded']],
    body: r.breakdown.map(b => [b.text, b.points]),
    headStyles: { fillColor: [79, 70, 229] },
  });

  const ipBody = [];
  r.ipv6.forEach(rec => ipBody.push(['AAAA (IPv6)', rec.ip, `${rec.ttl}s`]));
  r.ipv4.forEach(rec => ipBody.push(['A (IPv4)', rec.ip, `${rec.ttl}s`]));
  if (ipBody.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['DNS Record Type', 'IP Address', 'TTL']],
      body: ipBody,
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  const srvBody = [];
  r.mx.forEach(m => srvBody.push(['MX', m.hostname, m.priority, m.hasIPv6 ? 'IPv6 Supported' : 'IPv4 Only']));
  r.ns.forEach(n => srvBody.push(['NS', n.hostname, '-', n.hasIPv6 ? 'IPv6 Supported' : 'IPv4 Only']));
  if (srvBody.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Server Type', 'Hostname', 'Priority', 'Support']],
      body: srvBody,
      headStyles: { fillColor: [217, 119, 6] },
    });
  }

  return doc;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── History ── */
const HISTORY_KEY = 'ipv6checker_history';
const MAX_HISTORY = 50;
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } }
function saveToHistory(entry) {
  const history = loadHistory().filter(h => entry.isBulk ? h.filename !== entry.filename : h.domain !== entry.domain);
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}
function clearHistoryStore() { localStorage.removeItem(HISTORY_KEY); }

/* ── Theme ── */
const THEME_KEY = 'ipv6checker_theme';
function getInitialTheme() { try { const s = localStorage.getItem(THEME_KEY); if (s === 'light' || s === 'dark') return s; } catch { /* ignore */ } return 'dark'; }

/* ── Time ago ── */
function formatAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return iso; }
}

/* ────────────────────────────
   Small components
   ──────────────────────────── */
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const click = async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* ignore */ } };
  return <button className="copy-btn" onClick={click} title="Copy">{ok ? Icon.check : Icon.copy}</button>;
}

function ScoreBar({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
  const bg = score >= 80 ? 'var(--green-dim)' : score >= 40 ? 'var(--amber-dim)' : 'var(--red-dim)';
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-header">
        <span className="score-bar-label">Readiness</span>
        <span className="score-bar-value" style={{ color }}>{score}%</span>
      </div>
      <div className="score-bar-track" style={{ background: bg }}>
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function CheckRow({ ok, label, na }) {
  if (na) return (
    <div className="check-row na">
      <span className="check-icon">—</span>
      <span>{label}</span>
    </div>
  );
  return (
    <div className={`check-row ${ok ? 'pass' : 'fail'}`}>
      <span className="check-icon">{ok ? Icon.check : Icon.x}</span>
      <span>{label}</span>
    </div>
  );
}

/* ── Server IPv6 sub-row (for MX/NS) ── */
function ServerList({ title, items, badge }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="record-group">
      <div className="record-label"><span className={`tag ${badge}`}>{title}</span>{items.length} server{items.length !== 1 && 's'}</div>
      {items.map((s, i) => (
        <div className={`record server-row ${s.hasIPv6 ? 'srv-pass' : 'srv-fail'}`} key={i}>
          <code>{s.hostname}{s.priority !== undefined ? ` (priority ${s.priority})` : ''}</code>
          <span className={`srv-badge ${s.hasIPv6 ? 'srv-yes' : 'srv-no'}`}>{s.hasIPv6 ? 'IPv6 ✓' : 'IPv4 only'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── IP Record with ASN Lookup ── */
function IpRecord({ rec }) {
  const [asn, setAsn] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`https://api.techniknews.net/ipgeo/${rec.ip}`)
      .then(r => r.json())
      .then(d => {
        if (active && d.status === 'success') {
          // e.g. "AS15169 Google LLC"
          setAsn(d.as || d.isp || 'Unknown ASN');
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [rec.ip]);

  return (
    <div className="record">
      <code>{rec.ip}</code>
      <div className="record-right">
        {asn && <span className="record-asn" title={asn}>{asn}</span>}
        <span className="record-ttl">TTL {rec.ttl}s</span>
        <CopyBtn text={rec.ip} />
      </div>
    </div>
  );
}

/* ── Client Connection Test ── */
function ClientConnectionTest() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'v6' | 'v4'
  const [ip, setIp] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    fetch('https://ipv6.icanhazip.com', { signal: controller.signal, cache: 'no-store' })
      .then(res => res.text())
      .then(text => {
        clearTimeout(timeoutId);
        setIp(text.trim());
        setStatus('v6');
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setStatus('v4');
      });

    return () => clearTimeout(timeoutId);
  }, []);

  if (status === 'checking') {
    return <div className="client-test checking"><span className="client-test-dot" />Checking your network...</div>;
  }
  if (status === 'v6') {
    return <div className="client-test v6-ready" title={`Your IPv6: ${ip}`}>You have IPv6 {Icon.check}</div>;
  }
  return <div className="client-test v4-only" title="Your internet service provider or router does not currently support IPv6.">You are on IPv4</div>;
}

/* ── Domain Screenshot ── */
function DomainScreenshot({ domain }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    fetch(`https://api.microlink.io?url=https://${domain}&screenshot=true&meta=false`)
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data.status === 'success' && data.data?.screenshot?.url) {
          setImgSrc(data.data.screenshot.url);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
      
    return () => { active = false; };
  }, [domain]);

  if (error) return null;

  return (
    <div className="domain-screenshot-wrap">
      {loading && <div className="screenshot-skeleton" />}
      {imgSrc && (
        <img
          src={imgSrc}
          className={`domain-screenshot ${loading ? 'loading' : ''}`}
          alt={`Screenshot of ${domain}`}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════
   App
   ════════════════════════════ */
function App() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [whois, setWhois] = useState(null);
  const [whoisLoading, setWhoisLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  const [history, setHistory] = useState(loadHistory);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem(THEME_KEY, theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (result && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [result]);

  /* ── Core check ── */
  const runCheck = useCallback(async (target) => {
    setLoading(true);
    setError('');
    setResult(null);
    setWhois(null);

    try {
      const r = await lookupDomain(target);
      if (r.error === 'NXDOMAIN') { setError(`Domain "${target}" does not exist.`); }
      else if (r.error === 'SERVFAIL') { setError(`DNS server failed to resolve "${target}". Try again later.`); }
      else {
        setResult(r);
        setHistory(saveToHistory({ domain: r.domain, score: r.score, hasIPv6: r.hasIPv6, timestamp: Date.now() }));
        /* Fetch WHOIS in background */
        setWhoisLoading(true);
        fetchWhois(target).then(w => { setWhois(w); setWhoisLoading(false); });

      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ?d= param */
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('d');
    if (d) {
      const t = cleanDomain(d);
      if (isValidDomain(t)) {
        setTimeout(() => {
          setDomain(t);
          runCheck(t);
        }, 100);
      }
    }
  }, [runCheck]);

  const handleCheck = async (e) => {
    e.preventDefault();
    const raw = domain.trim();
    if (!raw) return;
    const target = cleanDomain(raw);
    if (!isValidDomain(target)) { setError('Invalid domain. Try something like google.com'); return; }
    const url = new URL(window.location); url.searchParams.set('d', target); window.history.pushState({}, '', url);
    await runCheck(target);
  };

  const handleHistoryClick = (d) => {
    setDomain(d);
    const url = new URL(window.location); url.searchParams.set('d', d); window.history.pushState({}, '', url);
    runCheck(d);
  };

  const handleClearHistory = () => { clearHistoryStore(); setHistory([]); };

  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 1500); } catch { /* ignore */ }
  };

  /* ── Bulk ── */
  const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (!f) return; setBulkFile(f); setBulkDone(false); setBulkResults(null); setBulkProgress({ done: 0, total: 0 }); };
  const clearFile = () => { setBulkFile(null); setBulkDone(false); setBulkResults(null); setBulkProgress({ done: 0, total: 0 }); if (fileRef.current) fileRef.current.value = ''; };

  const handleBulkCheck = async () => {
    if (!bulkFile) return;
    setBulkLoading(true); setBulkDone(false); setBulkResults(null); setResult(null); setWhois(null); setError('');
    try {
      const text = await bulkFile.text();
      const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      const domains = [...new Set(lines.map(cleanDomain).filter(isValidDomain))];
      if (domains.length === 0) { setError('No valid domains found in the file.'); setBulkLoading(false); return; }
      if (domains.length === 1) { setBulkLoading(false); setDomain(domains[0]); await runCheck(domains[0]); clearFile(); return; }
      setBulkProgress({ done: 0, total: domains.length });
      const BATCH = 3; // smaller batch since we now do more queries per domain
      const results = [];
      for (let i = 0; i < domains.length; i += BATCH) {
        const batch = domains.slice(i, i + BATCH);
        const batchResults = await Promise.all(batch.map(d => lookupDomain(d).catch(() => ({ domain: d, error: 'Network error' }))));
        results.push(...batchResults);
        setBulkProgress({ done: results.length, total: domains.length });
      }
      setBulkResults(results);
      setBulkDone(true);
      setHistory(saveToHistory({ isBulk: true, filename: bulkFile.name, domain: `${domains.length} domains`, score: null, timestamp: Date.now() }));
    } catch { setError('Failed to read the file.'); } finally { setBulkLoading(false); }
  };

  const handleDownloadCSV = () => { if (!bulkResults) return; downloadFile(generateCSV(bulkResults), `ipv6checker-results-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv'); };
  const handleDownloadJSON = () => { if (!bulkResults) return; downloadFile(generateJSON(bulkResults), `ipv6checker-results-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); };
  const handleDownloadPDF = () => { if (!bulkResults) return; generatePDF(bulkResults).save(`ipv6checker-results-${new Date().toISOString().slice(0, 10)}.pdf`); };

  const handleExportSinglePDF = () => {
    if (!result) return;
    generateSinglePDF(result).save(`${result.domain}-ipv6-report.pdf`);
  };

  const verdict = result
    ? result.score >= 80 ? { text: 'Ready', cls: 'v-green' }
    : result.score >= 40 ? { text: 'Partial', cls: 'v-amber' }
    : { text: 'Not Ready', cls: 'v-red' }
    : null;

  return (
    <div className="app">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="logo"><span className="logo-mark">v6</span><span className="logo-text">ipv6checker</span></a>
          <div className="nav-right">
            <ClientConnectionTest />
            <div className="nav-divider" />
            <kbd className="kbd-hint">{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'}K</kbd>
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? Icon.sun : Icon.moon}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-inner">
          <h1>Check IPv6 readiness<span className="dot">.</span></h1>
          <p className="hero-sub">Enter a domain or upload a file with multiple domains.</p>

          <form onSubmit={handleCheck} className="search" id="search-form">
            <div className="search-field">
              <span className="search-icon">{Icon.search}</span>
              <input ref={inputRef} id="domain-input" type="text" placeholder="google.com" value={domain}
                onChange={e => setDomain(e.target.value)} disabled={loading || bulkLoading} autoComplete="off" spellCheck="false" />
            </div>
            <button type="submit" id="check-btn" className="btn-primary" disabled={loading || bulkLoading || !domain.trim()}>
              {loading ? <span className="spinner" /> : <>Check {Icon.arrow}</>}
            </button>
          </form>

          <div className="or-divider"><span>or</span></div>

          <div className="bulk-area">
            <div className="bulk-row">
              <input ref={fileRef} type="file" id="file-input" accept=".txt,.csv,.tsv,.text" onChange={handleFileSelect} className="file-input-hidden" disabled={bulkLoading} />
              <label htmlFor="file-input" className={`btn-file ${bulkLoading ? 'disabled' : ''}`}>{Icon.upload} Choose file</label>
              {bulkFile && (<div className="file-info"><span className="file-name">{Icon.file} {bulkFile.name}</span>{!bulkLoading && <button className="btn-clear" onClick={clearFile}>{Icon.x}</button>}</div>)}
              {bulkFile && !bulkDone && (<button className="btn-primary btn-run" onClick={handleBulkCheck} disabled={bulkLoading}>{bulkLoading ? <span className="spinner" /> : <>Run {Icon.arrow}</>}</button>)}
            </div>
            <div className="bulk-instructions">
              <p className="bulk-instructions-title">Upload instructions</p>
              <ul>
                <li>Upload a <strong>.txt</strong> or <strong>.csv</strong> file with one domain per line.</li>
                <li>URLs are accepted — protocols, paths, and ports are stripped automatically.</li>
                <li>Lines starting with <code>#</code> are treated as comments and ignored.</li>
                <li>Duplicate domains are removed before processing.</li>
                <li>Results can be exported as <strong>CSV, JSON, or PDF</strong> with full scoring and conclusions.</li>
              </ul>
              <div className="bulk-example">
                <span className="bulk-example-label">Example file</span>
                <pre>google.com{'\n'}https://github.com/about{'\n'}example.org{'\n'}# this is a comment</pre>
              </div>
            </div>
            {bulkLoading && (<div className="bulk-progress"><div className="progress-track"><div className="progress-fill" style={{ width: bulkProgress.total ? `${(bulkProgress.done / bulkProgress.total) * 100}%` : '0%' }} /></div><span className="progress-text">{bulkProgress.done} / {bulkProgress.total} domains</span></div>)}
            {bulkDone && bulkResults && (
              <div className="bulk-done">
                <p className="bulk-done-text">{Icon.check} Processed {bulkProgress.total} domains.</p>
                <div className="download-buttons">
                  <button className="btn-download" onClick={handleDownloadCSV}>{Icon.download} CSV</button>
                  <button className="btn-download" onClick={handleDownloadJSON}>{Icon.download} JSON</button>
                  <button className="btn-download" onClick={handleDownloadPDF}>{Icon.download} PDF</button>
                </div>
              </div>
            )}
          </div>

          {error && (<div className="alert" role="alert"><span className="alert-icon">{Icon.warn}</span><p>{error}</p></div>)}
        </div>
      </header>

      {/* ── Result Card ── */}
      {result && (
        <section className="result" ref={resultRef}>
          <div className="result-card">
            <div className={`result-stripe ${verdict.cls}`} />

            <DomainScreenshot key={result.domain} domain={result.domain} />

            {/* Head: verdict + score + share + latency */}
            <div className="result-head">
              <div>
                <p className={`verdict ${verdict.cls}`}>{verdict.text}</p>
                <div className="result-domain-wrap">
                  <img src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=64`} alt="" className="domain-favicon" />
                  <p className="result-domain">{result.domain}</p>
                </div>
              </div>
              <div className="result-head-right">
                <ScoreBar score={result.score} />
                <div className="result-head-actions">
                  <span className="latency-badge">{Icon.clock} {result.latencyMs}ms</span>
                  <button className="btn-share" onClick={handleExportSinglePDF}>
                    {Icon.download} Export
                  </button>
                  <button className="btn-share" onClick={handleShare}>
                    {shareCopied ? <>{Icon.check} Copied</> : <>{Icon.share} Share</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Checklist */}
            <div className="checks">
              <CheckRow ok={result.hasIPv6} label="AAAA records (IPv6)" />
              <CheckRow ok={result.hasIPv4} label="A records (IPv4)" />
              <CheckRow ok={result.hasIPv4 && result.hasIPv6} label="Dual-stack" />
              <CheckRow ok={result.ipv6.length >= 2} label="IPv6 redundancy" />
              <CheckRow ok={result.mxHasIPv6} label="MX servers have IPv6" na={!result.hasMX} />
              <CheckRow ok={result.nsHasIPv6} label="NS servers have IPv6" na={!result.hasNS} />
            </div>

            <div className="breakdown-section">
              {result.breakdown.map((b, i) => (
                <div key={i} className="breakdown-item">
                  <span className={`breakdown-points points-${b.color}`}>{b.points}</span>
                  <span className="breakdown-text">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Security Checks */}
            <div className="security-section">
              <p className="section-title">Security & Protection</p>
              <div className="security-grid">
                <div className="security-card">
                  <span className="security-label">DNSSEC</span>
                  <span className={`security-badge ${result.hasDNSSEC ? 'sec-pass' : 'sec-fail'}`}>
                    {result.hasDNSSEC ? 'Enabled ✓' : 'Not Configured'}
                  </span>
                  <p className="security-desc">Protects against DNS spoofing.</p>
                </div>
                <div className="security-card">
                  <span className="security-label">SPF Record</span>
                  <span className={`security-badge ${result.hasSPF ? 'sec-pass' : 'sec-fail'}`}>
                    {result.hasSPF ? 'Enabled ✓' : 'Not Configured'}
                  </span>
                  <p className="security-desc">Prevents email sender spoofing.</p>
                </div>
                <div className="security-card">
                  <span className="security-label">DMARC Record</span>
                  <span className={`security-badge ${result.hasDMARC ? 'sec-pass' : 'sec-fail'}`}>
                    {result.hasDMARC ? 'Enabled ✓' : 'Not Configured'}
                  </span>
                  <p className="security-desc">Enforces email authentication.</p>
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* DNS Records */}
            <div className="records">
              {result.ipv6.length > 0 && (
                <div className="record-group">
                  <div className="record-label"><span className="tag tag-v6">AAAA</span>{result.ipv6.length} record{result.ipv6.length !== 1 && 's'}</div>
                  {result.ipv6.map((rec, i) => <IpRecord key={i} rec={rec} />)}
                </div>
              )}
              {result.ipv4.length > 0 && (
                <div className="record-group">
                  <div className="record-label"><span className="tag tag-v4">A</span>{result.ipv4.length} record{result.ipv4.length !== 1 && 's'}</div>
                  {result.ipv4.map((rec, i) => <IpRecord key={i} rec={rec} />)}
                </div>
              )}

              {/* MX servers */}
              <ServerList title="MX" items={result.mx} badge="tag-mx" />

              {/* NS servers */}
              <ServerList title="NS" items={result.ns} badge="tag-ns" />

              {result.ipv6.length === 0 && result.ipv4.length === 0 && (<p className="no-records">No DNS records found for this domain.</p>)}
            </div>

            {/* Next Steps to 100% */}
            {result.score < 100 && (() => {
              const steps = [];
              if (!result.hasIPv6) {
                steps.push({
                  priority: 'Critical',
                  title: 'Add AAAA records to your root domain',
                  desc: 'This is the single biggest factor. Ask your hosting provider if they support IPv6, then add AAAA records in your DNS zone. Most major providers (Cloudflare, AWS, GCP, Vercel, Netlify) support this out of the box.',
                  points: 40,
                });
              }
              if (result.hasIPv4 && !result.hasIPv6) {
                steps.push({
                  priority: 'High',
                  title: 'Enable dual-stack (IPv4 + IPv6)',
                  desc: 'Keep your existing A records and add AAAA records alongside them. This ensures compatibility with both IPv4 and IPv6 clients during the transition period.',
                  points: 10,
                });
              }
              if (result.ipv6.length < 2) {
                steps.push({
                  priority: 'Low',
                  title: 'Add IPv6 redundancy',
                  desc: result.hasIPv6
                    ? 'You only have one AAAA record. Add at least one more IPv6 address for redundancy — this protects against single-server failures.'
                    : 'When adding AAAA records, configure at least two IPv6 addresses for redundancy and failover protection.',
                  points: 5,
                });
              }
              if (result.hasMX && !result.mxHasIPv6) {
                steps.push({
                  priority: 'High',
                  title: 'Enable IPv6 on your mail servers (MX)',
                  desc: 'Your MX records point to servers without AAAA records. Contact your email provider (e.g., Google Workspace, Microsoft 365, Zoho) to enable IPv6 delivery. Enabling it on all MX hosts earns a bonus.',
                  points: 25,
                });
              }
              if (result.hasMX && result.mxHasIPv6 && !result.mx.every(m => m.hasIPv6)) {
                steps.push({
                  priority: 'Medium',
                  title: 'Add IPv6 to all MX servers',
                  desc: 'Some of your mail servers still lack AAAA records. Ensure every MX host has IPv6 for full mail delivery coverage.',
                  points: 5,
                });
              }
              if (result.hasNS && !result.nsHasIPv6) {
                steps.push({
                  priority: 'High',
                  title: 'Enable IPv6 on your name servers (NS)',
                  desc: 'Your authoritative name servers don\'t have AAAA records. Switch to a DNS provider that supports IPv6 glue records (Cloudflare, Route 53, NS1, etc.). Enabling it on all NS hosts earns a bonus.',
                  points: 20,
                });
              }
              if (result.hasNS && result.nsHasIPv6 && !result.ns.every(n => n.hasIPv6)) {
                steps.push({
                  priority: 'Medium',
                  title: 'Add IPv6 to all name servers',
                  desc: 'Some NS hosts lack AAAA records. Ensure all authoritative name servers are reachable over IPv6.',
                  points: 5,
                });
              }

              steps.sort((a, b) => b.points - a.points);
              if (steps.length === 0) return null;

              const totalMissing = 100 - result.score;

              return (
                <>
                  <div className="divider" />
                  <div className="next-steps-section">
                    <p className="section-title">
                      Next Steps to 100%
                      <span className="next-steps-gap">+{totalMissing} points needed</span>
                    </p>
                    <div className="next-steps-list">
                      {steps.map((step, i) => (
                        <div key={i} className="next-step-item">
                          <div className="next-step-header">
                            <span className={`next-step-priority priority-${step.priority.toLowerCase()}`}>{step.priority}</span>
                            <span className="next-step-points">+{step.points} pts</span>
                          </div>
                          <p className="next-step-title">{step.title}</p>
                          <p className="next-step-desc">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* WHOIS */}
            <div className="divider" />
            <div className="whois-section">
              <p className="section-title">Domain Info (RDAP)</p>
              {whoisLoading && <p className="whois-loading">Loading registration data…</p>}
              {!whoisLoading && !whois && <p className="whois-na">Registration data unavailable for this domain.</p>}
              {whois && (
                <div className="whois-grid">
                  <div className="whois-item"><span className="whois-label">Registrar</span><span className="whois-value">{whois.registrar || '—'}</span></div>
                  <div className="whois-item"><span className="whois-label">Created</span><span className="whois-value">{formatDate(whois.created)}</span></div>
                  <div className="whois-item"><span className="whois-label">Expires</span><span className="whois-value">{formatDate(whois.expires)}</span></div>
                  <div className="whois-item"><span className="whois-label">Updated</span><span className="whois-value">{formatDate(whois.updated)}</span></div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="history-section">
          <div className="history-card">
            <div className="history-header">
              <span className="history-title">{Icon.clock} Recent lookups</span>
              <button className="btn-clear-history" onClick={handleClearHistory}>{Icon.trash} Clear</button>
            </div>
            <div className="history-list">
              {history.map((h, i) => {
                const isBulk = h.isBulk;
                const cls = isBulk ? 'v-gray' : h.score >= 80 ? 'v-green' : h.score >= 40 ? 'v-amber' : 'v-red';
                const label = isBulk ? 'Bulk Check' : h.score >= 80 ? 'Ready' : h.score >= 40 ? 'Partial' : 'Not Ready';
                return (
                  <button key={i} className={`history-item ${isBulk ? 'history-item-bulk' : ''}`} onClick={() => !isBulk && handleHistoryClick(h.domain)} style={isBulk ? { cursor: 'default' } : {}}>
                    <div className="history-domain-wrap">
                      {isBulk ? <span className="history-file-icon">{Icon.file}</span> : <img src={`https://www.google.com/s2/favicons?domain=${h.domain}&sz=64`} alt="" className="history-favicon" />}
                      <span className="history-domain">{isBulk ? h.filename : h.domain}</span>
                    </div>
                    <span className="history-meta">
                      <span className={`history-verdict ${cls}`}>{label}</span>
                      {isBulk ? <span className="history-score">{h.domain}</span> : <span className="history-score">{h.score}%</span>}
                      <span className="history-ago">{formatAgo(h.timestamp)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <p>Lookups via Google DNS-over-HTTPS &middot; WHOIS via RDAP &middot; Nothing stored on servers &middot; Client-side only</p>
      </footer>
    </div>
  );
}

export default App;
