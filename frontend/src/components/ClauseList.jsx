import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import ClauseCard from './ClauseCard';

export default function ClauseList({ clauses = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Clauses' },
    { id: 'red_flags', label: 'Red Flags' },
    { id: 'obligations_and_liabilities', label: 'Obligations & Liabilities' },
    { id: 'termination_and_renewal', label: 'Termination' },
    { id: 'financial_and_payment', label: 'Financial' },
    { id: 'standard_and_boilerplate', label: 'Standard Terms' },
  ];

  const filteredClauses = useMemo(() => {
    return clauses.filter((c) => {
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
      const matchesRisk = selectedRisk === 'all' || c.risk_level?.toLowerCase() === selectedRisk;
      const matchesQuery = !searchQuery.trim() ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plain_english?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.original_text?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesRisk && matchesQuery;
    });
  }, [clauses, selectedCategory, selectedRisk, searchQuery]);

  const redFlagsCount = clauses.filter(c => c.category === 'red_flags' || c.risk_level === 'high').length;

  return (
    <section aria-label="Clause-by-clause legal breakdown">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Clause-by-Clause Breakdown</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Showing {filteredClauses.length} of {clauses.length} analyzed provisions
          </p>
        </div>

        {redFlagsCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', border: '1px solid var(--risk-high-border)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700 }}>
            <AlertTriangle size={15} />
            <span>{redFlagsCount} Potential Red Flag / High Risk Items</span>
          </div>
        )}
      </div>

      {/* Controls & Search */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search clause keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}
              aria-label="Search clauses by keyword"
            />
          </div>

          {/* Risk Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Risk Filter:</span>
            {['all', 'high', 'medium', 'low'].map((risk) => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`filter-btn ${selectedRisk === risk ? 'active' : ''}`}
              >
                {risk.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="filter-group" style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clause Cards List */}
      {filteredClauses.length > 0 ? (
        filteredClauses.map((clause) => (
          <ClauseCard key={clause.id || clause.title} clause={clause} />
        ))
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No clauses match your selected category or search criteria.</p>
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedRisk('all'); setSearchQuery(''); }}
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}
