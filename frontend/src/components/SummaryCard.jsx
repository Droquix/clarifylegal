import React, { useState } from 'react';
import { FileText, Calendar, Scale, Users, Clock, AlertTriangle, Download, MoreVertical, FileCode, Check, Copy } from 'lucide-react';

export default function SummaryCard({ summary, onDownloadReport, clausesCount = 4 }) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (!summary) return null;

  const {
    document_type,
    executive_summary,
    overall_risk_score,
    word_count,
    metadata = {}
  } = summary;

  const riskLevel = overall_risk_score?.toLowerCase() || 'medium';
  const riskLabel = riskLevel === 'high' ? 'High Risk' : riskLevel === 'low' ? 'Low Risk' : 'Medium Risk';

  const handleCopySummary = () => {
    const textToCopy = `Summary for ${document_type || 'Contract'}:\n${executive_summary}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setShowDropdown(false);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="summary-dashboard-card">
      {/* Document Title Header Row */}
      <div className="doc-header-row">
        <div className="doc-title-group">
          <div className="doc-icon-container">
            <FileCode size={24} className="doc-icon" />
          </div>
          <div>
            <h1 className="doc-main-title">{document_type || 'Non-Disclosure Agreement (NDA)'}</h1>
            <div className="doc-subtitle-badges">
              <span className="doc-badge-pill">Legal Document</span>
              <span className="dot-separator">•</span>
              <span>{word_count || 142} words</span>
              <span className="dot-separator">•</span>
              <span>{clausesCount} clauses</span>
            </div>
          </div>
        </div>

        <div className="doc-actions-group" style={{ position: 'relative' }}>
          <div className={`risk-banner-pill risk-${riskLevel}`}>
            <AlertTriangle size={16} />
            <span>{riskLabel} — See risk breakdown</span>
          </div>

          <button onClick={onDownloadReport} className="btn-download-report" title="Download or print legal summary report">
            <Download size={16} />
            <span>Download Report</span>
          </button>

          <button
            onClick={() => setShowDropdown(prev => !prev)}
            className="btn-icon-overflow"
            aria-label="More options"
            title="More options"
          >
            <MoreVertical size={18} />
          </button>

          {showDropdown && (
            <div className="overflow-dropdown-menu" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 50,
              minWidth: '180px',
              padding: '0.4rem 0'
            }}>
              <button
                onClick={onDownloadReport}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.6rem 1rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} />
                <span>Download Report</span>
              </button>

              <button
                onClick={handleCopySummary}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.6rem 1rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                {copiedSummary ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedSummary ? 'Copied Summary!' : 'Copy Summary'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary & Metadata Card */}
      <div className="executive-summary-card">
        <div className="summary-text-block">
          <div className="summary-card-header">
            <FileText size={18} className="summary-header-icon" />
            <h3 className="summary-header-title">Executive Summary</h3>
          </div>
          <p className="summary-paragraph">
            {executive_summary || "This document is a Non-Disclosure Agreement (NDA). It defines the parties involved, confidentiality duties, termination rules, and liability allocations between the parties."}
          </p>
        </div>

        {/* 4 Metadata Columns */}
        <div className="metadata-grid">
          <div className="meta-item">
            <div className="meta-label">
              <Calendar size={15} />
              <span>Effective Date</span>
            </div>
            <div className="meta-value">
              {metadata.effective_date || "Upon signing / As stated in Section 1"}
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-label">
              <Scale size={15} />
              <span>Governing Law</span>
            </div>
            <div className="meta-value">
              {metadata.governing_law || "State of Delaware (or as specified)"}
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-label">
              <Users size={15} />
              <span>Parties Identified</span>
            </div>
            <div className="meta-value">
              {metadata.parties_involved?.length > 0 ? metadata.parties_involved.join(' / ') : "Disclosing Party / Receiving Party"}
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-label">
              <Clock size={15} />
              <span>Length</span>
            </div>
            <div className="meta-value">
              {word_count ? `${word_count} words` : "142 words"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
