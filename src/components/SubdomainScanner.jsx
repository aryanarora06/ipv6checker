import { useState, useCallback } from 'react';
import { Icon } from './Icon';
import { dohQuery } from '../utils/dnsUtils';

/* ── Subdomain Scanner ── */
const COMMON_SUBDOMAINS = [
  'web', 'site', 'home', 'landing', 'main', 'public', 'blog', 'news', 'press', 'forum', 'community', 'events', 'calendar', 'updates', 'smtp', 'imap', 'pop', 'pop3', 'webmail', 'email', 'mx', 'exchange', 'autodiscover', 'owa', 'postfix', 'mta', 'mailer', 'noreply', 'dns', 'resolver', 'pdns', 'auth-dns', 'staging', 'stage', 'stg', 'test', 'testing', 'qa', 'uat', 'sandbox', 'demo', 'beta', 'alpha', 'preview', 'canary', 'preprod', 'int', 'integration', 'perf', 'load', 'experiment', 'api', 'graphql', 'rest', 'gateway', 'gw', 'portal', 'dashboard', 'dash', 'admin', 'panel', 'console', 'manage', 'management', 'cms', 'backend', 'services', 'service', 'svc', 'microservice', 'rpc', 'grpc', 'ws', 'websocket', 'webhook', 'callback', 'mobile', 'msite', 'wap', 'touch', 'lite', 'pwa', 'amp', 'static', 'assets', 'media', 'images', 'img', 'files', 'downloads', 'download', 'upload', 'uploads', 'cache', 'origin', 'edge', 'content', 'res', 'resources', 'objects', 'sftp', 'ssh', 'vpn', 'openvpn', 'wireguard', 'ipsec', 'proxy', 'socks', 'relay', 'firewall', 'fw', 'waf', 'lb', 'nat', 'bastion', 'tunnel', 'ssl', 'tls', 'ntp', 'syslog', 'netflow', 'soc', 'csirt', 'cert', 'abuse', 'security', 'pentest', 'scan', 'scanner', 'vulnerability', 'bugbounty', 'phishing', 'fraud', 'antivirus', 'dlp', 'siem', 'ids', 'ips', 'srv', 'host', 'vps', 'vm', 'box', 'cluster', 'worker', 'master', 'database', 'mysql', 'postgres', 'pgsql', 'redis', 'mongo', 'mongodb', 'elastic', 'elasticsearch', 'search', 'solr', 'memcached', 'mariadb', 'mssql', 'sql', 'oracle', 'cassandra', 'couchdb', 'neo4j', 'influxdb', 'clickhouse', 'rds', 'monitoring', 'status', 'statuspage', 'health', 'healthcheck', 'grafana', 'kibana', 'logs', 'log', 'sentry', 'metrics', 'nagios', 'zabbix', 'prometheus', 'prom', 'alertmanager', 'uptime', 'newrelic', 'datadog', 'apm', 'splunk', 'graylog', 'observability', 'trace', 'tracing', 'aws', 'gcp', 'azure', 's3', 'storage', 'backup', 'archive', 'dr', 'paas', 'saas', 'oss', 'blob', 'bucket', 'vault', 'secrets', 'config', 'kubernetes', 'kube', 'docker', 'registry', 'harbor', 'rancher', 'swarm', 'nomad', 'openshift', 'podman', 'helm', 'argocd', 'istio', 'envoy', 'traefik', 'login', 'signin', 'signup', 'register', 'sso', 'oauth', 'oauth2', 'oidc', 'id', 'identity', 'accounts', 'account', 'myaccount', 'iam', 'ldap', 'ad', 'kerberos', 'cas', 'keycloak', 'okta', 'saml', 'mfa', 'otp', 'token', 'session', 'gitlab', 'github', 'bitbucket', 'gitea', 'gogs', 'ci', 'cd', 'jenkins', 'bamboo', 'travis', 'circleci', 'drone', 'build', 'deploy', 'release', 'artifact', 'nexus', 'sonar', 'terraform', 'ansible', 'puppet', 'chef', 'spinnaker', 'flux', 'doc', 'documentation', 'wiki', 'help', 'support', 'kb', 'faq', 'manual', 'guide', 'learn', 'training', 'tutorial', 'academy', 'education', 'courses', 'howto', 'reference', 'developer', 'slack', 'teams', 'meet', 'meeting', 'zoom', 'video', 'conference', 'voip', 'sip', 'pbx', 'call', 'phone', 'webrtc', 'matrix', 'mattermost', 'rocketchat', 'xmpp', 'irc', 'discourse', 'stats', 'statistics', 'bi', 'reports', 'report', 'reporting', 'tableau', 'looker', 'metabase', 'superset', 'redash', 'powerbi', 'qlik', 'mixpanel', 'amplitude', 'segment', 'plausible', 'matomo', 'ERP', 'E-commerce', 'Payments  crm', 'erp', 'sap', 'salesforce', 'zoho', 'odoo', 'hrms', 'hris', 'hr', 'payroll', 'attendance', 'recruit', 'talent', 'onboarding', 'shop', 'store', 'ecommerce', 'cart', 'checkout', 'pay', 'payment', 'payments', 'billing', 'invoice', 'order', 'catalog', 'product', 'marketplace', 'merchant', 'seller', 'deals', 'subscription', 'internal', 'corp', 'corporate', 'remote', 'connect', 'workspace', 'office', 'extranet', 'old', 'legacy', 'new', 'next', 'latest', 'current', 'link', 'links', 'go', 'url', 'redirect', 'r', 'track', 'tracking', 'click', 'pixel', 'beacon', 'ticket', 'tickets', 'jira', 'helpdesk', 'servicedesk', 'itsm', 'freshdesk', 'zendesk', 'mqtt', 'sensor', 'device', 'gateway-iot', 'hub', 'telemetry', 'scada', 'plc', 'modbus', 'lorawan', 'stream', 'streaming', 'live', 'vod', 'rtmp', 'hls', 'broadcast', 'radio', 'tv', 'iptv', 'podcast', 'audio', 'player', 'encoder', 'wowza', 'game', 'games', 'gaming', 'play', 'lobby', 'matchmaking', 'leaderboard', 'Legal', 'Real Estate  patient', 'ehr', 'emr', 'telehealth', 'pharmacy', 'lab', 'labs', 'radiology', 'hospital', 'clinic', 'doctor', 'appointment', 'opd', 'legal', 'compliance', 'privacy', 'gdpr', 'terms', 'policy', 'audit', 'risk', 'grc', 'property', 'realestate', 'facility', 'campus', 'booking', 'reservation', 'Supply Chain', 'Finance  logistics', 'supply', 'warehouse', 'inventory', 'fleet', 'dispatch', 'route', 'marketing', 'campaign', 'webinar', 'survey', 'form', 'feedback', 'nps', 'review', 'affiliate', 'finance', 'accounting', 'ledger', 'expense', 'budget', 'tax', 'procurement', 'purchase', 'vendor', 'supplier', 'projects', 'pm', 'task', 'tasks', 'kanban', 'board', 'sprint', 'agile', 'scrum', 'backlog', 'roadmap', 'automate', 'automation', 'workflow', 'cron', 'scheduler', 'queue', 'celery', 'rabbitmq', 'kafka', 'nats', 'eu', 'apac', 'emea', 'latam', 'na', 'sa', 'me', 'af', 'east', 'west', 'north', 'south', 'central', 'us-east', 'us-west', 'eu-west', 'ap-south', 'gov', 'eci', 'egov', 'india', 'bharat', 'digi', 'digital', 'rti', 'grievance', 'sampark', 'jansampark', 'parichay', 'digilocker', 'umang', 'mygov', 'uidai', 'aadhaar', 'epfo', 'esic', 'gstin', 'gst', 'incometax', 'efiling', 'tds', 'itr', 'meity', 'negd', 'stqc', 'cdac', 'nicsi', 'nielit', 'nagar', 'nagarsewa', 'seva', 'suvidha', 'sahaj', 'sarathi', 'vahan', 'passport', 'visa', 'emigrate', 'boc', 'dgft', 'icegate', 'nrega', 'mgnrega', 'pmay', 'pmjay', 'ayushman', 'cowin', 'aarogyasetu', 'setu', 'janparichay', 'jansuraksha', 'jandhan', 'mudra', 'standupmitra', 'swachh', 'namami', 'jal', 'ujjwala', 'kusum', 'saubhagya', 'pfms', 'bharatkosh', 'treasury', 'mea', 'mod', 'mof', 'moc', 'mohua', 'morth', 'moe', 'mhrd', 'cbdt', 'cbic', 'sebi', 'rbi', 'irdai', 'pfrda', 'nabard', 'sidbi', 'exim', 'cvc', 'cag', 'cbi', 'niti', 'pmo', 'railways', 'rail', 'ntes', 'uts', 'metro', 'cris', 'rdso', 'nhai', 'nhidcl', 'fastag', 'etoll', 'aai', 'dgca', 'bcas', 'airport', 'portnet', 'sagarmala', 'ibanking', 'ebanking', 'onlinebanking', 'mbanking', 'corpbanking', 'retailbanking', 'upi', 'neft', 'rtgs', 'imps', 'bhim', 'rupay', 'nach', 'ecs', 'sbi', 'pnb', 'boi', 'bob', 'canara', 'ubi', 'iob', 'idbi', 'uco', 'hdfc'
];

