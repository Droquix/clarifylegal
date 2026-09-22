import React from 'react';
import { Shield, LayoutDashboard, UploadCloud, Scale, Lightbulb, ShieldCheck } from 'lucide-react';

export default function Sidebar({ activeNav, setActiveNav }) {
  return (
    <aside className="app-sidebar" role="navigation" aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Shield size={22} className="brand-shield-icon" />
        </div>
        <div className="brand-text-wrapper">
          <div className="brand-title">ClarifyLegal</div>
          <div className="brand-subtitle">Understand · Compare · Move Forward</div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveNav('dashboard')}
          aria-current={activeNav === 'dashboard' ? 'page' : undefined}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`sidebar-nav-item ${activeNav === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveNav('upload')}
          aria-current={activeNav === 'upload' ? 'page' : undefined}
        >
          <UploadCloud size={18} />
          <span>Upload Document</span>
        </button>

        <button
          className={`sidebar-nav-item ${activeNav === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveNav('compare')}
          aria-current={activeNav === 'compare' ? 'page' : undefined}
        >
          <Scale size={18} />
          <span>Compare Documents</span>
        </button>
      </nav>

      {/* Bottom Sidebar Widgets */}
      <div className="sidebar-footer">
        <div className="sidebar-tip-card">
          <div className="tip-header">
            <Lightbulb size={16} className="tip-icon" />
            <span>Quick Tip</span>
          </div>
          <p className="tip-text">
            You can ask questions in plain English. I'll find the relevant parts of your document and explain them simply.
          </p>
        </div>

        <div className="sidebar-privacy-card">
          <ShieldCheck size={18} className="privacy-icon" />
          <div className="privacy-text-wrapper">
            <div className="privacy-title">Your privacy matters</div>
            <div className="privacy-subtitle">We don't store your documents permanently.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
