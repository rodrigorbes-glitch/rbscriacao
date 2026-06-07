'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { user, isOffline } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, redireciona para o dashboard
  if (user) {
    router.replace('/minha-conta');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setError('Sem conexão com a internet. Tente novamente quando estiver online.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirecionamento gerido pelo AuthContext ou a página destino (se tiver callbackUrl)
      router.push('/minha-conta');
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    }
  };

  return (
    <div className="public-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="public-header" style={{ justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '2rem', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-secondary)' }} onClick={() => router.push('/')}>
          &larr; Voltar
        </div>
        <div className="public-logo">Aura Premium</div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '450px', width: '100%' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>Bem-vindo(a) de volta!</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Faça login para acompanhar seus pedidos.</p>

          {error && (
            <div style={{ backgroundColor: 'var(--color-danger)', color: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Input 
              type="email" 
              label="E-mail" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
            
            <div>
              <Input 
                type="password" 
                label="Senha" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <a href="#" style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>Esqueci minha senha</a>
              </div>
            </div>

            <Button type="submit" isLoading={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
              Entrar
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Ainda não tem conta? <Link href="/minha-conta/cadastro" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}>Criar Conta</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
