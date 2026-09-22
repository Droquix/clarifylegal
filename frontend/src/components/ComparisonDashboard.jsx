import React, { useState } from 'react';
import {
  GitCompare,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  HelpCircle,
  Lightbulb,
  Copy,
  Check,
  Scale,
  ShieldCheck,
  Filter,
  FileCode,
  ArrowRight
} from 'lucide-react';

export default function ComparisonDashboard({ comparisonData, onReset }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'high_risk' | 'added' | 'modified' | 'removed'
  const [copiedId, setCopiedId] = useState(null);

  if (!comparisonData) return null;

  const { summary = {}, changes = [], disclaimer } = comparisonData;
  const { overview = 'Comparison completed.', material_change_count = changes.length, higher_risk_changes = 0 } = summary;

  const handleCopyQuestions = (changeId, title, questions) => {
    if (!questions || !questions.length) return;
    const textToCopy = `Questions for my lawyer regarding "${title}" change:\n` + questions.map(q => `• ${q}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(changeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredChanges = changes.filter((change) => {
    if (activeFilter === 'high_risk') {
      return change.risk_direction === 'increased';
    }
    if (activeFilter === 'added') {
      return change.change_type === 'added';
    }
    if (activeFilter === 'modified') {
      return change.change_type === 'modified';
    }
    if (activeFilter === 'removed') {
      return change.change_type === 'removed';
    }
    return true;
  });

  return (
    <div className="comparison-results-container">
      {/* Back Navigation Bar */}
      <div className="top-nav-row">
        <button onClick={onReset} className="back-link-btn">
          <ArrowLeft size={16} />
          <span>Back to Comparison Setup</span>
        </button>
      </div>

      {/* Hero Comparison Summary Header Card */}
      <div className="comparison-hero-card">
        <div className="comparison-hero-top">
          <div className="comparison-hero-icon-badge">
            <GitCompare size={26} />
          </div>
          <div>
            <h1 className="comparison-hero-title">Contract Version Comparison</h1>
            <p className="comparison-hero-subtitle">{overview}</p>
          </div>
        </div>

        <div className="comparison-stats-banner">
          <div className="stat-box">
            <span className="stat-number">{material_change_count}</span>
            <span className="stat-label">Material Changes</span>
          </div>
          <div className="stat-box highlight-risk">
            <span className="stat-number">{higher_risk_changes}</span>
            <span className="stat-label">Higher Risk Changes</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{material_change_count - higher_risk_changes}</span>
            <span className="stat-label">Neutral / Lower Risk</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="comparison-filter-bar">
        <div className="filter-label">
          <Filter size={16} />
          <span>Filter Changes:</span>
        </div>

        <div className="filter-pills-group">
          <button
            type="button"
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Changes ({changes.length})
          </button>

          {higher_risk_changes > 0 && (
            <button
              type="button"
              className={`filter-pill pill-high-risk ${activeFilter === 'high_risk' ? 'active' : ''}`}
              onClick={() => setActiveFilter('high_risk')}
            >
              ⚠️ Higher Risk ({higher_risk_changes})
            </button>
          )}

          <button
            type="button"
            className={`filter-pill ${activeFilter === 'modified' ? 'active' : ''}`}
            onClick={() => setActiveFilter('modified')}
          >
            Modified Provisions
          </button>

          <button
            type="button"
            className={`filter-pill ${activeFilter === 'added' ? 'active' : ''}`}
            onClick={() => setActiveFilter('added')}
          >
            Added Provisions
          </button>

          <button
            type="button"
            className={`filter-pill ${activeFilter === 'removed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('removed')}
          >
            Removed Provisions
          </button>
        </div>
      </div>

      {/* Detailed Diff Cards List */}
      <div className="comparison-changes-list">
        {filteredChanges.length === 0 ? (
          <div className="empty-changes-card">
            <CheckCircle2 size={32} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
            <h3>No changes match the selected filter.</h3>
            <p>Select "All Changes" above to review all identified provisions.</p>
          </div>
        ) : (
          filteredChanges.map((change) => {
            const isRiskIncreased = change.risk_direction === 'increased';
            const isRiskDecreased = change.risk_direction === 'decreased';
            const changeType = (change.change_type || 'modified').toLowerCase();

            return (
              <div
                key={change.id}
                className={`diff-change-card ${isRiskIncreased ? 'risk-increased-card' : ''}`}
              >
                {/* Diff Header */}
                <div className="diff-card-header">
                  <div className="diff-title-group">
                    <span className={`change-type-badge badge-${changeType}`}>
                      {changeType.toUpperCase()}
                    </span>
                    <h3 className="diff-clause-title">{change.title}</h3>
                  </div>

                  <div className={`risk-direction-badge ${change.risk_direction}`}>
                    {isRiskIncreased ? (
                      <>
                        <AlertTriangle size={15} />
                        <span>Risk Increased</span>
                      </>
                    ) : isRiskDecreased ? (
                      <>
                        <MinusCircle size={15} />
                        <span>Risk Decreased</span>
                      </>
                    ) : (
                      <>
                        <Scale size={15} />
                        <span>Risk Neutral</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Visual Side-by-Side Excerpt Comparison Box */}
                <div className="diff-excerpts-grid">
                  {/* Original Version 1 */}
                  <div className="excerpt-box original-excerpt">
                    <div className="excerpt-header orig-header">
                      <MinusCircle size={15} className="excerpt-header-icon" />
                      <span>Version 1 (Original Contract)</span>
                    </div>
                    <div className="excerpt-content">
                      {change.original_text ? (
                        <p className="excerpt-text orig-text">"{change.original_text}"</p>
                      ) : (
                        <p className="excerpt-empty-text">No corresponding text in original version</p>
                      )}
                    </div>
                  </div>

                  {/* Revised Version 2 */}
                  <div className="excerpt-box revised-excerpt">
                    <div className="excerpt-header rev-header">
                      <PlusCircle size={15} className="excerpt-header-icon" />
                      <span>Version 2 (Revised Contract)</span>
                    </div>
                    <div className="excerpt-content">
                      {change.revised_text ? (
                        <p className="excerpt-text rev-text">"{change.revised_text}"</p>
                      ) : (
                        <p className="excerpt-empty-text">Provision removed in revised version</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2-Column Impact & Questions Breakdown */}
                <div className="diff-breakdown-grid">
                  {/* Column 1: Plain English Impact */}
                  <div className="diff-info-col col-plain-english">
                    <div className="col-header">
                      <Lightbulb size={16} className="col-icon icon-lightbulb" />
                      <h4>What Changed & Why It Matters</h4>
                    </div>
                    <p className="col-body-text">{change.plain_english_impact}</p>
                  </div>

                  {/* Column 2: Questions for Lawyer */}
                  <div className="diff-info-col col-lawyer-questions">
                    <div className="col-header-with-action">
                      <div className="col-header">
                        <HelpCircle size={16} className="col-icon icon-help" />
                        <h4>Questions for Your Lawyer</h4>
                      </div>

                      {change.lawyer_questions?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyQuestions(change.id, change.title, change.lawyer_questions)}
                          className="btn-copy-small"
                          title="Copy questions for lawyer"
                        >
                          {copiedId === change.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedId === change.id ? 'Copied!' : 'Copy'}</span>
                        </button>
                      )}
                    </div>

                    {change.lawyer_questions?.length > 0 ? (
                      <ul className="lawyer-bullets-list">
                        {change.lawyer_questions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="col-body-text">Confirm these revised terms with your legal counsel.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mandatory Informational Disclaimer */}
      {disclaimer && (
        <div className="comparison-disclaimer-note">
          <ShieldCheck size={16} className="privacy-shield-icon" />
          <span>{disclaimer}</span>
        </div>
      )}
    </div>
  );
}
