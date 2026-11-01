import React from 'react';
import Link from 'next/link';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import {
  formatBRLFromCents,
  FINANCIAL_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminPedidosPage() {
  const db = await getDb();

  const orders = await db.query<{
    id: string;
    order_number: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    shipping_service_name: string;
    shipping_tracking_code: string | null;
    manufacturing_days: number;
    shipping_days: number;
    subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    total_cents: number;
    payment_method: string;
    financial_status: string;
    production_status: string;
    fulfillment_status: string;
    cart_selection_mode: string;
    unselected_items_preserved_count: number;
  }>('SELECT * FROM orders ORDER BY created_at DESC');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Pedidos & Expedição
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Gestão de Pedidos (Status Financeiro, Produção 3D & Expedição Desacoplados)
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Visualize o modo de compra (Carrinho Completo vs. Seleção Parcial) e acompanhe cada máquina de estado de forma independente.
          </p>
        </div>
        <HelpBalloon moduleSlug="carrinho-seletivo" />
      </div>

      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">Pedido / Modo Carrinho</th>
                <th className="py-3 pr-3">Cliente & Contato</th>
                <th className="py-3 pr-3">1. Financeiro</th>
                <th className="py-3 pr-3">2. Produção 3D</th>
                <th className="py-3 pr-3">3. Expedição</th>
                <th className="py-3 pr-3">Prazos (Fab + Frete)</th>
                <th className="py-3 text-right">Total / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {orders.map((o) => {
                const fin = FINANCIAL_STATUS_LABELS[o.financial_status] || FINANCIAL_STATUS_LABELS.pending;
                const prod = PRODUCTION_STATUS_LABELS[o.production_status] || PRODUCTION_STATUS_LABELS.queued;
                const ful = FULFILLMENT_STATUS_LABELS[o.fulfillment_status] || FULFILLMENT_STATUS_LABELS.unfulfilled;
                return (
                  <tr key={o.id}>
                    <td className="py-3.5 pr-3">
                      <span className="font-mono font-bold text-[#563487]">#{o.order_number}</span>
                      <span className="mt-0.5 block text-[10px] text-[#5A5863]">
                        {o.cart_selection_mode === 'partial'
                          ? `Seleção Parcial (${o.unselected_items_preserved_count} preservados)`
                          : 'Carrinho Completo'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <strong className="block text-[#24232A]">{o.guest_name}</strong>
                      <span className="text-[11px] text-[#5A5863]">{o.guest_email}</span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${fin.color}`}>
                        {fin.label} ({o.payment_method.toUpperCase()})
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${prod.color}`}>
                        {prod.label}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${ful.color}`}>
                        {ful.label}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-[11px] text-[#5A5863]">
                      {o.manufacturing_days}d fab + {o.shipping_days}d ({o.shipping_service_name})
                    </td>
                    <td className="py-3.5 text-right">
                      <strong className="block text-sm text-emerald-800">
                        {formatBRLFromCents(o.total_cents)}
                      </strong>
                      <Link
                        href={`/pedido/${o.id}`}
                        className="text-[11px] font-bold text-[#563487] hover:underline"
                      >
                        Abrir Pedido →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
