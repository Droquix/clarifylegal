import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import DocumentUpload from '../components/DocumentUpload';
import DocumentComparison from '../components/DocumentComparison';
import RightSidebar from '../components/RightSidebar';
import ClauseCard from '../components/ClauseCard';

describe('Frontend UI & Error Handling Tests', () => {
  it('renders DocumentUpload and handles text submission', async () => {
    const handleAnalyzeText = vi.fn();
    const handleAnalyzeFile = vi.fn();

    render(
      <DocumentUpload
        onAnalyzeFile={handleAnalyzeFile}
        onAnalyzeText={handleAnalyzeText}
        isLoading={false}
      />
    );

    // Switch to paste tab
    const pasteTab = screen.getByRole('button', { name: /Paste Legal Text/i });
    fireEvent.click(pasteTab);

    const textarea = screen.getByPlaceholderText(/Paste your contract/i);
    fireEvent.change(textarea, { target: { value: 'This is a sample contract text with more than 20 characters for valid analysis.' } });

    const submitBtn = screen.getByRole('button', { name: /Analyze Document/i });
    fireEvent.click(submitBtn);

    expect(handleAnalyzeText).toHaveBeenCalledWith(
      'This is a sample contract text with more than 20 characters for valid analysis.'
    );
  });

  it('rejects unsupported file extensions on file selection failure path', () => {
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

    const badFile = new File(['hello'], 'invalid.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/Unsupported file type/i);
  });

  it('validates empty inputs on DocumentComparison failure path', async () => {
    render(<DocumentComparison />);

    const pasteTab = screen.getByRole('button', { name: /Paste Contract Versions/i });
    fireEvent.click(pasteTab);

    const compareBtn = screen.getByRole('button', { name: /Compare Contract Versions/i });
    fireEvent.click(compareBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please paste text into both Original and Revised/i);
  });

  it('blocks sending empty questions in RightSidebar with inline error', () => {
    render(
      <RightSidebar
        documentText="Sample NDA text content goes here..."
        onSwitchToCompare={vi.fn()}
      />
    );

    const sendBtn = screen.getByTitle(/Send Question/i);
    fireEvent.click(sendBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/Please enter a question before sending/i);
  });

  it('clears chat input field immediately when valid question is sent', async () => {
    render(
      <RightSidebar
        documentText="Sample document text for Q&A"
        onSwitchToCompare={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Type your question here/i);
    fireEvent.change(input, { target: { value: 'What are the main risks?' } });
    expect(input.value).toBe('What are the main risks?');

    const sendBtn = screen.getByTitle(/Send Question/i);

    await waitFor(() => {
      fireEvent.click(sendBtn);
    });

    // Input should be cleared immediately
    expect(input.value).toBe('');
  });

  it('displays "Copied!" confirmation when Copy Questions button is clicked in ClauseCard', () => {
    const clause = {
      id: 'clause-1',
      title: 'Confidentiality Obligations',
      risk_level: 'high',
      original_text: 'Recipient shall maintain strict confidence.',
      plain_english: 'This clause requires keeping technical data secret.',
      potential_impact: 'Failure to comply could lead to litigation.',
      lawyer_questions: ['What is the duration of secrecy?']
    };

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ClauseCard clause={clause} number={1} defaultOpen={true} />);

    const copyBtn = screen.getByTitle('Copy questions');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('What is the duration of secrecy?')
    );
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
