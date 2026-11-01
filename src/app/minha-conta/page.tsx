import React from 'react';
import Link from 'next/link';
import {
  Package,
  FileCode2,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  BellRing,
} from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import {
  formatBRLFromCents,
  FINANCIAL_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MinhaContaPage() {
  const db = await getDb();

  const orders = await db.query<{
    id: string;
    order_number: string;
    guest_name: string;
    total_cents: number;
    financial_status: string;
    production_status: string;
    fulfillment_status: string;
    shipping_tracking_code: string | null;
    manufacturing_days: number;
    shipping_days: number;
  }>('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6');

  const quotes = await db.query<{
    id: string;
    quote_number: string;
    project_title: string;
    preferred_material: string;
    status: string;
    quoted_price_cents: number | null;
  }>('SELECT * FROM custom_quotes ORDER BY created_at DESC LIMIT 4');

  const addresses = await db.query<{
    id: string;
    label: string;
    recipient_name: string;
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  }>('SELECT * FROM customer_addresses ORDER BY is_default DESC');

  const alerts = await db.query<{
    id: string;
    alert_type: string;
    target_price_cents: number | null;
    channel: string;
    status: string;
    product_name: string;
  }>(
    `SELECT ia.*, p.name as product_name
     FROM interest_alerts ia
     JOIN products p ON p.id = ia.product_id
     ORDER BY ia.created_at DESC`
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Espaço do cliente
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-[#24232A] sm:text-3xl">
              Minha conta e pedidos
            </h1>
            <p className="mt-1 text-sm text-[#5A5863]">
              Acompanhe o pagamento, o preparo no estúdio e a entrega das suas peças.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-4 py-2.5 text-xs font-semibold text-[#24232A] hover:border-[#563487] hover:text-[#563487]"
            >
              Trocar perfil
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#563487] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#462970]"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Painel RBS (Área autorizada)</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Orders History */}
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                  <Package className="h-5 w-5 text-[#563487]" />
                  <span>Meus pedidos</span>
                </h2>
                <Link
                  href="/catalogo"
                  className="text-xs font-semibold text-[#563487] hover:underline"
                >
                  Ver catálogo →
                </Link>
              </div>

              <div className="mt-4 space-y-4">
                {orders.map((ord) => {
                  const fin =
                    FINANCIAL_STATUS_LABELS[ord.financial_status] ||
                    FINANCIAL_STATUS_LABELS.pending;
                  const prod =
                    PRODUCTION_STATUS_LABELS[ord.production_status] ||
                    PRODUCTION_STATUS_LABELS.queued;
                  const ful =
                    FULFILLMENT_STATUS_LABELS[ord.fulfillment_status] ||
                    FULFILLMENT_STATUS_LABELS.unfulfilled;
                  return (
                    <div
                      key={ord.id}
                      className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-sm font-bold text-[#24232A]">
                            #{ord.order_number}
                          </span>
                          <span className="ml-2 text-[#5A5863]">({ord.guest_name})</span>
                        </div>
                        <span className="font-display text-sm font-bold text-[#24232A]">
                          {formatBRLFromCents(ord.total_cents)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${fin.color}`}
                        >
                          Pagamento: {fin.label}
                        </span>
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${prod.color}`}
                        >
                          Estúdio: {prod.label}
                        </span>
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${ful.color}`}
                        >
                          Entrega: {ful.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E6E2DA] pt-3 text-[#5A5863]">
                        <span>
                          Preparo: {ord.manufacturing_days}d + Envio: {ord.shipping_days}d
                          {ord.shipping_tracking_code
                            ? ` • Rastreio: ${ord.shipping_tracking_code}`
                            : ''}
                        </span>
                        <Link
                          href={`/pedido/${ord.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-[#563487] hover:underline"
                        >
                          <span>Ver detalhes</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                  <FileCode2 className="h-5 w-5 text-[#563487]" />
                  <span>Orçamentos personalizados</span>
                </h2>
                <Link
                  href="/personalizados"
                  className="text-xs font-semibold text-[#563487] hover:underline"
                >
                  Novo pedido personalizado →
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#563487]">#{q.quote_number}</span>
                      <strong className="mt-0.5 block text-sm text-[#24232A]">
                        {q.project_title}
                      </strong>
                      <span className="text-[#5A5863]">Material: {q.preferred_material}</span>
                    </div>
                    <div className="text-right">
                      {q.quoted_price_cents ? (
                        <span className="block text-sm font-bold text-[#24232A]">
                          {formatBRLFromCents(q.quoted_price_cents)}
                        </span>
                      ) : (
                        <span className="block text-[#5A5863]">Em análise</span>
                      )}
                      <Link
                        href="/personalizados"
                        className="mt-1 inline-block text-xs font-semibold text-[#563487] hover:underline"
                      >
                        Abrir orçamento →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Addresses & Interest Alerts */}
          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                <MapPin className="h-5 w-5 text-[#563487]" />
                <span>Endereços salvos</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
                    <strong className="text-[#24232A]">
                      {a.label} — {a.recipient_name}
                    </strong>
                    <p className="mt-1 text-[#5A5863]">
                      {a.street}, {a.number} {a.complement ? `(${a.complement})` : ''}
                      <br />
                      {a.neighborhood} • {a.city}/{a.state} • CEP {a.cep}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                <BellRing className="h-5 w-5 text-[#563487]" />
                <span>Avisos de produtos</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                {alerts.map((al) => (
                  <div key={al.id} className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3.5">
                    <strong className="block text-[#24232A]">{al.product_name}</strong>
                    <span className="text-[11px] text-[#5A5863]">
                      {al.alert_type === 'price_drop' ? 'Aviso de promoção' : 'Aviso de reposição'}{' '}
                      • Canal: {al.channel}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
