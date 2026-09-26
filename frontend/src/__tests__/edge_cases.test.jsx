import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

import DocumentUpload from '../components/DocumentUpload';
import DocumentComparison from '../components/DocumentComparison';
import RightSidebar from '../components/RightSidebar';
import * as api from '../utils/api';

vi.mock('../utils/api', () => ({
  compareText: vi.fn(),
  compareFiles: vi.fn(),
}));

describe('Frontend Edge Cases, Error States, and Loading States', () => {

  // ---------------------------------------------------------------------------
  // 1. LOADING STATES
  // ---------------------------------------------------------------------------
  describe('Loading States', () => {
    it('renders DocumentUpload in loading state with disabled submit button and spinner text', () => {
      render(
        <DocumentUpload
          onAnalyzeFile={vi.fn()}
          onAnalyzeText={vi.fn()}
          isLoading={true}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /Analyzing Contract\.\.\./i });
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/Analyzing Contract\.\.\./i)).toBeInTheDocument();
    });

    it('displays loading spinner state in DocumentComparison while API promise is pending', async () => {
      // Mock pending promise to keep DocumentComparison in loading state
      api.compareText.mockImplementation(() => new Promise(() => {}));

      render(<DocumentComparison />);

      const pasteTab = screen.getByRole('button', { name: /Paste Contract Versions/i });
      fireEvent.click(pasteTab);

      const textareas = screen.getAllByRole('textbox');
      fireEvent.change(textareas[0], { target: { value: 'Original NDA contract version text for testing.' } });
      fireEvent.change(textareas[1], { target: { value: 'Revised NDA contract version text with changes.' } });

      const compareBtn = screen.getByRole('button', { name: /Compare Contract Versions/i });
      fireEvent.click(compareBtn);

      expect(await screen.findByRole('button', { name: /Comparing Versions\.\.\./i })).toBeDisabled();
      expect(screen.getByText(/Comparing Versions\.\.\./i)).toBeInTheDocument();
    });

    it('renders RightSidebar Q&A in loading state with thinking indicator while API call is pending', async () => {
      api.askQuestion = vi.fn().mockImplementation(() => new Promise(() => {}));

      render(
        <RightSidebar
          documentText="Sample NDA contract text for Q&A"
          onSwitchToCompare={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/Type your question here/i);
      fireEvent.change(input, { target: { value: 'What is the notice period?' } });

      const sendBtn = screen.getByTitle(/Send Question/i);
      fireEvent.click(sendBtn);

      expect(input).toBeDisabled();
      expect(sendBtn).toBeDisabled();
      expect(await screen.findByText(/ClarifyLegal Assistant is thinking\.\.\./i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. EMPTY INPUT HANDLING
  // ---------------------------------------------------------------------------
  describe('Empty Input Handling', () => {
    it('shows error alert when DocumentUpload submit is clicked with text under 20 characters', () => {
      render(
        <DocumentUpload
          onAnalyzeFile={vi.fn()}
          onAnalyzeText={vi.fn()}
          isLoading={false}
        />
      );

      const pasteTab = screen.getByRole('button', { name: /Paste Legal Text/i });
      fireEvent.click(pasteTab);

      const textarea = screen.getByPlaceholderText(/Paste your contract/i);
      fireEvent.change(textarea, { target: { value: 'Short text' } });

      const formSubmit = textarea.closest('form');
      fireEvent.submit(formSubmit);

      expect(screen.getByRole('alert')).toHaveTextContent(/Please paste contract text containing at least 20 characters/i);
    });

    it('validates empty original or revised inputs in DocumentComparison paste tab', async () => {
      render(<DocumentComparison />);

      const pasteTab = screen.getByRole('button', { name: /Paste Contract Versions/i });
      fireEvent.click(pasteTab);

      const textareas = screen.getAllByRole('textbox');
      fireEvent.change(textareas[0], { target: { value: 'Valid original contract text with sufficient characters.' } });
      fireEvent.change(textareas[1], { target: { value: '' } });

      const compareBtn = screen.getByRole('button', { name: /Compare Contract Versions/i });
      fireEvent.click(compareBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent(/Please paste text into both Original and Revised/i);
    });

    it('blocks whitespace-only question submissions in RightSidebar Q&A', () => {
      render(
        <RightSidebar
          documentText="Sample NDA contract text"
          onSwitchToCompare={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/Type your question here/i);
      fireEvent.change(input, { target: { value: '    \n\t   ' } });

      const sendBtn = screen.getByTitle(/Send Question/i);
      fireEvent.click(sendBtn);

      expect(screen.getByRole('alert')).toHaveTextContent(/Please enter a question before sending/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ERROR STATES & FILE VALIDATION
  // ---------------------------------------------------------------------------
  describe('Error States & File Validation', () => {
    it('shows error alert when uploaded file exceeds 5MB limit in DocumentUpload', () => {
      render(
        <DocumentUpload
          onAnalyzeFile={vi.fn()}
          onAnalyzeText={vi.fn()}
          isLoading={false}
        />
      );

      const dropzoneHeading = screen.getByText(/Drag & drop your contract file here/i);
      const dropzoneBox = dropzoneHeading.closest('.dropzone-box');
      const fileInput = dropzoneBox.querySelector('input[type="file"]');

      const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large_contract.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(screen.getByRole('alert')).toHaveTextContent(/File size exceeds maximum 5MB limit/i);
    });

    it('renders error alert when comparison API call fails in DocumentComparison', async () => {
      api.compareText.mockRejectedValue(new Error('NVIDIA NIM API rate limit exceeded'));

      render(<DocumentComparison />);

      const pasteTab = screen.getByRole('button', { name: /Paste Contract Versions/i });
      fireEvent.click(pasteTab);

      const textareas = screen.getAllByRole('textbox');
      fireEvent.change(textareas[0], { target: { value: 'Original NDA contract text.' } });
      fireEvent.change(textareas[1], { target: { value: 'Revised NDA contract text.' } });

      const compareBtn = screen.getByRole('button', { name: /Compare Contract Versions/i });
      fireEvent.click(compareBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent(/NVIDIA NIM API rate limit exceeded/i);
    });
  });

});
