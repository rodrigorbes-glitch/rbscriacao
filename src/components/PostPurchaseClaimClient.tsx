'use client';

import React, { useState } from 'react';
import { UserCheck, Lock, CheckCircle2 } from 'lucide-react';

export function PostPurchaseClaimClient({
  orderId,
  claimToken,
  guestEmail,
}: {
  orderId: string;
  claimToken: string;
  guestEmail: string;
}) {
  const [password, setPassword] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_post_purchase_account',
          orderId,
          claimToken,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao vincular conta.');
      } else {
        setClaimed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (claimed) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-xs text-emerald-950">
        <div className="flex items-center gap-2 font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Conta criada e vinculada ao e-mail {guestEmail}!</span>
        </div>
        <p className="mt-1">
          Agora você pode acompanhar todas as etapas do seu pedido em Minha Conta.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleClaim}
      className="rounded-2xl border border-[#E6E2DA] bg-white p-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#24232A]">
        <UserCheck className="h-4 w-4 text-[#563487]" />
        <span>Criar conta com 1 clique (opcional)</span>
      </div>
      <p className="mt-1 text-xs text-[#5A5863]">
        Você comprou como visitante usando <strong className="text-[#24232A]">{guestEmail}</strong>.
        Defina uma senha caso queira consultar o histórico de pedidos facilmente no futuro:
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Lock className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#6E6B78]" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escolha uma senha (mínimo 6 caracteres)"
            className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] py-2.5 pr-3 pl-9 text-xs text-[#24232A] focus:border-[#563487] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#462970]"
        >
          {loading ? 'Salvando...' : 'Salvar senha'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </form>
  );
}
