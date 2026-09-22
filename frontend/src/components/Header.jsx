import React from 'react';
import { Scale, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Header({ theme, toggleTheme }) {
  return (
    <header className="app-header" role="banner">
      <div className="container">
        <div className="header-nav">
          <a href="/" className="brand-logo" aria-label="ClarifyLegal Home">
            <div className="brand-icon">
              <Scale size={22} aria-hidden="true" />
            </div>
            <span>ClarifyLegal</span>
          </a>

          <div className="header-badges">
            <div className="privacy-badge" title="ClarifyLegal does not save documents in an application database. Analysis is performed by the configured AI provider.">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>No App Database Storage</span>
            </div>

            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
