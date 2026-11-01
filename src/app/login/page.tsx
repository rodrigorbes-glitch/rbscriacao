'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha na autenticação.');
      } else {
        window.localStorage.setItem('rbs_auth_user', JSON.stringify(data.user));
        if (data.user.role === 'admin' || data.user.role === 'operator') {
          router.push('/admin');
        } else if (data.user.role === 'partner') {
          router.push('/parceiros');
        } else {
          router.push('/minha-conta');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-7 shadow-xs">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Acesso à conta
            </p>
            <h1 className="font-display mt-2 text-2xl font-semibold text-[#24232A]">
              Entrar na RBS Criação
            </h1>
            <p className="mt-1 text-xs text-[#5A5863]">
              Acompanhe seus pedidos, favoritos ou acesse o Painel RBS.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#24232A]">E-mail</label>
              <div className="relative mt-1.5">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E6B78]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] py-2.5 pr-3 pl-10 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24232A]">Senha</label>
              <div className="relative mt-1.5">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E6B78]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] py-2.5 pr-3 pl-10 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full rounded-xl bg-[#563487] py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Homologation Quick Profile Switcher (visível apenas em desenvolvimento/testes locais) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 rounded-xl border border-[#E6E2DA] bg-[#F2EFE9] p-4 text-xs">
              <span className="block text-[11px] font-semibold text-[#563487] uppercase">
                Perfis de demonstração (toque para preencher):
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('admin@rbscriacao.com', 'Admin@RBS2026!')}
                  className="rounded-lg border border-[#E6E2DA] bg-white p-2 text-left transition hover:border-[#563487]"
                >
                  <strong className="block text-[#24232A]">Administrador</strong>
                  <span className="text-[10px] text-[#5A5863]">admin@rbscriacao.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('operacao@rbscriacao.com', 'Operador@RBS2026!')}
                  className="rounded-lg border border-[#E6E2DA] bg-white p-2 text-left transition hover:border-[#563487]"
                >
                  <strong className="block text-[#24232A]">Operador 3D</strong>
                  <span className="text-[10px] text-[#5A5863]">operacao@rbscriacao.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('parceiro@rbscriacao.com', 'Parceiro@RBS2026!')}
                  className="rounded-lg border border-[#E6E2DA] bg-white p-2 text-left transition hover:border-[#563487]"
                >
                  <strong className="block text-[#24232A]">Parceiro</strong>
                  <span className="text-[10px] text-[#5A5863]">parceiro@rbscriacao.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('cliente@rbscriacao.com', 'Cliente@RBS2026!')}
                  className="rounded-lg border border-[#E6E2DA] bg-white p-2 text-left transition hover:border-[#563487]"
                >
                  <strong className="block text-[#24232A]">Cliente</strong>
                  <span className="text-[10px] text-[#5A5863]">cliente@rbscriacao.com</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-between text-xs text-[#5A5863]">
            <Link href="/cadastro" className="font-semibold text-[#563487] hover:underline">
              Criar conta
            </Link>
            <Link href="/recuperar-senha" className="hover:text-[#24232A]">
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
