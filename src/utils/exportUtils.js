import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getConclusion } from './dnsUtils';

export function generateCSV(results) {
  const header = 'Domain,Score,Verdict,Conclusion,Hosting Provider,DNS Provider,IPv6,IPv4,Dual Stack,MX IPv6,NS IPv6,DNSSEC,SPF,DMARC,Latency (ms),IPv6 Addresses,IPv4 Addresses,MX Hosts,NS Hosts,Error';
  const rows = results.map(r => {
    if (r.error) return `${r.domain},,,,,,,,,,,,,,,,,,,"${r.error}"`;
    const verdict = r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready';
    const conclusion = getConclusion(r);
    return [
      r.domain, r.score, verdict, `"${conclusion}"`,
      `"${r.hosting || 'Unknown'}"`, `"${r.dnsProvider || 'Unknown'}"`,
      r.hasIPv6 ? 'Yes' : 'No',
      r.hasIPv4 ? 'Yes' : 'No',
      r.hasIPv4 && r.hasIPv6 ? 'Yes' : 'No',
      !r.hasMX ? 'N/A' : r.mxHasIPv6 ? 'Yes' : 'No',
      !r.hasNS ? 'N/A' : r.nsHasIPv6 ? 'Yes' : 'No',
      r.hasDNSSEC ? 'Yes' : 'No',
      r.hasSPF ? 'Yes' : 'No',
      r.hasDMARC ? 'Yes' : 'No',
      r.latencyMs,
      `"${r.ipv6.map(i => i.ip).join(' ')}"`,
      `"${r.ipv4.map(i => i.ip).join(' ')}"`,
      `"${r.mx.map(m => m.hostname).join(' ')}"`,
      `"${r.ns.map(n => n.hostname).join(' ')}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function generateJSON(results) {
  return JSON.stringify(results.map(r => ({
    domain: r.domain,
    score: r.score,
    verdict: r.score >= 80 ? 'Ready' : r.score >= 40 ? 'Partial' : 'Not Ready',
    conclusion: getConclusion(r),
    hosting: r.hosting,
    dnsProvider: r.dnsProvider,
    latencyMs: r.latencyMs,
    ipv6: r.ipv6.map(i => i.ip),
    ipv4: r.ipv4.map(i => i.ip),
    mx: r.mx.map(m => m.hostname),
    ns: r.ns.map(n => n.hostname),
    features: {
      hasIPv6: r.hasIPv6,
      hasIPv4: r.hasIPv4,
      dualStack: r.hasIPv6 && r.hasIPv4,
      mxHasIPv6: r.mxHasIPv6,
      nsHasIPv6: r.nsHasIPv6,
      hasDNSSEC: r.hasDNSSEC,
      hasSPF: r.hasSPF,
      hasDMARC: r.hasDMARC
    },
    error: r.error
  })), null, 2);
}

export function generatePDF(results) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('IPv6 Readiness Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 22);

  const tableData = results.map(r => {
    if (r.error) return [r.domain, 'Error', r.error, '-', '-', '-'];
    return [
      r.domain,
      r.score.toString(),
      r.hasIPv6 ? 'Yes' : 'No',
      !r.hasMX ? 'N/A' : r.mxHasIPv6 ? 'Yes' : 'No',
      !r.hasNS ? 'N/A' : r.nsHasIPv6 ? 'Yes' : 'No',
      getConclusion(r)
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Domain', 'Score', 'Web IPv6', 'Mail IPv6', 'NS IPv6', 'Verdict']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 'auto' }
    }
  });

  return doc;
}

export function generateSinglePDF(r) {
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
      ['Hosting Provider', r.hosting || 'Unknown'],
      ['DNS Provider', r.dnsProvider || 'Unknown'],
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

export function downloadFile(content, filename, type) {
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

