import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LegalDisclaimerBanner from './components/LegalDisclaimerBanner';
import DocumentUpload from './components/DocumentUpload';
import AnalysisDashboard from './components/AnalysisDashboard';
import { analyzeFile, analyzeText } from './utils/api';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('clarify_theme') || 'dark');
  const [analysisData, setAnalysisData] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze file. Please check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeText = async (text) => {
    setIsLoading(true);
    setErrorMsg('');
    setOriginalText(text);
    try {
      const data = await analyzeText(text);
      setAnalysisData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze legal text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setOriginalText('');
    setErrorMsg('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header theme={theme} toggleTheme={toggleTheme} />
      <LegalDisclaimerBanner />

      <main id="main-content" style={{ flex: 1 }}>
        {!analysisData ? (
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

            {errorMsg && (
              <div className="container" style={{ maxWidth: '800px', marginBottom: '2rem' }}>
                <div role="alert" style={{ backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', border: '1px solid var(--risk-high-border)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              </div>
            )}
          </div>
        ) : (
          <AnalysisDashboard
            analysisData={analysisData}
            originalText={originalText}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <div className="container">
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            ClarifyLegal — Privacy-First Legal Document Simplifier
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Zero Document Storage Guarantee • Powered by Google Gemini 2.0 Flash • Informational Tool Only (Not Legal Advice)
          </p>
        </div>
      </footer>
    </div>
  );
}
