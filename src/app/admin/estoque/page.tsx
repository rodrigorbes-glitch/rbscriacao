import React from 'react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminStockActionsClient } from '@/components/AdminStockActionsClient';
import { formatBRLFromCents, formatGramsAndKg } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminEstoquePage() {
  const db = await getDb();

  const supplies = await db.query<{
    id: string;
    sku: string;
    name: string;
    category: string;
    material_type: string | null;
    color_name: string | null;
    purchase_unit: string;
    consumption_unit: string;
    conversion_factor: number;
    stock_consumption_units: number;
    reserved_consumption_units: number;
    min_threshold_units: number;
    cost_per_purchase_unit_cents: number;
    cost_per_consumption_unit_cents: string;
    supplier_name: string | null;
  }>('SELECT * FROM inventory_supplies ORDER BY id ASC');

  const balances = await db.query<{
    id: string;
    on_hand_qty: number;
    reserved_qty: number;
    min_stock_qty: number;
    product_name: string;
    sku: string;
    location_code: string;
    location_name: string;
    location_type: string;
  }>(
    `SELECT ib.*, p.name as product_name, p.sku, il.code as location_code, il.name as location_name, il.location_type
     FROM inventory_balances ib
     JOIN products p ON p.id = ib.product_id
     JOIN inventory_locations il ON il.id = ib.location_id
     ORDER BY il.code ASC, p.name ASC`
  );

  const movements = await db.query<{
    id: string;
    item_type: string;
    movement_type: string;
    quantity: number;
    unit_cost_cents: number;
    reason: string;
    actor_name: string;
    created_at: string;
  }>('SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 12');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Estoque Multi-Local & Insumos 3D
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Produtos Acabados, Filamentos (kg → g), Reservas, Consignação e Comodato
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Autoridade única de saldo por SKU e local. Bobinas compradas em quilos (kg) e consumidas em gramas (g) nas impressoras.
          </p>
        </div>
        <HelpBalloon moduleSlug="estoque" />
      </div>

      {/* Interactive Supply Purchase Form (1 kg -> +1,000 g) */}
      <AdminStockActionsClient supplies={supplies} />

      {/* 1. Filaments, Resins & Packaging Supplies */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          1. Saldo de Insumos de Manufatura 3D (Filamentos em Gramas, Resinas em ml e Embalagens)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">SKU / Insumo</th>
                <th className="py-3 pr-3">Conversão Compra→Consumo</th>
                <th className="py-3 pr-3">Saldo Físico Total</th>
                <th className="py-3 pr-3">Reservado (Fila)</th>
                <th className="py-3 pr-3">Livre p/ Impressão</th>
                <th className="py-3 pr-3">Custo Unitário</th>
                <th className="py-3 text-right">Status Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {supplies.map((s) => {
                const freeUnits = s.stock_consumption_units - s.reserved_consumption_units;
                const isCritical = s.stock_consumption_units <= s.min_threshold_units;
                return (
                  <tr key={s.id}>
                    <td className="py-3.5 pr-3">
                      <strong className="block text-[#24232A]">{s.name}</strong>
                      <span className="font-mono text-[11px] text-[#6E6B78]">
                        {s.sku} • {s.supplier_name}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-[#5A5863]">
                      1 {s.purchase_unit} = {s.conversion_factor} {s.consumption_unit}
                    </td>
                    <td className="py-3.5 pr-3 font-bold text-[#24232A]">
                      {s.consumption_unit === 'g'
                        ? formatGramsAndKg(s.stock_consumption_units)
                        : `${s.stock_consumption_units} ${s.consumption_unit}`}
                    </td>
                    <td className="py-3.5 pr-3 text-amber-900">
                      {s.reserved_consumption_units} {s.consumption_unit}
                    </td>
                    <td className="py-3.5 pr-3 font-extrabold text-emerald-800">
                      {freeUnits} {s.consumption_unit}
                    </td>
                    <td className="py-3.5 pr-3 text-[#5A5863]">
                      {formatBRLFromCents(s.cost_per_purchase_unit_cents)} / {s.purchase_unit}
                      <span className="block text-[10px] text-[#6E6B78]">
                        (R$ {(Number(s.cost_per_consumption_unit_cents) / 100).toFixed(3)} / {s.consumption_unit})
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {isCritical ? (
                        <span className="rounded-md bg-rose-500/20 border border-rose-300 px-2.5 py-1 text-[10px] font-bold text-rose-800 uppercase">
                          Estoque Crítico (&lt; {s.min_threshold_units}{s.consumption_unit})
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 uppercase">
                          Abastecido
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Authoritative Product Balances per Location (Internal vs. Consigned) */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          2. Saldos de Produtos Acabados por Local (Separando Expedição Própria vs. Ponto Físico Consignado)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">Local de Estoque</th>
                <th className="py-3 pr-3">Peça 3D / SKU</th>
                <th className="py-3 pr-3 text-center">Físico (On-Hand)</th>
                <th className="py-3 pr-3 text-center">Reservado (Pedidos)</th>
                <th className="py-3 text-right">Disponível p/ Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {balances.map((b) => {
                const avail = Math.max(0, b.on_hand_qty - b.reserved_qty);
                const isConsig = b.location_type === 'consignment_partner';
                return (
                  <tr key={b.id}>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isConsig
                            ? 'bg-[#F3EFFA] text-[#563487] border border-[#D5C6EC]'
                            : 'bg-sky-50 text-sky-900'
                        }`}
                      >
                        {b.location_code}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#5A5863]">{b.location_name}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <strong className="text-[#24232A]">{b.product_name}</strong>
                      <span className="ml-2 font-mono text-[11px] text-[#6E6B78]">{b.sku}</span>
                    </td>
                    <td className="py-3 pr-3 text-center font-bold">{b.on_hand_qty} un</td>
                    <td className="py-3 pr-3 text-center text-amber-900">{b.reserved_qty} un</td>
                    <td className="py-3 text-right font-extrabold text-emerald-800">
                      {avail} un {isConsig ? '(Consignado no Parceiro)' : '(Online RBS)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Movements Ledger */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          3. Kardex / Histórico Auditado de Movimentações de Estoque
        </h2>
        <div className="mt-4 space-y-2.5 text-xs">
          {movements.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-3.5"
            >
              <div>
                <span className="rounded bg-[#F2EFE9] px-2 py-0.5 font-mono text-[10px] font-bold text-[#563487] uppercase">
                  {m.movement_type}
                </span>
                <strong className="ml-2 text-[#24232A]">{m.reason}</strong>
                <span className="block text-[11px] text-[#6E6B78]">
                  Operador: {m.actor_name}
                </span>
              </div>
              <span className="font-mono text-sm font-extrabold text-[#24232A]">
                Qtd: {m.quantity} {m.item_type === 'supply' ? 'g/un' : 'un'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
