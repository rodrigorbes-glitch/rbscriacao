'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <form
          onSubmit={handleRecover}
          className="space-y-4 rounded-2xl border border-[#E6E2DA] bg-white p-7 shadow-xs"
        >
          <h1 className="font-display text-xl font-semibold text-[#24232A]">
            Recuperar senha
          </h1>
          <p className="text-xs text-[#5A5863]">
            Informe o e-mail cadastrado para receber as instruções de redefinição de senha.
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
            className="min-h-[44px] w-full rounded-xl bg-[#563487] py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
          >
            Enviar instruções
          </button>
          {sent && (
            <p className="text-xs font-semibold text-emerald-700">
              Instruções enviadas para {email}.
            </p>
          )}
          <div className="text-center text-xs">
            <Link href="/login" className="font-semibold text-[#563487] hover:underline">
              ← Voltar para o login
            </Link>
          </div>
        </form>
      </main>
      <StoreFooter />
    </div>
  );
}
