import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Type, X, ArrowRight, Loader2, ShieldCheck, FileCode, CheckCircle2 } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../utils/sampleData';

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
    setDragOver(e.dataTransfer.types.includes('Files'));
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
        setErrorMsg('Please select a PDF or text file to analyze.');
        return;
      }
      onAnalyzeFile(file);
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setErrorMsg('Please paste contract text containing at least 20 characters.');
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
    <div className="upload-screen-container">
      {/* Hero Header Card */}
      <div className="upload-hero-card">
        <div className="hero-icon-badge">
          <UploadCloud size={24} />
        </div>
        <h1 className="upload-hero-title">Upload & Simplify Legal Document</h1>
        <p className="upload-hero-subtitle">
          Select a contract file or paste legal text below to receive a structured plain-English breakdown, key risks, and lawyer questions.
        </p>
      </div>

      {/* Main Upload Card Container */}
      <div className="upload-main-card">
        {/* Input Method Toggle Tabs */}
        <div className="input-method-tabs">
          <button
            type="button"
            className={`method-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
          >
            <UploadCloud size={18} />
            <span>Upload Document File (.pdf, .txt)</span>
          </button>

          <button
            type="button"
            className={`method-tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
            onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
          >
            <Type size={18} />
            <span>Paste Legal Text</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {activeTab === 'upload' ? (
            <div className="dragdrop-zone-wrapper">
              {!file ? (
                <div
                  className={`dropzone-box ${dragOver ? 'is-dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.txt"
                    style={{ display: 'none' }}
                  />

                  <div className="dropzone-cloud-icon">
                    <UploadCloud size={32} />
                  </div>

                  <h3 className="dropzone-title">Drag & drop your contract file here</h3>
                  <p className="dropzone-sub">Supports PDF (.pdf) and Plain Text (.txt) up to 5MB</p>

                  <button type="button" className="btn-browse-file">
                    Browse Computer Files
                  </button>
                </div>
              ) : (
                <div className="file-selected-card">
                  <div className="file-info-group">
                    <div className="file-icon-box">
                      <FileCode size={24} />
                    </div>
                    <div>
                      <div className="file-name-text">{file.name}</div>
                      <div className="file-size-text">
                        {(file.size / 1024).toFixed(1)} KB • Ready to Analyze
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="btn-remove-file"
                    title="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="paste-input-wrapper">
              <textarea
                className="paste-text-input"
                placeholder="Paste your contract, NDA, lease, or legal agreement clauses here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={10}
              />
              <div className="textarea-footer-info">
                <span>{pastedText.length} characters</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="upload-error-alert" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Action Bar & Privacy Indicator */}
          <div className="upload-action-footer">
            <div className="privacy-guarantee-note">
              <ShieldCheck size={16} className="privacy-shield-icon" />
              <span>Processed strictly in-memory. Zero file persistence.</span>
            </div>

            <button
              type="submit"
              className="btn-submit-analyze"
              disabled={isLoading || (activeTab === 'upload' && !file) || (activeTab === 'paste' && !pastedText.trim())}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Analyzing Contract...</span>
                </>
              ) : (
                <>
                  <span>Analyze Document</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Pre-Loaded Sample Agreements */}
      <div className="samples-section">
        <h3 className="samples-section-title">
          Or try one of these pre-loaded sample agreements:
        </h3>

        <div className="sample-cards-grid">
          {SAMPLE_DOCUMENTS.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleSelectSample(doc)}
              className="sample-doc-card"
              role="button"
              tabIndex={0}
            >
              <div className="sample-card-top">
                <FileText size={18} className="sample-icon" />
                <span className="sample-category-tag">{doc.category}</span>
              </div>
              <h4 className="sample-card-title">{doc.title}</h4>
              <p className="sample-card-desc">{doc.description}</p>
              <div className="sample-card-action">
                <span>Load Sample</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
