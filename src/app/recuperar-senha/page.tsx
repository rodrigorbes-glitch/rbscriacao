'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

function RecuperarSenhaContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_password_reset', email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro ao solicitar recuperação.' });
      } else {
        setFeedback({
          type: data.emailConfigured ? 'success' : 'info',
          text: data.message,
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', text: 'A nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'As senhas informadas não coincidem.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_password_reset',
          token: tokenFromUrl,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Link inválido ou expirado.' });
      } else {
        setFeedback({ type: 'success', text: data.message });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      {tokenFromUrl ? (
        <form
          onSubmit={handleConfirmReset}
          className="space-y-4 rounded-2xl border border-[#E6E2DA] bg-white p-7 shadow-xs"
        >
          <h1 className="font-display text-xl font-semibold text-[#24232A]">
            Definir nova senha
          </h1>
          <p className="text-xs text-[#5A5863]">
            Crie uma nova senha segura com pelo menos 8 caracteres.
          </p>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (mínimo 8 caracteres)"
            className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar nova senha"
            className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full rounded-xl bg-[#563487] py-3 text-sm font-semibold text-white transition hover:bg-[#462970] disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
          {feedback && (
            <p
              className={`text-xs font-semibold ${
                feedback.type === 'error' ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {feedback.text}
            </p>
          )}
          <div className="text-center text-xs">
            <Link href="/login" className="font-semibold text-[#563487] hover:underline">
              ← Voltar para o login
            </Link>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleRequestReset}
          className="space-y-4 rounded-2xl border border-[#E6E2DA] bg-white p-7 shadow-xs"
        >
          <h1 className="font-display text-xl font-semibold text-[#24232A]">
            Recuperar senha
          </h1>
          <p className="text-xs text-[#5A5863]">
            Informe o e-mail cadastrado para receber um link seguro de redefinição de senha.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full rounded-xl bg-[#563487] py-3 text-sm font-semibold text-white transition hover:bg-[#462970] disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar instruções'}
          </button>
          {feedback && (
            <p
              className={`text-xs font-semibold ${
                feedback.type === 'error'
                  ? 'text-red-600'
                  : feedback.type === 'info'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {feedback.text}
            </p>
          )}
          <div className="text-center text-xs">
            <Link href="/login" className="font-semibold text-[#563487] hover:underline">
              ← Voltar para o login
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />
      <Suspense fallback={<div className="flex-1" />}>
        <RecuperarSenhaContent />
      </Suspense>
      <StoreFooter />
    </div>
  );
}
