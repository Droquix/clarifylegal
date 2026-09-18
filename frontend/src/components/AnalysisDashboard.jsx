import React, { useState } from 'react';
import { FileText, Download, RotateCcw } from 'lucide-react';
import SummaryCard from './SummaryCard';
import ClauseList from './ClauseList';
import DocumentQA from './DocumentQA';
import ExportReportModal from './ExportReportModal';

export default function AnalysisDashboard({ analysisData, originalText, onReset }) {
  const [showExportModal, setShowExportModal] = useState(false);

  if (!analysisData) return null;

  return (
    <div className="container" style={{ paddingTop: '1rem' }}>
      {/* Top Dashboard Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button onClick={onReset} className="btn-secondary">
          <RotateCcw size={16} />
          Analyze Another Document
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowExportModal(true)} className="btn-primary">
            <Download size={16} />
            Export Legal Summary Report
          </button>
        </div>
      </div>

      {/* Executive Overview & Risk Badge */}
      <SummaryCard summary={analysisData.summary} />

      {/* Clause-by-Clause Explorer */}
      <ClauseList clauses={analysisData.clauses} />

      {/* Interactive Q&A Assistant */}
      <DocumentQA documentText={originalText || analysisData.summary?.executive_summary} />

      {/* Export Report Modal */}
      {showExportModal && (
        <ExportReportModal
          analysisData={analysisData}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
