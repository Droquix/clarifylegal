import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import ExportReportModal from '../components/ExportReportModal';

describe('ExportReportModal Component Tests', () => {
  const sampleAnalysisData = {
    summary: {
      document_type: 'Non-Disclosure Agreement (NDA)',
      overall_risk_score: 'medium',
      executive_summary: 'This document defines confidentiality duties between disclosing and receiving parties.',
      metadata: {
        effective_date: 'January 15, 2026',
        governing_law: 'State of Delaware',
        parties_involved: ['Alpha Inc.', 'Beta LLC'],
      },
    },
    clauses: [
      {
        id: 'clause-1',
        title: 'Confidentiality Obligations',
        risk_level: 'high',
        plain_english: 'Keep technical data secret for 5 years.',
        potential_impact: 'Litigation risk if data leaks.',
        lawyer_questions: ['What is the grace period?'],
      },
    ],
    disclaimer: 'Informational guidance only.',
  };

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/dummy');
    global.URL.revokeObjectURL = vi.fn();
    window.print = vi.fn();

    // Mock anchor element click to prevent jsdom navigation warning
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = origCreateElement(tagName);
      if (tagName === 'a') {
        el.click = vi.fn();
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal header, executive overview, and clause details correctly', () => {
    render(<ExportReportModal analysisData={sampleAnalysisData} onClose={vi.fn()} />);

    expect(screen.getByText(/Legal Consultation Summary Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Non-Disclosure Agreement \(NDA\)/i)).toBeInTheDocument();
    expect(screen.getByText(/This document defines confidentiality duties/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep technical data secret for 5 years\./i)).toBeInTheDocument();
  });

  it('triggers text report file download (.txt) when Download Text button is clicked', () => {
    render(<ExportReportModal analysisData={sampleAnalysisData} onClose={vi.fn()} />);

    const downloadTxtBtn = screen.getByRole('button', { name: /Download Text \(\.txt\)/i });
    fireEvent.click(downloadTxtBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/Downloaded Text!/i)).toBeInTheDocument();
  });

  it('triggers markdown report file download (.md) when Download Markdown button is clicked', () => {
    render(<ExportReportModal analysisData={sampleAnalysisData} onClose={vi.fn()} />);

    const downloadMdBtn = screen.getByRole('button', { name: /Download Markdown \(\.md\)/i });
    fireEvent.click(downloadMdBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/Downloaded MD!/i)).toBeInTheDocument();
  });

  it('triggers window.print() when Print / Save PDF button is clicked', () => {
    render(<ExportReportModal analysisData={sampleAnalysisData} onClose={vi.fn()} />);

    const printBtn = screen.getByRole('button', { name: /Print \/ Save PDF/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it('calls onClose callback when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<ExportReportModal analysisData={sampleAnalysisData} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
