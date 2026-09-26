import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, HelpCircle, Check, Copy } from 'lucide-react';

export default function ClauseCard({ clause, number, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const {
    id,
    title,
    risk_level = 'medium',
    original_text,
    plain_english,
    potential_impact,
    lawyer_questions = []
  } = clause;

  const riskClass = risk_level?.toLowerCase() === 'high' ? 'high' : risk_level?.toLowerCase() === 'low' ? 'low' : 'medium';

  const handleCopyQuestions = (e) => {
    e.stopPropagation();
    if (!lawyer_questions.length) return;
    const textToCopy = `Questions for my lawyer regarding "${title}":\n` + lawyer_questions.map(q => `• ${q}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`accordion-clause-card ${isOpen ? 'is-open' : ''} risk-${riskClass}`} id={id}>
      {/* Accordion Header */}
      <div
        className="clause-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
        aria-expanded={isOpen}
      >
        <div className="clause-header-left">
          <div className={`number-circle circle-risk-${riskClass}`}>
            {number}
          </div>

          <h3 className="clause-accordion-title">{title}</h3>

          <span className={`badge badge-${riskClass}`}>
            {risk_level?.toUpperCase()} RISK
          </span>
        </div>

        <div className="clause-header-right">
          {isOpen ? <ChevronUp size={20} className="chevron-icon" /> : <ChevronDown size={20} className="chevron-icon" />}
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="clause-accordion-body">
          {/* Original Quote Excerpt */}
          {original_text && (
            <div className="clause-quote-box">
              <p>"{original_text}"</p>
            </div>
          )}

          {/* 3 Column Details Grid */}
          <div className="clause-details-grid">
            {/* Column 1: Plain English */}
            <div className="clause-detail-col col-plain-english">
              <div className="col-header">
                <Lightbulb size={16} className="col-icon icon-lightbulb" />
                <h4>Plain English</h4>
              </div>
              <p className="col-body-text">{plain_english}</p>
            </div>

            {/* Column 2: Potential Impact */}
            <div className="clause-detail-col col-impact">
              <div className="col-header">
                <AlertTriangle size={16} className="col-icon icon-warning" />
                <h4>Potential Impact</h4>
              </div>
              <p className="col-body-text">{potential_impact || "Review provisions to ensure clear compliance terms."}</p>
            </div>

            {/* Column 3: Questions for Lawyer */}
            <div className="clause-detail-col col-questions">
              <div className="col-header-with-action">
                <div className="col-header">
                  <HelpCircle size={16} className="col-icon icon-help" />
                  <h4>Questions for Your Lawyer</h4>
                </div>

                {lawyer_questions.length > 0 && (
                  <button onClick={handleCopyQuestions} className="btn-copy-small" title="Copy questions">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {lawyer_questions.length > 0 ? (
                <ul className="lawyer-bullets-list">
                  {lawyer_questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              ) : (
                <p className="col-body-text">Confirm expiration dates and exclusions with legal counsel.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
