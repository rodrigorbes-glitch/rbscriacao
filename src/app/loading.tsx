import React from 'react';

export default function GlobalLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      backgroundColor: 'var(--bg-primary, #ffffff)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '4px solid var(--border-color, #eaeaea)',
          borderTopColor: 'var(--accent-color, #6366f1)',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{
          color: 'var(--text-secondary, #666)',
          fontSize: '14px',
          fontWeight: 500
        }}>
          Carregando...
        </span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
