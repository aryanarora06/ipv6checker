import { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';
import './App.css';
import { Icon } from './components/Icon';
import SubdomainScanner from './components/SubdomainScanner';
import { cleanDomain, isValidDomain, lookupDomain, fetchWhois } from './utils/dnsUtils';
import { generateCSV, generateJSON, generatePDF, generateSinglePDF, downloadFile } from './utils/exportUtils';


/* ────────────────────────────
   Helpers
   ──────────────────────────── */
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
        <span className="record-ttl" title="Remaining time in the DNS resolver's cache. This counts down automatically until the record is refreshed from the authoritative nameserver.">TTL {rec.ttl}s (cached)</span>
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
function DomainScreenshot({ url }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    
    fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false`)
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
  }, [url]);

  if (error) return null;

  return (
    <div className="domain-screenshot-wrap">
      {loading && <div className="screenshot-skeleton" />}
      {imgSrc && (
        <img
          src={imgSrc}
          className={`domain-screenshot ${loading ? 'loading' : ''}`}
          alt={`Screenshot of ${url}`}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

/* ── Server Reachability Test ── */
function ReachabilityTest({ domain, hasIPv6, onComplete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testReachability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reachability?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) throw new Error('API unavailable or error');
      const d = await res.json();
      setData(d);
      if (onComplete) onComplete(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [domain, onComplete]);

  useEffect(() => {
    if (hasIPv6) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      testReachability();
    }
  }, [hasIPv6, testReachability]);

  if (!hasIPv6) {
    return (
      <div className="reachability-section">
        <div className="reachability-header">
          <p className="section-title">Real Reachability Test</p>
        </div>
        <p className="reachability-desc">
          DNS checks only prove the records exist. This test makes an actual strict-IPv6 connection to your web server.
        </p>
        <p className="reachability-na">{Icon.warn} Reachability test disabled because no IPv6 (AAAA) records were found.</p>
      </div>
    );
  }

  return (
    <div className="reachability-section">
      <div className="reachability-header">
        <p className="section-title">Real Reachability Test</p>
      </div>
      <p className="reachability-desc">
        DNS checks only prove the records exist. This test makes an actual strict-IPv6 connection to your web server.
      </p>

      {loading && <p className="reachability-loading">Testing strictly over IPv6...</p>}
      {error && <p className="reachability-na">Reachability API unavailable. Are you running locally without Vercel?</p>}
      
      {data && (
        <div className="reachability-results">
          <div className={`reachability-card ${data.http.reachable ? 'pass' : 'fail'}`}>
            <div className="reachability-card-title">HTTP (Port 80)</div>
            <div className={`reachability-status ${data.http.reachable ? 'pass' : 'fail'}`}>
              {data.http.reachable ? <>{Icon.check} Reachable ({data.http.status})</> : <>{Icon.x} Unreachable</>}
            </div>
            {data.http.reachable && <div className="reachability-meta">{data.http.latencyMs}ms</div>}
            {!data.http.reachable && <div className="reachability-meta">{data.http.error || 'Connection failed'}</div>}
          </div>
          
          <div className={`reachability-card ${data.https.reachable ? 'pass' : 'fail'}`}>
            <div className="reachability-card-title">HTTPS (Port 443)</div>
            <div className={`reachability-status ${data.https.reachable ? 'pass' : 'fail'}`}>
              {data.https.reachable ? <>{Icon.check} Reachable ({data.https.status})</> : <>{Icon.x} Unreachable</>}
            </div>
            {data.https.reachable && <div className="reachability-meta">{data.https.latencyMs}ms</div>}
            {!data.https.reachable && <div className="reachability-meta">{data.https.error || 'Connection failed'}</div>}
          </div>
        </div>
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
  const [reachabilityData, setReachabilityData] = useState(null);
  const [subdomainData, setSubdomainData] = useState(null);

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
  const runCheck = useCallback(async (target, rawUrl = null) => {
    setLoading(true);
    setError('');
    setResult(null);
    setWhois(null);
    setReachabilityData(null);
    setSubdomainData(null);

    try {
      const r = await lookupDomain(target);
      if (r.error === 'NXDOMAIN') { setError(`Domain "${target}" does not exist.`); }
      else if (r.error === 'SERVFAIL') { setError(`DNS server failed to resolve "${target}". Try again later.`); }
      else {
        r.rawUrl = rawUrl || target;
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
          runCheck(t, d);
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
    await runCheck(target, raw);
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
        const batchResults = await Promise.all(batch.map(async d => {
          try {
            const res = await lookupDomain(d);
            if (res.hasIPv6) {
              try {
                const reachRes = await fetch(`/api/reachability?domain=${encodeURIComponent(d)}`);
                if (reachRes.ok) res.reachabilityData = await reachRes.json();
              } catch { /* ignore */ }
            }
            return res;
          } catch { return { domain: d, error: 'Network error' }; }
        }));
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
    const exportData = { ...result, reachabilityData, subdomainData };
    generateSinglePDF(exportData).save(`${result.domain}-ipv6-report.pdf`);
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

            <DomainScreenshot key={result.domain} url={result.rawUrl || result.domain} />

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
                let dynamicAdvice = 'Ask your hosting provider if they support IPv6, then add AAAA records in your DNS zone. Most major providers (Cloudflare, AWS, GCP, Vercel, Netlify) support this out of the box.';
                
                if (result.hosting === 'Vercel') dynamicAdvice = "We detected you are hosted on Vercel. Vercel supports IPv6 natively. Ensure you don't have an A record hardcoded to 76.76.21.21 without also having the AAAA record, or switch to a CNAME.";
                else if (result.hosting === 'GitHub Pages') dynamicAdvice = "We detected you are hosted on GitHub Pages. You just need to add the 4 GitHub IPv6 AAAA records (2606:50c0:8000::153, etc.) to your DNS provider.";
                else if (result.hosting === 'Cloudflare (Proxy)') dynamicAdvice = "We detected you are using Cloudflare. Your IPv6 is failing because Cloudflare's IPv6 routing toggle might be disabled in your Network dashboard. Turn it on!";
                else if (result.hosting === 'Shopify') dynamicAdvice = "We detected you are using Shopify. Shopify automatically provisions IPv6 for CNAME setups. Ensure your root domain uses an ALIAS or CNAME to shops.myshopify.com.";
                else if (result.hosting) dynamicAdvice = `We detected you are using ${result.hosting}. Check their documentation on how to enable IPv6. You usually need to toggle it in their dashboard or update your DNS records.`;
                else if (result.dnsProvider) dynamicAdvice = `We detected you are using ${result.dnsProvider} for DNS. You need to log into their dashboard and add an AAAA record pointing to your server's IPv6 address.`;

                steps.push({
                  priority: 'Critical',
                  title: 'Add AAAA records to your root domain',
                  desc: dynamicAdvice,
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

            {/* Reachability Test */}
            <div className="reachability-wrapper">
              <ReachabilityTest domain={result.domain} hasIPv6={result.hasIPv6} onComplete={setReachabilityData} />
            </div>

            {/* Subdomain Scanner */}
            <div className="divider" />
            <SubdomainScanner key={result.domain} domain={result.domain} onComplete={setSubdomainData} />

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
