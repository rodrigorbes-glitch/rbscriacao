'use client';

import React, { useState, useEffect } from 'react';
import { HelpBalloon } from '@/components/HelpBalloon';
import { formatBRLFromCents } from '@/lib/format';

interface QuoteItem {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  project_title: string;
  description: string;
  intended_use: string;
  preferred_material: string;
  preferred_color: string;
  quantity: number;
  file_name: string | null;
  file_checksum_sha256: string | null;
  file_private_path: string | null;
  status: string;
  quoted_price_cents: number | null;
  quoted_manufacturing_days: number | null;
}

export default function AdminOrcamentosPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [priceBrl, setPriceBrl] = useState('185.00');
  const [days, setDays] = useState('3');
  const [feedback, setFeedback] = useState('');

  const load = async () => {
    const res = await fetch('/api/quotes');
    if (res.ok) {
      const data = await res.json();
      setQuotes(data.quotes || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendProposal = async (quoteId: string) => {
    await fetch('/api/quotes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        status: 'quoted',
        quotedPriceCents: Math.round(Number(priceBrl) * 100),
        quotedManufacturingDays: Number(days),
        message: `Proposta técnica emitida: R$ ${priceBrl} com prazo de ${days} dias úteis.`,
      }),
    });
    setFeedback('Proposta enviada e status atualizado para "Orçamento Disponível"!');
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Orçamentos Sob Medida (.STL / .STEP)
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Central de Engenharia & Propostas de Personalizados
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Inspecione arquivos 3D armazenados em diretório privado, confira o hash SHA-256 e emita propostas formais.
          </p>
        </div>
        <HelpBalloon moduleSlug="precificador" />
      </div>

      {feedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {quotes.map((q) => (
          <div
            key={q.id}
            className="rounded-3xl border border-[#E6E2DA] bg-white p-6 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E2DA] pb-3">
              <div>
                <span className="font-mono text-sm font-bold text-[#563487]">
                  #{q.quote_number}
                </span>
                <strong className="ml-3 text-base text-[#24232A]">{q.project_title}</strong>
              </div>
              <span className="rounded-md bg-[#F2EFE9] px-3 py-1 font-bold text-emerald-800 uppercase">
                Status: {q.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-1 text-[#5A5863]">
                <strong className="block text-[#24232A]">Dados do Solicitante:</strong>
                <p>Nome: {q.client_name}</p>
                <p>E-mail: {q.client_email} • Tel: {q.client_phone}</p>
                <p>Polímero: {q.preferred_material} ({q.preferred_color}) • Qtd: {q.quantity} un</p>
              </div>

              <div className="space-y-1 text-[#5A5863]">
                <strong className="block text-[#24232A]">Arquivo 3D & Segurança:</strong>
                <p>Arquivo: <code>{q.file_name || 'Sem anexo'}</code></p>
                {q.file_private_path && <p>Path Isolado: <code>{q.file_private_path}</code></p>}
                {q.file_checksum_sha256 && (
                  <p className="truncate font-mono text-[10px] text-[#6E6B78]">
                    SHA-256: {q.file_checksum_sha256}
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
                <strong className="block text-[#563487]">Emitir / Atualizar Proposta:</strong>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={priceBrl}
                    onChange={(e) => setPriceBrl(e.target.value)}
                    placeholder="Preço R$"
                    className="w-28 rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-[#24232A]"
                  />
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    placeholder="Dias fab."
                    className="w-20 rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-[#24232A]"
                  />
                  <button
                    type="button"
                    onClick={() => sendProposal(q.id)}
                    className="flex-1 rounded-lg bg-[#563487] px-3 py-1.5 font-bold text-white hover:bg-[#462970]"
                  >
                    Enviar Orçamento
                  </button>
                </div>
                {q.quoted_price_cents && (
                  <p className="text-emerald-800 font-bold">
                    Valor atual cotado: {formatBRLFromCents(q.quoted_price_cents)} ({q.quoted_manufacturing_days}d úteis)
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