export default function SubdomainScanner({ domain, onComplete }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const runScan = useCallback(async () => {
    setLoading(true);
    setResults(null);
    setExpanded(false);

    const total = COMMON_SUBDOMAINS.length;
    setProgress({ done: 0, total });
    const allResults = [];
    const BATCH = 8;

    for (let i = 0; i < total; i += BATCH) {
      const batch = COMMON_SUBDOMAINS.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (sub) => {
          const fqdn = `${sub}.${domain}`;
          try {
            const [dataAAAA, dataA] = await Promise.all([
              dohQuery(fqdn, 'AAAA'),
              dohQuery(fqdn, 'A'),
            ]);
            const ipv6 = (dataAAAA.Answer || []).filter(a => a.type === 28).map(a => a.data);
            const ipv4 = (dataA.Answer || []).filter(a => a.type === 1).map(a => a.data);
            const exists = ipv6.length > 0 || ipv4.length > 0;
            const nx = dataAAAA.Status === 3 && dataA.Status === 3;
            return { sub, fqdn, ipv6, ipv4, exists: exists && !nx, nx };
          } catch {
            return { sub, fqdn, ipv6: [], ipv4: [], exists: false, nx: false, error: true };
          }
        })
      );
      allResults.push(...batchResults);
      setProgress({ done: allResults.length, total });
      if (i + BATCH < total) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    setResults(allResults);
    setLoading(false);
    if (onComplete) onComplete(allResults);
  }, [domain, onComplete]);

  const found = results ? results.filter(r => r.exists) : [];
  const withIPv6 = found.filter(r => r.ipv6.length > 0);
  const withoutIPv6 = found.filter(r => r.ipv6.length === 0);
  const totalScanned = results ? results.length : 0;

  return (
    <div className="records">
      <div className="subdomain-header">
        <p className="section-title" style={{ marginBottom: 0 }}>Subdomain Scanner</p>
        {!loading && !results && (
          <button className="btn-scan" onClick={runScan}>
            {Icon.search} Scan {COMMON_SUBDOMAINS.length} subdomains
          </button>
        )}
        {!loading && results && (
          <button className="btn-scan btn-scan-sm" onClick={runScan}>
            Re-scan
          </button>
        )}
      </div>
      <p className="subdomain-desc">
        Probes {COMMON_SUBDOMAINS.length} common subdomains for IPv6 and IPv4 records. Only discovered subdomains are shown.
      </p>

      {loading && (
        <div className="subdomain-loading">
          <span className="spinner" /> Scanning subdomains… {progress.done} / {progress.total}
        </div>
      )}

      {results && (
        <>
          {/* Summary */}
          <div className="subdomain-summary">
            <div className="subdomain-stat">
              <span className="subdomain-stat-num">{totalScanned}</span>
              <span className="subdomain-stat-label">Scanned</span>
            </div>
            <div className="subdomain-stat">
              <span className="subdomain-stat-num">{found.length}</span>
              <span className="subdomain-stat-label">Found</span>
            </div>
            <div className="subdomain-stat">
              <span className="subdomain-stat-num subdomain-stat-green">{withIPv6.length}</span>
              <span className="subdomain-stat-label">IPv6 Ready</span>
            </div>
            <div className="subdomain-stat">
              <span className="subdomain-stat-num subdomain-stat-red">{withoutIPv6.length}</span>
              <span className="subdomain-stat-label">IPv4 Only</span>
            </div>
          </div>

          {/* IPv6 coverage bar */}
          {found.length > 0 && (
            <div className="subdomain-progress">
              <div className="subdomain-progress-track">
                <div
                  className="subdomain-progress-fill"
                  style={{ width: `${(withIPv6.length / found.length) * 100}%` }}
                />
              </div>
              <span className="subdomain-progress-label">
                {Math.round((withIPv6.length / found.length) * 100)}% of discovered subdomains have IPv6
              </span>
            </div>
          )}

          {found.length === 0 && (
            <p className="no-records">No subdomains were discovered for this domain.</p>
          )}

          {/* Found subdomains — uses record-group / record / server-row pattern */}
          {found.length > 0 && (
            <div className="record-group">
              <div className="record-label">
                <span className="tag tag-sub" data-tooltip="Subdomains discovered via DNS probing of common prefixes.">SUB</span>
                {found.length} subdomain{found.length !== 1 && 's'} found
              </div>
              {found.map((r, i) => {
                const hasV6 = r.ipv6.length > 0;
                const hasV4 = r.ipv4.length > 0;
                const statusText = hasV6 && hasV4 ? 'Dual-stack' : hasV6 ? 'IPv6 only' : 'IPv4 only';
                if (!expanded && i >= 8) return null;
                return (
                  <div className={`record server-row ${hasV6 ? 'srv-pass' : 'srv-fail'}`} key={i}>
                    <code>{r.sub}.{domain}</code>
                    <div className="record-right">
                      {hasV6 && <span className="tag tag-v6">AAAA</span>}
                      {hasV4 && <span className="tag tag-v4">A</span>}
                      <span className={`srv-badge ${hasV6 ? 'srv-yes' : 'srv-no'}`}>{statusText}</span>
                    </div>
                  </div>
                );
              })}
              {found.length > 8 && (
                <button className="subdomain-toggle" onClick={() => setExpanded(e => !e)}>
                  {expanded ? 'Show less' : `Show all ${found.length} subdomains`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}


