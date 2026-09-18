import React from 'react';
import { AlertCircle, Calendar, ShieldAlert, Users, DollarSign, Scale, Clock } from 'lucide-react';

export default function SummaryCard({ summary }) {
  if (!summary) return null;

  const {
    document_type,
    executive_summary,
    overall_risk_score,
    risk_rationale,
    word_count,
    metadata = {}
  } = summary;

  const getRiskBadgeClass = (score) => {
    switch (score?.toLowerCase()) {
      case 'low': return 'badge-low';
      case 'high': return 'badge-high';
      default: return 'badge-medium';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Document Classification
          </span>
          <h2 style={{ fontSize: '1.6rem', marginTop: '0.2rem' }}>{document_type || 'Legal Agreement'}</h2>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Risk Rating</div>
          <span className={`badge ${getRiskBadgeClass(overall_risk_score)}`}>
            <ShieldAlert size={14} />
            {overall_risk_score?.toUpperCase() || 'MEDIUM'} RISK
          </span>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
          Executive Plain-English Summary
        </h3>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
          {executive_summary}
        </p>
      </div>

      {risk_rationale && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ color: 'var(--risk-medium-text)', flexShrink: 0 }} />
          <span><strong>Risk Assessment Rationale:</strong> {risk_rationale}</span>
        </div>
      )}

      {/* Metadata grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <Calendar size={15} />
            <span>Effective Date</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {metadata.effective_date || 'Not explicitly specified'}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <Scale size={15} />
            <span>Governing Law</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {metadata.governing_law || 'Not explicitly specified'}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <Users size={15} />
            <span>Parties Identified</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {metadata.parties_involved?.length > 0 ? metadata.parties_involved.join(', ') : 'Primary contracting parties'}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <Clock size={15} />
            <span>Length</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {word_count ? `${word_count} words` : 'In-memory parsed'}
          </div>
        </div>
      </div>
    </div>
  );
}
