import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Type, X, ArrowRight, Loader2, Lock } from 'lucide-react';
import SampleDocs from './SampleDocs';

export default function DocumentUpload({ onAnalyzeFile, onAnalyzeText, isLoading }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMsg('');
    if (!selectedFile) return;

    const lowerName = selectedFile.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.txt')) {
      setErrorMsg('Unsupported file type. Please select a .pdf or .txt file.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum 5MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeTab === 'upload') {
      if (!file) {
        setErrorMsg('Please select a PDF or text file first.');
        return;
      }
      onAnalyzeFile(file);
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setErrorMsg('Please paste legal text containing at least 20 characters.');
        return;
      }
      onAnalyzeText(pastedText);
    }
  };

  const handleSelectSample = (sampleDoc) => {
    setErrorMsg('');
    setActiveTab('paste');
    setPastedText(sampleDoc.text);
    onAnalyzeText(sampleDoc.text);
  };

  return (
    <div className="upload-container">
      <div className="upload-tabs" role="tablist" aria-label="Document Input Methods">
        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
          role="tab"
          aria-selected={activeTab === 'upload'}
          id="tab-upload"
        >
          <UploadCloud size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Upload Document (.pdf, .txt)
        </button>

        <button
          className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
          role="tab"
          aria-selected={activeTab === 'paste'}
          id="tab-paste"
        >
          <Type size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Paste Legal Text
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'upload' ? (
          <div>
            <div
              className={`dropzone ${dragOver ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              aria-label="Upload legal document dropzone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.txt"
                style={{ display: 'none' }}
                tabIndex={-1}
              />

              <UploadCloud className="upload-icon" aria-hidden="true" />
              <h3>Drag and drop your contract or PDF here</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>
                Supports PDF and TXT documents up to 5MB.
              </p>

              <button type="button" className="btn-secondary">
                Browse Files
              </button>
            </div>

            {file && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.25rem',
                  marginTop: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{file.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                  aria-label="Remove selected file"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="legal-text-input" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              Paste legal contract text
            </label>
            <textarea
              id="legal-text-input"
              className="paste-textarea"
              placeholder="Paste your contract, agreement, NDA, or lease clauses here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={8}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {pastedText.length} characters
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--risk-high-bg)',
              color: 'var(--risk-high-text)',
              border: '1px solid var(--risk-high-border)',
              fontSize: '0.9rem',
            }}
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Lock size={14} />
            <span>Processed strictly in-memory. Zero document persistence.</span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || (activeTab === 'upload' && !file) || (activeTab === 'paste' && !pastedText.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                Simplifying Legal Text...
              </>
            ) : (
              <>
                Clarify Document
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      <SampleDocs onSelectSample={handleSelectSample} isLoading={isLoading} />
    </div>
  );
}
