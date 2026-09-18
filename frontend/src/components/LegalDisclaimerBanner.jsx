import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function LegalDisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="region" aria-label="Legal Disclaimer">
      <div className="container">
        <div className="disclaimer-content">
          <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <strong>Informational Summary Only — Not Legal Advice:</strong> ClarifyLegal translates contract text into simple language. It does not provide binding legal counsel, representation, or decision directives. Always consult a qualified lawyer.
          </span>
        </div>
      </div>
    </div>
  );
}
