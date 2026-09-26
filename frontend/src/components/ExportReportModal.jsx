import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Scale, FileText, Check } from 'lucide-react';

export default function ExportReportModal({ analysisData, onClose }) {
  const [downloadedFormat, setDownloadedFormat] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!analysisData) return null;

  const { summary = {}, clauses = [], disclaimer = '' } = analysisData;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    let md = `# ClarifyLegal Summary Report\n\n`;
    md += `**Document Type:** ${summary.document_type || 'Legal Agreement'}\n`;
    md += `**Overall Risk Rating:** ${summary.overall_risk_score?.toUpperCase() || 'MEDIUM'}\n\n`;
    md += `## Executive Plain-English Summary\n${summary.executive_summary || ''}\n\n`;
    md += `## Key Document Details\n`;
    md += `- Effective Date: ${summary.metadata?.effective_date || 'N/A'}\n`;
    md += `- Governing Law: ${summary.metadata?.governing_law || 'N/A'}\n`;
    md += `- Parties Involved: ${summary.metadata?.parties_involved?.join(', ') || 'N/A'}\n\n`;
    md += `## Clause Breakdown & Lawyer Questions\n\n`;

    clauses.forEach((c, idx) => {
      md += `### ${idx + 1}. ${c.title} (${(c.risk_level || 'MEDIUM').toUpperCase()} RISK)\n`;
      md += `**Plain English:** ${c.plain_english}\n`;
      if (c.potential_impact) md += `**Impact:** ${c.potential_impact}\n`;
      if (c.lawyer_questions?.length) {
        md += `**Questions for Lawyer:**\n`;
        c.lawyer_questions.forEach(q => md += `- ${q}\n`);
      }
      md += `\n`;
    });

    md += `---\n*${disclaimer}*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClarifyLegal-Report-${(summary.document_type || 'Contract').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedFormat('md');
    setTimeout(() => setDownloadedFormat(null), 3000);
  };

  const handleDownloadText = () => {
    let txt = `CLARIFYLEGAL SUMMARY REPORT\n`;
    txt += `==================================================================\n\n`;
    txt += `Document Type: ${summary.document_type || 'Legal Agreement'}\n`;
    txt += `Overall Risk Rating: ${summary.overall_risk_score?.toUpperCase() || 'MEDIUM'}\n\n`;
    txt += `EXECUTIVE PLAIN-ENGLISH SUMMARY:\n`;
    txt += `${summary.executive_summary || ''}\n\n`;
    txt += `KEY DOCUMENT DETAILS:\n`;
    txt += `- Effective Date: ${summary.metadata?.effective_date || 'N/A'}\n`;
    txt += `- Governing Law: ${summary.metadata?.governing_law || 'N/A'}\n`;
    txt += `- Parties Identified: ${summary.metadata?.parties_involved?.join(' / ') || 'N/A'}\n\n`;
    txt += `CLAUSE BREAKDOWN & QUESTIONS FOR YOUR LAWYER:\n`;
    txt += `------------------------------------------------------------------\n\n`;

    clauses.forEach((c, idx) => {
      txt += `${idx + 1}. ${c.title} [${(c.risk_level || 'MEDIUM').toUpperCase()} RISK]\n`;
      txt += `   Meaning: ${c.plain_english}\n`;
      if (c.potential_impact) txt += `   Impact: ${c.potential_impact}\n`;
      if (c.lawyer_questions?.length) {
        txt += `   Questions to ask your lawyer:\n`;
        c.lawyer_questions.forEach(q => txt += `     • ${q}\n`);
      }
      txt += `\n`;
    });

    txt += `==================================================================\n`;
    txt += `DISCLAIMER: ${disclaimer}\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClarifyLegal-Report-${(summary.document_type || 'Contract').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedFormat('txt');
    setTimeout(() => setDownloadedFormat(null), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Scale size={24} style={{ color: 'var(--accent-primary)' }} />
            <h2 id="modal-title" style={{ fontSize: '1.35rem', fontWeight: 700 }}>Legal Consultation Summary Report</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Export Options Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleDownloadText} className="btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {downloadedFormat === 'txt' ? <Check size={16} /> : <FileText size={16} />}
            <span>{downloadedFormat === 'txt' ? 'Downloaded Text!' : 'Download Text (.txt)'}</span>
          </button>

          <button onClick={handleDownloadMarkdown} className="btn-secondary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {downloadedFormat === 'md' ? <Check size={16} /> : <Download size={16} />}
            <span>{downloadedFormat === 'md' ? 'Downloaded MD!' : 'Download Markdown (.md)'}</span>
          </button>

          <button onClick={handlePrint} className="btn-secondary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        </div>

        {/* Printable Report Preview */}
        <div className="printable-report" style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
          <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>{summary.document_type || 'Legal Agreement'}</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Report Generated by ClarifyLegal | Risk Assessment: <strong>{(summary.overall_risk_score || 'MEDIUM').toUpperCase()} RISK</strong>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>Executive Overview</h3>
            <p style={{ lineHeight: '1.6' }}>{summary.executive_summary}</p>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Key Provisions & Lawyer Questions</h3>
            {clauses.map((c, idx) => (
              <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {idx + 1}. {c.title} [{(c.risk_level || 'MEDIUM').toUpperCase()} RISK]
                </div>
                <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  <strong>Meaning:</strong> {c.plain_english}
                </div>
                {c.lawyer_questions?.length > 0 && (
                  <div style={{ marginTop: '0.35rem', color: 'var(--accent-primary)' }}>
                    <strong>Ask your lawyer:</strong>
                    <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0 0 0' }}>
                      {c.lawyer_questions.map((q, qidx) => (
                        <li key={qidx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontStyle: 'italic' }}>
            {disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}
