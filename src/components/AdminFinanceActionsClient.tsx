'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, CheckCircle2, Scale } from 'lucide-react';

export function AdminFinanceActionsClient({
  receivableEntries,
}: {
  receivableEntries: Array<{
    id: string;
    entry_code: string;
    description: string;
    fee_estimated_cents: number;
    fee_actual_cents: number | null;
  }>;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<'payable' | 'receivable'>('payable');
  const [description, setDescription] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [amountBrl, setAmountBrl] = useState('');
  const [paidImmediately, setPaidImmediately] = useState(false);

  const [selectedRecId, setSelectedRecId] = useState(receivableEntries[0]?.id || '');
  const [actualFeeBrl, setActualFeeBrl] = useState('12.15');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_financial_entry',
        direction,
        description,
        counterpartyName,
        amountBrl: Number(amountBrl),
        paidImmediately,
      }),
    });
    if (res.ok) {
      setDescription('');
      setCounterpartyName('');
      setAmountBrl('');
      setFeedback('Lançamento financeiro registrado com sucesso!');
      router.refresh();
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reconcile_fee',
        entryId: selectedRecId,
        actualFeeBrl: Number(actualFeeBrl),
        notes: reconcileNotes,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setFeedback(
        `Taxa conciliada! Divergência apurada: R$ ${(data.feeDivergenceCents / 100).toFixed(2)}.`
      );
      router.refresh();
    }
  };

  const handleSettle = async (entryId: string) => {
    await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle_financial_entry', entryId }),
    });
    setFeedback('Baixa de título realizada com sucesso!');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* New Financial Entry Form */}
        <form
          onSubmit={handleCreateEntry}
          className="space-y-3 rounded-3xl border border-[#E6E2DA] bg-white p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#24232A]">
            <PlusCircle className="h-4 w-4 text-[#563487]" />
            Novo Lançamento (Contas a Pagar ou Receber)
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'payable' | 'receivable')}
              className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
            >
              <option value="payable">Conta a Pagar (Saída)</option>
              <option value="receivable">Conta a Receber (Entrada)</option>
            </select>
            <input
              type="number"
              step="0.01"
              required
              value={amountBrl}
              onChange={(e) => setAmountBrl(e.target.value)}
              placeholder="Valor R$ (ex: 185.00)"
              className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
            />
          </div>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (ex: Manutenção Bico Hardened Steel Bambu X1C)"
            className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
          />
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder="Fornecedor / Contraparte"
              className="flex-1 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
            />
            <label className="flex items-center gap-1.5 text-xs text-[#5A5863]">
              <input
                type="checkbox"
                checked={paidImmediately}
                onChange={(e) => setPaidImmediately(e.target.checked)}
                className="accent-[#563487]"
              />
              Já pago/liquidado
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#563487] py-2.5 text-xs font-bold text-white hover:bg-[#462970]"
          >
            Registrar Lançamento Financeiro
          </button>
        </form>

        {/* Gateway Fee Reconciliation Form */}
        <form
          onSubmit={handleReconcile}
          className="space-y-3 rounded-3xl border border-[#E6E2DA] bg-white p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#24232A]">
            <Scale className="h-4 w-4 text-sky-800" />
            Conciliar Taxa Real do Gateway (Prevista vs. Real)
          </h3>
          <p className="text-xs text-[#5A5863]">
            Compare a taxa estimada no momento do pedido com a tarifa efetivamente descontada pelo Mercado Pago.
          </p>
          <select
            value={selectedRecId}
            onChange={(e) => setSelectedRecId(e.target.value)}
            className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
          >
            {receivableEntries.map((r) => (
              <option key={r.id} value={r.id}>
                {r.entry_code} — {r.description.slice(0, 42)} (Taxa prev: R${' '}
                {(r.fee_estimated_cents / 100).toFixed(2)})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <input
              type="number"
              step="0.01"
              required
              value={actualFeeBrl}
              onChange={(e) => setActualFeeBrl(e.target.value)}
              placeholder="Taxa Real Descontada (R$)"
              className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
            />
            <input
              type="text"
              value={reconcileNotes}
              onChange={(e) => setReconcileNotes(e.target.value)}
              placeholder="Observação do extrato"
              className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500"
          >
            Executar Conciliação de Taxa
          </button>
        </form>
      </div>
    </div>
  );
}

export function QuickSettleButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const settle = async () => {
    setBusy(true);
    await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle_financial_entry', entryId }),
    });
    setBusy(false);
    router.refresh();
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={settle}
      className="rounded-lg bg-emerald-600/20 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-600/30"
    >
      {busy ? '...' : 'Dar Baixa'}
    </button>
  );
}
