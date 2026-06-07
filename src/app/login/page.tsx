'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Se sucesso, redireciona para o admin
      router.push('/admin');
    } catch (err: any) {
      console.error(err);
      // Tratamento amigável de erros do Firebase
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('E-mail ou senha incorretos.');
          break;
        case 'auth/email-already-in-use':
          setError('Este e-mail já está cadastrado.');
          break;
        case 'auth/weak-password':
          setError('A senha deve ter pelo menos 6 caracteres.');
          break;
        case 'auth/invalid-email':
          setError('E-mail inválido.');
          break;
        default:
          setError('Ocorreu um erro. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="card">
        <div className="login-header">
          <h1>{isLogin ? 'Entrar' : 'Criar Conta'}</h1>
          <p className="subtitle">
            {isLogin
              ? 'Acesse o painel da RBS Criação'
              : 'Cadastre-se para acessar a plataforma'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {error && (
            <div className="status-badge status-badge--danger mt-4 w-full" style={{ justifyContent: 'center' }}>
              {error}
            </div>
          )}

          <div className="mt-6">
            <Button type="submit" isLoading={loading}>
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </div>
        </form>

        <div className="divider">ou</div>

        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
          {' '}
          <span
            className="text-link"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </span>
        </p>
      </div>
    </main>
  );
}
