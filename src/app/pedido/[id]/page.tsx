import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { PostPurchaseClaimClient } from '@/components/PostPurchaseClaimClient';
import {
  formatBRLFromCents,
  FINANCIAL_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PedidoConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ claim?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();

  const ordRows = await db.query<{
    id: string;
    order_number: string;
    user_id: string | null;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    shipping_address_json: string;
    shipping_service_name: string;
    shipping_carrier: string;
    shipping_tracking_code: string | null;
    shipping_days: number;
    manufacturing_days: number;
    total_estimated_days: number;
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
    post_purchase_claim_token: string | null;
    created_at: string;
  }>('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [id]);

  if (ordRows.length === 0) {
    notFound();
  }
  const order = ordRows[0];

  const items = await db.query<{
    id: string;
    sku_snapshot: string;
    product_name_snapshot: string;
    variation_label_snapshot: string | null;
    material_snapshot: string;
    quantity: number;
    unit_price_cents: number;
    custom_text: string | null;
  }>('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

  const finBadge =
    FINANCIAL_STATUS_LABELS[order.financial_status] || FINANCIAL_STATUS_LABELS.pending;
  const prodBadge =
    PRODUCTION_STATUS_LABELS[order.production_status] || PRODUCTION_STATUS_LABELS.queued;
  const fulBadge =
    FULFILLMENT_STATUS_LABELS[order.fulfillment_status] || FULFILLMENT_STATUS_LABELS.unfulfilled;

  const claimToken = sp.claim || order.post_purchase_claim_token;

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                  Pedido confirmado
                </span>
                <h1 className="font-display text-2xl font-bold text-[#24232A]">
                  Pedido #{order.order_number}
                </h1>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-[#5A5863]">Total pago</span>
              <span className="font-display block text-2xl font-bold text-[#563487]">
                {formatBRLFromCents(order.total_cents)}
              </span>
            </div>
          </div>

          {/* 3 Independent State Machines */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
              <span className="text-xs text-[#5A5863]">Pagamento</span>
              <div className="mt-1.5">
                <span
                  className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${finBadge.color}`}
                >
                  {finBadge.label}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
              <span className="text-xs text-[#5A5863]">Preparo no estúdio</span>
              <div className="mt-1.5">
                <span
                  className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${prodBadge.color}`}
                >
                  {prodBadge.label}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
              <span className="text-xs text-[#5A5863]">Entrega</span>
              <div className="mt-1.5">
                <span
                  className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${fulBadge.color}`}
                >
                  {fulBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Separated Production vs Carrier Timeline */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F2EFE9] p-4 text-xs text-[#24232A]">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#563487]" />
              <span>
                Preparo: <strong>{order.manufacturing_days}d úteis</strong> + Envio (
                {order.shipping_service_name}): <strong>{order.shipping_days}d úteis</strong> ={' '}
                <strong className="text-[#563487]">
                  {order.total_estimated_days} dias úteis estimados
                </strong>
              </span>
            </div>
            {order.shipping_tracking_code && (
              <span className="rounded-lg border border-[#E6E2DA] bg-white px-3 py-1 font-mono text-xs font-semibold text-[#24232A]">
                Rastreio: {order.shipping_tracking_code}
              </span>
            )}
          </div>

          {/* Selective Cart Preservation Confirmation */}
          {order.unselected_items_preserved_count > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D5C6EC] bg-[#F3EFFA] p-4 text-xs text-[#24232A]">
              <span>
                As outras <strong>{order.unselected_items_preserved_count} peças não selecionadas</strong>{' '}
                continuam guardadas no seu carrinho.
              </span>
              <Link
                href="/carrinho"
                className="inline-flex items-center gap-1 font-semibold text-[#563487] underline"
              >
                <span>Ver itens no carrinho</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Post-purchase 1-click Account Creation for Guest */}
        {!order.user_id && claimToken && (
          <PostPurchaseClaimClient
            orderId={order.id}
            claimToken={claimToken}
            guestEmail={order.guest_email}
          />
        )}

        {/* Order Items Table */}
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
          <h2 className="font-display text-base font-semibold text-[#24232A]">
            Peças deste pedido
          </h2>
          <div className="mt-4 divide-y divide-[#E6E2DA] text-xs">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3.5">
                <div>
                  <strong className="text-sm font-semibold text-[#24232A]">
                    {item.quantity}x {item.product_name_snapshot}
                  </strong>
                  <span className="block text-[#5A5863]">
                    {item.material_snapshot}
                    {item.variation_label_snapshot ? ` • ${item.variation_label_snapshot}` : ''}
                  </span>
                  {item.custom_text && (
                    <span className="mt-0.5 block font-medium text-[#563487]">
                      Gravação personalizada: &ldquo;{item.custom_text}&rdquo;
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-[#24232A]">
                  {formatBRLFromCents(item.unit_price_cents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <Link
            href="/catalogo"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[#E6E2DA] bg-white px-5 py-2.5 text-xs font-semibold text-[#24232A] hover:border-[#563487] hover:text-[#563487]"
          >
            Continuar navegando na loja
          </Link>
          <Link
            href="/minha-conta"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#462970]"
          >
            Acompanhar meus pedidos
          </Link>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
