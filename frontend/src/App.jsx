import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import DocumentUpload from './components/DocumentUpload';
import { analyzeFile, analyzeText } from './utils/api';
import { Sun, Moon, AlertTriangle } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from './utils/sampleData';

// Lazy-load non-initial dashboard components to optimize initial JS bundle size
const AnalysisDashboard = lazy(() => import('./components/AnalysisDashboard'));
const DocumentComparison = lazy(() => import('./components/DocumentComparison'));
const RightSidebar = lazy(() => import('./components/RightSidebar'));

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('clarify_theme') || 'light');
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'upload' | 'compare'
  const [analysisData, setAnalysisData] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetKey, setResetKey] = useState(0);

  // Initialize sample document analysis on mount if no active analysis exists
  useEffect(() => {
    setIsLoading(false);
    if (!analysisData) {
      handleAnalyzeText(SAMPLE_DOCUMENTS[0].text);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clarify_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleAnalyzeFile = async (file) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await analyzeFile(file);
      setAnalysisData(data);
      if (data.extracted_text) {
        setOriginalText(data.extracted_text);
      }
      setActiveNav('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze file. Please check file format or backend API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeText = async (text) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await analyzeText(text);
      setAnalysisData(data);
      setOriginalText(data.extracted_text || text);
      setActiveNav('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze legal text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setOriginalText('');
    setErrorMsg('');
    setResetKey(prev => prev + 1);
    setActiveNav('upload');
  };

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      {/* 2. Center Main Workspace Column */}
      <div className="main-content-wrapper">
        <header className="top-theme-header">
          <button
            onClick={toggleTheme}
            className="theme-switch-btn"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <main id="main-content" className="center-workspace">
          {errorMsg && (
            <div className="error-alert-banner" role="alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={20} className="error-alert-icon" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg('')}
                className="btn-dismiss-alert"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

          <Suspense fallback={
            <div className="loading-state-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading ClarifyLegal Module...
            </div>
          }>
            {activeNav === 'upload' ? (
              <div>
                <section className="hero-section container">
                  <h1 className="hero-title">
                    Understand Your Legal Documents in <span style={{ color: 'var(--accent-primary)' }}>Plain English</span>
                  </h1>
                  <p className="hero-subtitle">
                    Upload your contract, lease, or NDA. ClarifyLegal highlights key obligations, hidden red flags, and potential risks in simple terms with zero file persistence.
                  </p>
                </section>

                <DocumentUpload
                  onAnalyzeFile={handleAnalyzeFile}
                  onAnalyzeText={handleAnalyzeText}
                  isLoading={isLoading}
                />
              </div>
            ) : activeNav === 'compare' ? (
              <DocumentComparison />
            ) : (
              <AnalysisDashboard
                analysisData={analysisData}
                onReset={handleReset}
                isLoading={isLoading}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* 3. Right Sidebar Column */}
      <Suspense fallback={null}>
        <RightSidebar
          documentText={originalText}
          onSwitchToCompare={() => setActiveNav('compare')}
          resetKey={resetKey}
        />
      </Suspense>
    </div>
  );
}
