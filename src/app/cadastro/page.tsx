'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta.');
      } else {
        window.localStorage.setItem('rbs_auth_user', JSON.stringify(data.user));
        router.push('/minha-conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <form
          onSubmit={handleRegister}
          className="space-y-4 rounded-2xl border border-[#E6E2DA] bg-white p-7 shadow-xs"
        >
          <h1 className="font-display text-2xl font-semibold text-[#24232A]">
            Criar conta
          </h1>
          <p className="text-xs text-[#5A5863]">
            Salve seus favoritos, acompanhe seus pedidos e aprove orçamentos personalizados.
          </p>
          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#24232A]">Nome completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#24232A]">E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#24232A]">WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#24232A]">
              Senha (mínimo 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full rounded-xl bg-[#563487] py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
          >
            {loading ? 'Criando conta...' : 'Concluir cadastro'}
          </button>
          <div className="text-center text-xs text-[#5A5863]">
            Já possui conta?{' '}
            <Link href="/login" className="font-semibold text-[#563487] hover:underline">
              Entrar
            </Link>
          </div>
        </form>
      </main>
      <StoreFooter />
    </div>
  );
}
