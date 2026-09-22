import React from 'react';
import { AlertTriangle, ShieldAlert, Lock, Clock, Scale, ArrowRight } from 'lucide-react';

export default function KeyRisksGrid({ clauses = [], onViewAllClauses }) {
  // Extract key risk clauses or map clauses to highlight cards
  const riskCards = clauses.slice(0, 4).map((clause, idx) => {
    let icon = ShieldAlert;
    if (clause.category === 'obligations_and_liabilities' || clause.title?.toLowerCase().includes('confidential')) icon = Lock;
    else if (clause.category === 'termination_and_renewal' || clause.title?.toLowerCase().includes('terminat')) icon = Clock;
    else if (clause.category === 'standard_and_boilerplate' || clause.title?.toLowerCase().includes('governing')) icon = Scale;

    return {
      id: clause.id || `risk-${idx}`,
      title: clause.title,
      risk_level: clause.risk_level || 'medium',
      summary: clause.potential_impact || clause.plain_english,
      Icon: icon
    };
  });

  // Fallback defaults matching mockup if clauses count is small
  const displayCards = riskCards.length > 0 ? riskCards : [
    {
      id: 'risk-1',
      title: 'Indemnification Clause',
      risk_level: 'medium',
      summary: "You may be responsible for certain legal costs and damages if there's a claim.",
      Icon: ShieldAlert
    },
    {
      id: 'risk-2',
      title: 'Confidentiality Obligation',
      risk_level: 'medium',
      summary: 'Requires you to keep information private for 3 years after leaving.',
      Icon: Lock
    },
    {
      id: 'risk-3',
      title: 'Termination Notice',
      risk_level: 'low',
      summary: 'Either party can terminate with 30 days written notice.',
      Icon: Clock
    },
    {
      id: 'risk-4',
      title: 'Governing Law',
      risk_level: 'low',
      summary: 'Subject to Delaware law (or as specified).',
      Icon: Scale
    }
  ];

  return (
    <section className="key-risks-section" aria-label="Key Risks and Attention Points">
      <div className="section-header">
        <div className="section-title-wrapper">
          <div className="warning-icon-badge">
            <AlertTriangle size={18} />
          </div>
          <h2>Key Risks & Attention Points</h2>
        </div>

        <button onClick={onViewAllClauses} className="view-all-link">
          <span>View All Clauses</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="key-risks-grid">
        {displayCards.map((card) => {
          const { id, title, risk_level, summary, Icon } = card;
          const riskClass = risk_level?.toLowerCase() === 'high' ? 'risk-high' : risk_level?.toLowerCase() === 'low' ? 'risk-low' : 'risk-medium';
          
          return (
            <div key={id} className={`key-risk-card ${riskClass}`}>
              <div className="risk-card-header">
                <div className={`risk-card-icon-wrapper ${riskClass}`}>
                  <Icon size={18} />
                </div>
              </div>

              <h3 className="risk-card-title">{title}</h3>

              <div className="risk-badge-wrapper">
                <span className={`badge badge-${riskClass.replace('risk-', '')}`}>
                  {risk_level?.toUpperCase()} RISK
                </span>
              </div>

              <p className="risk-card-summary">{summary}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
