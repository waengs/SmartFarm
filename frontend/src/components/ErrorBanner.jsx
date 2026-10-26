import React from 'react';

export default function ErrorBanner({ message, type = 'error', onClose, onRetry }) {
  if (!message) return null;

  return (
    <div className={`feedback-banner ${type}`} role="alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span>{type === 'error' ? '⚠️' : '✅'}</span>
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onRetry}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="feedback-close"
            onClick={onClose}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
