import React, { useState, useRef } from 'react';
import { Scale, UploadCloud, Type, X, ArrowRight, Loader2, ShieldCheck, FileCode, GitCompare, Sparkles } from 'lucide-react';
import ComparisonDashboard from './ComparisonDashboard';
import { compareText, compareFiles } from '../utils/api';

const SAMPLE_ORIGINAL_TEXT = `MUTUAL NON-DISCLOSURE AGREEMENT
This Agreement is entered into on January 15, 2026, by Alpha Inc. and Beta LLC.
1. Confidential Information: Both parties agree to hold all non-public technical data in strict confidence.
2. Termination: Either party may terminate this agreement upon 30 days written notice.
3. Governing Law: Governed by Delaware law.`;

const SAMPLE_REVISED_TEXT = `MUTUAL NON-DISCLOSURE AGREEMENT
This Agreement is entered into on January 15, 2026, by Alpha Inc. and Beta LLC.
1. Confidential Information: Both parties agree to hold all non-public technical data in strict confidence for 5 years after termination.
2. Non-Compete & Non-Solicit: Recipient agrees not to engage in competing business or solicit employees for 12 months.
3. Indemnification: Recipient agrees to defend and indemnify Alpha Inc. from all losses and legal expenses.
4. Termination: Either party may terminate this agreement upon 60 days written notice.
5. Governing Law: Governed by Delaware law.`;

export default function DocumentComparison() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [origFile, setOrigFile] = useState(null);
  const [revFile, setRevFile] = useState(null);
  const [origText, setOrigText] = useState('');
  const [revText, setRevText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  const origInputRef = useRef(null);
  const revInputRef = useRef(null);

  const handleOrigFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setOrigFile(file);
  };

  const handleRevFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setRevFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeTab === 'upload') {
      if (!origFile || !revFile) {
        setErrorMsg('Please select both Original and Revised contract files.');
        return;
      }
      setIsLoading(true);
      try {
        const result = await compareFiles(origFile, revFile);
        setComparisonResult(result);
      } catch (err) {
        setErrorMsg(err.message || 'Comparison failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!origText.trim() || !revText.trim()) {
        setErrorMsg('Please paste text into both Original and Revised contract boxes.');
        return;
      }
      setIsLoading(true);
      try {
        const result = await compareText(origText, revText);
        setComparisonResult(result);
      } catch (err) {
        setErrorMsg(err.message || 'Comparison failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTrySampleComparison = async () => {
    setErrorMsg('');
    setActiveTab('paste');
    setOrigText(SAMPLE_ORIGINAL_TEXT);
    setRevText(SAMPLE_REVISED_TEXT);
    setIsLoading(true);
    try {
      const result = await compareText(SAMPLE_ORIGINAL_TEXT, SAMPLE_REVISED_TEXT);
      setComparisonResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Sample comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (comparisonResult) {
    return (
      <ComparisonDashboard
        comparisonData={comparisonResult}
        onReset={() => setComparisonResult(null)}
      />
    );
  }

  return (
    <div className="upload-screen-container">
      {/* Hero Header */}
      <div className="upload-hero-card">
        <div className="hero-icon-badge">
          <Scale size={24} />
        </div>
        <h1 className="upload-hero-title">Compare Contract Versions</h1>
        <p className="upload-hero-subtitle">
          Select or paste two contract versions to instantly see material additions, removals, modified provisions, and risk impact side-by-side.
        </p>
      </div>

      {/* Main Comparison Upload Container */}
      <div className="upload-main-card">
        {/* Input Mode Toggle */}
        <div className="input-method-tabs">
          <button
            type="button"
            className={`method-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={18} />
            <span>Upload Document Files (.pdf, .txt)</span>
          </button>

          <button
            type="button"
            className={`method-tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
            onClick={() => setActiveTab('paste')}
          >
            <Type size={18} />
            <span>Paste Contract Versions</span>
          </button>

          <button
            type="button"
            onClick={handleTrySampleComparison}
            disabled={isLoading}
            className="method-tab-btn sample-compare-btn"
            style={{ marginLeft: 'auto', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
          >
            <Sparkles size={16} />
            <span>Try Sample Comparison</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="dual-comparison-grid">
            {/* Version 1: Original Document */}
            <div className="comparison-version-card">
              <div className="version-card-header orig-header">
                <FileCode size={18} />
                <h3>Version 1: Original Contract</h3>
              </div>

              {activeTab === 'upload' ? (
                <div>
                  {!origFile ? (
                    <div
                      className="dropzone-box compact-dropzone"
                      onClick={() => origInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={origInputRef}
                        onChange={handleOrigFileChange}
                        accept=".pdf,.txt"
                        style={{ display: 'none' }}
                      />
                      <UploadCloud size={24} className="dropzone-cloud-icon" />
                      <h4 className="dropzone-title">Original File</h4>
                      <p className="dropzone-sub">PDF or TXT up to 5MB</p>
                      <span className="btn-browse-file">Browse File</span>
                    </div>
                  ) : (
                    <div className="file-selected-card">
                      <div className="file-info-group">
                        <FileCode size={20} className="file-icon-box" />
                        <div>
                          <div className="file-name-text">{origFile.name}</div>
                          <div className="file-size-text">{(origFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => setOrigFile(null)} className="btn-remove-file">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  className="paste-text-input"
                  placeholder="Paste the original contract text here..."
                  value={origText}
                  onChange={(e) => setOrigText(e.target.value)}
                  rows={8}
                />
              )}
            </div>

            {/* Version 2: Revised Document */}
            <div className="comparison-version-card">
              <div className="version-card-header rev-header">
                <GitCompare size={18} />
                <h3>Version 2: Revised Contract</h3>
              </div>

              {activeTab === 'upload' ? (
                <div>
                  {!revFile ? (
                    <div
                      className="dropzone-box compact-dropzone"
                      onClick={() => revInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={revInputRef}
                        onChange={handleRevFileChange}
                        accept=".pdf,.txt"
                        style={{ display: 'none' }}
                      />
                      <UploadCloud size={24} className="dropzone-cloud-icon" />
                      <h4 className="dropzone-title">Revised File</h4>
                      <p className="dropzone-sub">PDF or TXT up to 5MB</p>
                      <span className="btn-browse-file">Browse File</span>
                    </div>
                  ) : (
                    <div className="file-selected-card">
                      <div className="file-info-group">
                        <FileCode size={20} className="file-icon-box" />
                        <div>
                          <div className="file-name-text">{revFile.name}</div>
                          <div className="file-size-text">{(revFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => setRevFile(null)} className="btn-remove-file">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  className="paste-text-input"
                  placeholder="Paste the revised contract text here..."
                  value={revText}
                  onChange={(e) => setRevText(e.target.value)}
                  rows={8}
                />
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="upload-error-alert" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Action Footer */}
          <div className="upload-action-footer">
            <div className="privacy-guarantee-note">
              <ShieldCheck size={16} className="privacy-shield-icon" />
              <span>Processed strictly in-memory. Zero document persistence.</span>
            </div>

            <button
              type="submit"
              className="btn-submit-analyze"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Comparing Versions...</span>
                </>
              ) : (
                <>
                  <span>Compare Contract Versions</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
