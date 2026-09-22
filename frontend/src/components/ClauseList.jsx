import React, { useState, useMemo } from 'react';
import { Layers } from 'lucide-react';
import ClauseCard from './ClauseCard';

export default function ClauseList({ clauses = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'red_flags', label: 'Red Flags' },
    { id: 'obligations_and_liabilities', label: 'Obligations & Liabilities' },
    { id: 'termination_and_renewal', label: 'Termination' },
    { id: 'standard_and_boilerplate', label: 'Standard Terms' }
  ];

  const filteredClauses = useMemo(() => {
    if (selectedCategory === 'all') return clauses;
    return clauses.filter(c => c.category === selectedCategory);
  }, [clauses, selectedCategory]);

  return (
    <section className="clause-breakdown-section" id="clause-breakdown-section" aria-label="Clause-by-Clause Breakdown">
      {/* Header Row */}
      <div className="clause-breakdown-header">
        <div className="clause-breakdown-title-wrapper">
          <div className="clause-icon-bg">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="clause-breakdown-title">Clause-by-Clause Breakdown</h2>
            <p className="clause-breakdown-subtitle">{clauses.length} provisions analyzed</p>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="category-pills-row">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion Clause Cards List */}
      <div className="clauses-accordion-list">
        {filteredClauses.map((clause, idx) => (
          <ClauseCard
            key={clause.id || idx}
            clause={clause}
            number={idx + 1}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </section>
  );
}
