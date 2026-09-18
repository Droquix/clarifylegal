import React, { useState } from 'react';
import { HelpCircle, AlertOctagon, Check, Copy, Quote } from 'lucide-react';

export default function ClauseCard({ clause }) {
  const [copied, setCopied] = useState(false);

  const {
    id,
    title,
    category,
    risk_level,
    original_text,
    plain_english,
    potential_impact,
    lawyer_questions = []
  } = clause;

  const getRiskClass = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      default: return 'risk-low';
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'red_flags': return 'Red Flag Watchout';
      case 'obligations_and_liabilities': return 'Obligations & Liabilities';
      case 'termination_and_renewal': return 'Termination & Renewal';
      case 'financial_and_payment': return 'Financial Terms';
      default: return 'Standard Terms';
    }
  };

  const handleCopyQuestions = () => {
    if (lawyer_questions.length === 0) return;
    const textToCopy = `Questions for my lawyer regarding "${title}":\n` + lawyer_questions.map(q => `• ${q}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className={`card clause-card ${getRiskClass(risk_level)}`} id={id}>
      <div className="clause-header">
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {getCategoryLabel(category)}
          </span>
          <h3 style={{ fontSize: '1.2rem', marginTop: '0.15rem' }}>{title}</h3>
        </div>

        <span className={`badge badge-${risk_level?.toLowerCase() || 'medium'}`}>
          {risk_level?.toUpperCase()} RISK
        </span>
      </div>

      {/* Original Excerpt */}
      {original_text && (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Quote size={13} />
            <span>Original Legal Excerpt</span>
          </div>
          <blockquote className="original-text-box">
            "{original_text}"
          </blockquote>
        </div>
      )}

      {/* Plain English Explanation */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
          What This Means (Plain English)
        </h4>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {plain_english}
        </p>
      </div>

      {/* Potential Impact */}
      {potential_impact && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', marginBottom: '1rem', borderLeft: '3px solid var(--risk-medium-border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--risk-medium-text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertOctagon size={15} />
            <span>Potential Impact & Watchouts</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {potential_impact}
          </p>
        </div>
      )}

      {/* Suggested Questions for Lawyer */}
      {lawyer_questions && lawyer_questions.length > 0 && (
        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.85rem', marginTop: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HelpCircle size={15} style={{ color: 'var(--accent-primary)' }} />
              <span>Questions to Ask Your Lawyer</span>
            </div>

            <button
              onClick={handleCopyQuestions}
              style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
              title="Copy questions to clipboard"
            >
              {copied ? <Check size={14} style={{ color: 'var(--risk-low-text)' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Questions'}</span>
            </button>
          </div>

          <ul className="lawyer-questions-list">
            {lawyer_questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
