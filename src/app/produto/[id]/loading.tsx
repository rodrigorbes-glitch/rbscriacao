import React from 'react';

export default function ProdutoLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color, #eee)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '120px', height: '30px', backgroundColor: 'var(--border-color, #eee)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--border-color, #eee)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', marginTop: '2rem' }}>
          
          {/* Skeleton Imagem */}
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ 
              backgroundColor: 'var(--border-color, #f0f0f0)', 
              borderRadius: 'var(--radius-lg, 12px)', 
              aspectRatio: '1/1',
              animation: 'pulse 1.5s infinite'
            }} />
          </div>

          {/* Skeleton Detalhes */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ width: '80%', height: '40px', backgroundColor: 'var(--border-color, #f0f0f0)', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '40%', height: '30px', backgroundColor: 'var(--border-color, #f0f0f0)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            </div>

            <div style={{ width: '100%', height: '100px', backgroundColor: 'var(--border-color, #f0f0f0)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            
            <div style={{ width: '100%', height: '60px', backgroundColor: 'var(--border-color, #f0f0f0)', borderRadius: '8px', animation: 'pulse 1.5s infinite', marginTop: 'auto' }} />
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
