import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, AlertOctagon, Scale, ArrowRight, Loader2, HelpCircle, Check, Copy } from 'lucide-react';
import { askQuestion } from '../utils/api';

export default function RightSidebar({ documentText, onSwitchToCompare, resetKey }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [inlineError, setInlineError] = useState('');

  // Clear history when document is reset / new analysis started
  useEffect(() => {
    setHistory([]);
    setQuestion('');
    setErrorMsg('');
    setInlineError('');
  }, [resetKey, documentText]);

  const PROMPT_PILLS = [
    "What does this document mean?",
    "What are the 5 most important clauses?",
    "What happens if I leave the company?",
    "Can I work on my own project?",
    "Show me the source for the 3-year clause."
  ];

  const handleAsk = async (qText) => {
    const activeQuestion = (qText || question).trim();
    if (!activeQuestion) {
      setInlineError('Please enter a question before sending.');
      return;
    }

    setInlineError('');
    setErrorMsg('');
    // Clear input field immediately after question is sent (Item 3)
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await askQuestion(activeQuestion, documentText || '');
      setHistory(prev => [
        ...prev,
        {
          id: Date.now(),
          question: activeQuestion,
          answer: response.answer,
          lawyer_followups: response.lawyer_followups || [],
          disclaimer: response.disclaimer
        }
      ]);
    } catch (err) {
      setErrorMsg(err.message || "Failed to get answer. Please check AI connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAsk(question);
  };

  const handleInputChange = (e) => {
    setQuestion(e.target.value);
    if (inlineError) setInlineError('');
  };

  return (
    <aside className="right-sidebar" aria-label="Assistant & Quick Actions">
      {/* Ask ClarifyLegal Card */}
      <div className="widget-card qa-widget">
        <div className="widget-header">
          <div className="widget-icon-bg">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="widget-title">Ask ClarifyLegal</h3>
            <p className="widget-subtitle">Get answers in simple language, with source references.</p>
          </div>
        </div>

        {/* Prompt Pills */}
        <div className="prompt-pills-container">
          {PROMPT_PILLS.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(pill)}
              disabled={isLoading}
              className="prompt-pill"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Question Form Input */}
        <form onSubmit={handleSubmit} className="qa-widget-form-container">
          <div className="qa-widget-form">
            <input
              type="text"
              className={`qa-widget-input ${inlineError ? 'is-invalid' : ''}`}
              placeholder="Type your question here..."
              value={question}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="qa-widget-send-btn"
              disabled={isLoading}
              aria-label="Send Question"
              title={isLoading ? "Thinking..." : "Send Question"}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
          {inlineError && (
            <div className="inline-input-error" role="alert">
              {inlineError}
            </div>
          )}
        </form>

        {errorMsg && (
          <div className="qa-error-alert" role="alert" aria-live="polite">
            {errorMsg}
          </div>
        )}

        {/* History Stream & Thinking Indicator */}
        {(history.length > 0 || isLoading) && (
          <div className="qa-history-stream">
            {history.map((item) => (
              <div key={item.id} className="qa-history-item">
                <div className="qa-history-q">
                  <HelpCircle size={14} />
                  <span>{item.question}</span>
                </div>
                <div className="qa-history-a">{item.answer}</div>
              </div>
            ))}

            {/* Thinking Indicator (Item 1) */}
            {isLoading && (
              <div className="qa-history-item thinking-indicator-item" aria-live="polite">
                <div className="thinking-content">
                  <Loader2 size={16} className="spin" />
                  <span>ClarifyLegal Assistant is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Not Legal Advice Card */}
      <div className="widget-card legal-warning-card">
        <div className="warning-card-header">
          <AlertOctagon size={20} className="warning-card-icon" />
          <h4 className="warning-card-title">Not Legal Advice</h4>
        </div>
        <p className="warning-card-text">
          This tool provides AI-generated legal information, not legal advice. For decisions about your situation, consult a qualified legal professional.
        </p>
      </div>

      {/* Document Comparison Card */}
      <div className="widget-card comparison-promo-card">
        <div className="comparison-card-header">
          <div className="comparison-icon-bg">
            <Scale size={20} />
          </div>
          <h4 className="comparison-card-title">Document Comparison</h4>
        </div>
        <p className="comparison-card-text">
          Upload another version to see what's changed and how it affects you.
        </p>

        <button onClick={onSwitchToCompare} className="btn-comparison-action">
          <span>Compare with another document</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </aside>
  );
}
