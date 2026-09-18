import React from 'react';
import { FileText } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../utils/sampleData';

export default function SampleDocs({ onSelectSample, isLoading }) {
  return (
    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Don't have a document handy? Try one of these pre-loaded legal agreements:
      </p>

      <div className="samples-container">
        {SAMPLE_DOCUMENTS.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelectSample(doc)}
            disabled={isLoading}
            className="sample-chip"
            aria-label={`Load sample document: ${doc.title}`}
          >
            <FileText size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            {doc.title}
          </button>
        ))}
      </div>
    </div>
  );
}
