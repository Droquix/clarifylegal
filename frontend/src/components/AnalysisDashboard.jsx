import React from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import SummaryCard from './SummaryCard';
import KeyRisksGrid from './KeyRisksGrid';
import ClauseList from './ClauseList';
import ExportReportModal from './ExportReportModal';

export default function AnalysisDashboard({ analysisData, onReset, isLoading }) {
  const [showExportModal, setShowExportModal] = React.useState(false);

  if (isLoading) {
    return (
      <div className="center-dashboard-container">
        <div className="analysis-loading-card">
          <Loader2 size={40} className="spin loading-spinner-icon" />
          <h2 className="loading-card-title">Analyzing Legal Document...</h2>
          <p className="loading-card-sub">
            Translating complex legal language into plain English and extracting risk factors in-memory.
          </p>
          <div className="privacy-guarantee-note" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <ShieldCheck size={16} className="privacy-shield-icon" />
            <span>Strictly in-memory analysis. Zero file persistence.</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const handleScrollToClauses = () => {
    const section = document.getElementById('clause-breakdown-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="center-dashboard-container">
      {/* Navigation Back Link */}
      <div className="top-nav-row">
        <button onClick={onReset} className="back-link-btn">
          <ArrowLeft size={16} />
          <span>Analyze another document</span>
        </button>
      </div>

      {/* Top Document Header & Executive Summary */}
      <SummaryCard
        summary={analysisData.summary}
        onDownloadReport={() => setShowExportModal(true)}
        clausesCount={analysisData.clauses?.length || 4}
      />

      {/* Key Risks & Attention Points Cards Grid */}
      <KeyRisksGrid
        clauses={analysisData.clauses}
        onViewAllClauses={handleScrollToClauses}
      />

      {/* Clause-by-Clause Breakdown Accordion */}
      <ClauseList clauses={analysisData.clauses} />

      {/* Export Printable Report Modal */}
      {showExportModal && (
        <ExportReportModal
          analysisData={analysisData}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
