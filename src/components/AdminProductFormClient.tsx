'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, CheckCircle2 } from 'lucide-react';

export function AdminProductFormClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [material, setMaterial] = useState('PLA');
  const [priceBrl, setPriceBrl] = useState('119.90');
  const [costBrl, setCostBrl] = useState('34.50');
  const [filamentGrams, setFilamentGrams] = useState('185');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [stockQty, setStockQty] = useState('10');
  const [feedback, setFeedback] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_product',
        name,
        sku,
        material,
        priceBrl: Number(priceBrl),
        costBrl: Number(costBrl),
        filamentGrams: Number(filamentGrams),
        leadTimeDays: Number(leadTimeDays),
        stockQty: Number(stockQty),
      }),
    });
    if (res.ok) {
      setName('');
      setSku('');
      setFeedback('Nova peça 3D publicada no catálogo e saldo inicial registrado em LOC-EXP!');
      router.refresh();
    }
  };

  return (
    <form
      onSubmit={handleCreate}
      className="space-y-4 rounded-3xl border border-[#E6E2DA] bg-white p-6"
    >
      <h2 className="flex items-center gap-2 text-base font-extrabold text-[#24232A]">
        <PlusCircle className="h-5 w-5 text-[#563487]" />
        Cadastrar Nova Peça 3D no Catálogo
      </h2>
      {feedback && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          {feedback}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
        <div className="sm:col-span-2">
          <label className="block font-bold text-[#5A5863]">Nome da Peça 3D *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Suporte Echo Dot Gen5 Geométrico"
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">SKU</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="RBS-DEC-009"
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">Material Principal</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          >
            <option value="PLA">PLA / PLA Seda</option>
            <option value="PETG">PETG Carbon</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU Flexível</option>
            <option value="Resina">Resina 8K</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">Preço Venda (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            value={priceBrl}
            onChange={(e) => setPriceBrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">Custo Direto (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            value={costBrl}
            onChange={(e) => setCostBrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">Consumo Filamento (g)</label>
          <input
            type="number"
            required
            value={filamentGrams}
            onChange={(e) => setFilamentGrams(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
        <div>
          <label className="block font-bold text-[#5A5863]">Estoque Inicial (un)</label>
          <input
            type="number"
            required
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#462970]"
      >
        Publicar Produto no Catálogo
      </button>
    </form>
  );
}
