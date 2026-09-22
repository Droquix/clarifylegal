import React, { useState } from 'react';
import { MessageSquare, Send, Loader2, HelpCircle, AlertCircle } from 'lucide-react';
import { askQuestion } from '../utils/api';

export default function DocumentQA({ documentText }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [inlineError, setInlineError] = useState('');

  const SUGGESTED_QUESTIONS = [
    "Can I terminate this agreement early without penalty?",
    "What happens if I accidentally disclose confidential information?",
    "Are there any hidden fees, renewal terms, or financial penalties?",
    "Who owns the intellectual property and code created under this contract?"
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
          citations: response.citations || [],
          disclaimer: response.disclaimer
        }
      ]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to get answer. Please check backend connection.');
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
    <section className="qa-box" aria-label="Interactive Document Assistant">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <MessageSquare size={22} style={{ color: 'var(--accent-primary)' }} />
        <h2 style={{ fontSize: '1.3rem' }}>Ask ClarifyLegal Assistant</h2>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Have a specific question about your contract? Ask anything and get an informational plain-English answer grounded directly in your document.
      </p>

      {/* Suggested Questions */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
          Suggested Questions:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SUGGESTED_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(sq)}
              disabled={isLoading}
              style={{
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem 0.75rem',
                color: 'var(--text-secondary)',
                textAlign: 'left'
              }}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Q&A Input form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <div className="qa-input-wrapper">
          <input
            type="text"
            className={`qa-input ${inlineError ? 'is-invalid' : ''}`}
            placeholder="Type your question about this document..."
            value={question}
            onChange={handleInputChange}
            maxLength={1000}
            disabled={isLoading}
            aria-label="Type your question about this document"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            title={isLoading ? "Thinking..." : "Ask Question"}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <Send size={16} />
              </>
            )}
          </button>
        </div>
        {inlineError && (
          <div className="inline-input-error" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>
            {inlineError}
          </div>
        )}
      </form>

      {errorMsg && (
        <div role="alert" style={{ color: 'var(--risk-high-text)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Q&A History Conversation Stream */}
      {(history.length > 0 || isLoading) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HelpCircle size={16} />
                <span>Q: {item.question}</span>
              </div>

              <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '0.75rem' }}>
                {item.answer}
              </div>

              {item.citations && item.citations.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--risk-low-border)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Supporting text from this document:
                  </div>
                  {item.citations.map((citation, citationIndex) => (
                    <blockquote key={citationIndex} style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', paddingLeft: '0.75rem', borderLeft: '2px solid var(--border-color)' }}>
                      “{citation}”
                    </blockquote>
                  ))}
                </div>
              )}

              {item.lawyer_followups && item.lawyer_followups.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Suggested follow-ups for your lawyer:
                  </div>
                  <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                    {item.lawyer_followups.map((fq, fidx) => (
                      <li key={fidx}>{fq}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} />
                <span>{item.disclaimer}</span>
              </div>
            </div>
          ))}

          {/* Thinking Indicator (Item 1) */}
          {isLoading && (
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                border: '1px solid var(--accent-blue-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: 'var(--accent-blue)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <Loader2 size={18} className="spin" />
              <span>ClarifyLegal Assistant is analyzing your question...</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
