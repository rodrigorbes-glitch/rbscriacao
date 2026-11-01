'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackagePlus, CheckCircle2 } from 'lucide-react';

export function AdminStockActionsClient({
  supplies,
}: {
  supplies: Array<{ id: string; sku: string; name: string; purchase_unit: string; consumption_unit: string }>;
}) {
  const router = useRouter();
  const [supplyId, setSupplyId] = useState(supplies[0]?.id || 'sup-pla-terracota');
  const [purchaseQty, setPurchaseQty] = useState('1');
  const [unitPurchaseCostBrl, setUnitPurchaseCostBrl] = useState('120.00');
  const [supplierName, setSupplierName] = useState('3D Prime Filamentos Brasil');
  const [paidImmediately, setPaidImmediately] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('');
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase_supply',
          supplyId,
          purchaseQty: Number(purchaseQty),
          unitPurchaseCostBrl: Number(unitPurchaseCostBrl),
          supplierName,
          paidImmediately,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(
          `Compra registrada! Entrada de +${data.addedConsumptionUnits} g no estoque de insumos (Novo saldo: ${data.newBalanceUnits} g) + Conta a Pagar gerada no Financeiro.`
        );
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handlePurchase}
      className="space-y-4 rounded-3xl border border-[#D5C6EC] bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#24232A]">
            <PackagePlus className="h-5 w-5 text-[#563487]" />
            Registrar Compra de Insumo / Filamento (Conversão Automática 1 kg → 1.000 g)
          </h2>
          <p className="text-xs text-[#5A5863]">
            Gera simultaneamente a entrada física em gramas/ml no local LOC-FAB e o título de Contas a Pagar no Financeiro.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
        <div className="sm:col-span-2">
          <label className="block font-bold text-[#5A5863]">Insumo / Bobina 3D</label>
          <select
            value={supplyId}
            onChange={(e) => setSupplyId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2.5 text-[#24232A]"
          >
            {supplies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sku} — {s.name} (Compra em {s.purchase_unit} → Consumo em {s.consumption_unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-[#5A5863]">Qtd Comprada (kg/L/un)</label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={purchaseQty}
            onChange={(e) => setPurchaseQty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2.5 text-[#24232A]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#5A5863]">Custo por kg/L (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            value={unitPurchaseCostBrl}
            onChange={(e) => setUnitPurchaseCostBrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2.5 text-[#24232A]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 text-xs text-[#5A5863]">
          <input
            type="checkbox"
            checked={paidImmediately}
            onChange={(e) => setPaidImmediately(e.target.checked)}
            className="accent-[#563487]"
          />
          Liquidar pagamento imediatamente no Caixa/Banco
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#462970]"
        >
          {loading ? 'Convertendo e Lançando...' : 'Dar Entrada no Estoque (+1.000 g / kg) & Gerar Conta'}
        </button>
      </div>
    </form>
  );
}
