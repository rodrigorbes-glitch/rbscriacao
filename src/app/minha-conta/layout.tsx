'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se não estiver carregando, não tiver usuário logado, e a rota NÃO for login/cadastro
    if (!loading && !user) {
      if (pathname !== '/minha-conta/login' && pathname !== '/minha-conta/cadastro') {
        router.replace('/minha-conta/login');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="auth-spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Verificando segurança...</p>
      </div>
    );
  }

  // Se for página de login/cadastro, renderiza direto
  if (!user && (pathname === '/minha-conta/login' || pathname === '/minha-conta/cadastro')) {
    return <>{children}</>;
  }

  // Se for página protegida e não tiver usuário (antes do redirect), não renderiza nada
  if (!user) {
    return null;
  }

  // Header Protegido do Dashboard B2C
  return (
    <div className="public-layout" style={{ minHeight: '100vh' }}>
      <header className="public-header" style={{ justifyContent: 'space-between', padding: '0 2rem' }}>
        <div className="public-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>Aura Premium</div>
        <nav style={{ display: 'flex', gap: '1.5rem', fontWeight: 600 }}>
          <a href="/minha-conta" style={{ color: 'var(--color-text-primary)' }}>Dashboard</a>
          <a href="/" style={{ color: 'var(--color-text-secondary)' }}>Ir para a Loja</a>
        </nav>
      </header>
      <main style={{ flex: 1, backgroundColor: 'var(--color-bg-main)' }}>
        {children}
      </main>
    </div>
  );
}
