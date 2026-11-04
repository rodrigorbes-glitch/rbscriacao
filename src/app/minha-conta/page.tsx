import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Package,
  FileCode2,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  BellRing,
  Lock,
  UserCheck,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { LogoutButton } from '@/components/LogoutButton';
import { TrackOrderForm } from '@/components/TrackOrderForm';
import {
  formatBRLFromCents,
  FINANCIAL_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from '@/lib/format';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MinhaContaPage() {
  const db = await getDb();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await validateSessionFromCookie(db, token);

  // If user is NOT authenticated, render protected login/tracking screen instead of leaking database orders
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
        <StoreHeader />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8 space-y-8">
          <div className="rounded-3xl border border-[#E6E2DA] bg-white p-6 sm:p-10 text-center max-w-2xl mx-auto shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EFFA] text-[#563487] mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Espaço do Cliente
            </p>
            <h1 className="font-display mt-2 text-2xl font-bold text-[#24232A] sm:text-3xl">
              Minha Conta & Pedidos
            </h1>
            <p className="mt-2 text-sm text-[#5A5863] leading-relaxed">
              Entre na sua conta para acompanhar o preparo no estúdio 3D, código de rastreamento dos Correios/Jadlog e seus endereços salvos com total privacidade.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#563487] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#462970] shadow-xs"
              >
                Entrar com E-mail e Senha
              </Link>
              <Link
                href="/catalogo"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-5 py-2.5 text-xs font-semibold text-[#24232A] hover:border-[#563487] transition"
              >
                Explorar Catálogo
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Quick Track for Guest Orders */}
            <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#563487]">
                <Search className="h-5 w-5" />
                <h2 className="text-sm font-bold text-[#24232A]">Rastrear Pedido Avulso</h2>
              </div>
              <p className="text-xs text-[#5A5863]">
                Fez uma compra rápida como visitante? Digite o código do seu pedido para ver o status de produção e entrega:
              </p>
              <TrackOrderForm />
              <span className="block text-[11px] text-[#6E6B78]">
                Exemplo: #RBS-2026-1001 (disponível no e-mail de confirmação ou WhatsApp).
              </span>
            </div>

            {/* Privacy & Security Policy */}
            <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-sm font-bold text-[#24232A]">Privacidade & Sigilo</h2>
              </div>
              <p className="text-xs text-[#5A5863] leading-relaxed">
                Na RBS Criação, dados de compras, endereços residenciais e orçamentos só são exibidos após login autenticado do titular. Seus dados pessoais não ficam expostos publicamente.
              </p>
              <div className="pt-1">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#563487] hover:underline"
                >
                  Fazer login ou redefinir senha →
                </Link>
              </div>
            </div>
          </div>
        </main>

        <StoreFooter />
      </div>
    );
  }

  // User is authenticated: query ONLY this user's records
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
  }>(
    `SELECT * FROM orders 
     WHERE guest_email = $1 OR user_id = $2 
     ORDER BY created_at DESC LIMIT 20`,
    [session.email, session.userId]
  );

  const quotes = await db.query<{
    id: string;
    quote_number: string;
    project_title: string;
    preferred_material: string;
    status: string;
    quoted_price_cents: number | null;
  }>(
    `SELECT * FROM custom_quotes 
     WHERE user_id = $1 OR client_email = $2 
     ORDER BY created_at DESC LIMIT 10`,
    [session.userId, session.email]
  );

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
  }>(
    `SELECT * FROM customer_addresses 
     WHERE user_id = $1 
     ORDER BY is_default DESC`,
    [session.userId]
  );

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
     WHERE ia.user_id = $1 OR ia.email = $2
     ORDER BY ia.created_at DESC`,
    [session.userId, session.email]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Top Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
                Espaço do cliente autenticado
              </p>
            </div>
            <h1 className="font-display mt-1 text-2xl font-bold text-[#24232A] sm:text-3xl">
              Minha conta e pedidos
            </h1>
            <p className="mt-1 text-xs text-[#5A5863]">
              Conectado como: <strong className="text-[#24232A]">{session.name}</strong>{' '}
              <span className="font-mono text-[11px] text-[#6E6B78]">({session.email})</span>
              <span className="ml-2 inline-block rounded bg-purple-100 text-[#563487] px-2 py-0.5 text-[10px] font-bold uppercase">
                {session.role}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <LogoutButton />

            {(session.role === 'admin' || session.role === 'operator') && (
              <Link
                href="/admin"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#563487] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#462970]"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Painel RBS (Área autorizada)</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Orders History */}
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                  <Package className="h-5 w-5 text-[#563487]" />
                  <span>Meus pedidos ({orders.length})</span>
                </h2>
                <Link
                  href="/catalogo"
                  className="text-xs font-semibold text-[#563487] hover:underline"
                >
                  Ver catálogo →
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <Package className="h-10 w-10 text-[#6E6B78] mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-[#24232A]">
                    Nenhum pedido encontrado para o seu e-mail.
                  </p>
                  <p className="text-xs text-[#5A5863] max-w-sm mx-auto">
                    Assim que você realizar um pedido na loja ou solicitar uma peça 3D, ele aparecerá aqui com rastreamento detalhado em tempo real.
                  </p>
                  <Link
                    href="/catalogo"
                    className="inline-block rounded-xl bg-[#563487] px-4 py-2 text-xs font-bold text-white hover:bg-[#462970] transition"
                  >
                    Explorar Peças Autorais
                  </Link>
                </div>
              ) : (
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
              )}
            </section>

            {/* Custom Quotes */}
            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                  <FileCode2 className="h-5 w-5 text-[#563487]" />
                  <span>Orçamentos personalizados ({quotes.length})</span>
                </h2>
                <Link
                  href="/personalizados"
                  className="text-xs font-semibold text-[#563487] hover:underline"
                >
                  Novo pedido personalizado →
                </Link>
              </div>

              {quotes.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#5A5863]">
                  Você ainda não solicitou nenhum projeto 3D sob medida.{' '}
                  <Link href="/personalizados" className="font-bold text-[#563487] hover:underline">
                    Enviar arquivo STL/OBJ para cotação
                  </Link>
                </div>
              ) : (
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
              )}
            </section>
          </div>

          {/* Sidebar: Addresses & Interest Alerts */}
          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                <MapPin className="h-5 w-5 text-[#563487]" />
                <span>Endereços salvos ({addresses.length})</span>
              </h2>
              {addresses.length === 0 ? (
                <p className="mt-3 text-xs text-[#5A5863]">
                  Nenhum endereço cadastrado ainda. Seus endereços de entrega são salvos automaticamente ao finalizar compras na loja.
                </p>
              ) : (
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
              )}
            </section>

            <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[#24232A]">
                <BellRing className="h-5 w-5 text-[#563487]" />
                <span>Avisos de produtos ({alerts.length})</span>
              </h2>
              {alerts.length === 0 ? (
                <p className="mt-3 text-xs text-[#5A5863]">
                  Nenhum aviso configurado. Nas páginas de produtos sem estoque ou lançamentos, você pode cadastrar alertas de reposição.
                </p>
              ) : (
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
              )}
            </section>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
