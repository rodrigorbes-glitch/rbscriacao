import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  BellRing,
  Search,
  ShoppingBag,
  ArrowRight,
  Eye,
  Heart,
} from 'lucide-react';
import { getDb } from '@/db';
import { getCommercialIntelligenceDashboard } from '@/lib/operations';
import { HelpBalloon } from '@/components/HelpBalloon';
import { formatBRLFromCents } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminInteligenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Number(sp.days || 30);
  const db = await getDb();
  const intel = await getCommercialIntelligenceDashboard(db, days);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Inteligência Comercial → Interesse e Oportunidades
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Inteligência Comercial, Funil & Sinais do Carrinho Seletivo
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Métricas reais derivadas de eventos auditados (excluindo bots e acessos internos), com métrica observada, amostra, hipótese e ação recomendada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-[#E6E2DA] bg-white p-1 text-xs">
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/admin/inteligencia?days=${d}`}
                className={`rounded-lg px-3 py-1.5 font-bold ${
                  days === d ? 'bg-[#563487] text-white' : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                {d} dias
              </Link>
            ))}
          </div>
          <HelpBalloon moduleSlug="inteligencia" />
        </div>
      </div>

      {/* Actionable Opportunity Cards (Metric Observed + Sample Size + Hypothesis + Action) */}
      <section className="space-y-4">
        <h2 className="text-lg font-extrabold text-[#24232A]">
          1. Oportunidades Acionáveis (Com Evidência, Amostra e Hipótese)
        </h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {intel.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="flex flex-col justify-between rounded-3xl border border-[#E6E2DA] bg-white p-6"
            >
              <div className="space-y-3 text-xs">
                <span className="inline-block rounded-md bg-[#F3EFFA] px-2.5 py-1 text-[10px] font-bold text-[#563487] uppercase border border-[#D5C6EC]">
                  {opp.type}
                </span>
                <h3 className="text-base font-extrabold text-[#24232A]">{opp.productName}</h3>

                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <strong className="block text-emerald-800">Métrica Observada:</strong>
                  <span className="text-[#5A5863]">{opp.metricObserved}</span>
                </div>

                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <strong className="block text-sky-900">Amostra Auditada:</strong>
                  <span className="text-[#5A5863]">{opp.sampleSize}</span>
                </div>

                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <strong className="block text-amber-900">Hipótese Provável:</strong>
                  <span className="text-[#5A5863]">{opp.hypothesis}</span>
                </div>

                <p className="text-[#5A5863]">
                  <strong className="text-[#24232A]">Ação Recomendada:</strong> {opp.recommendedAction}
                </p>
              </div>

              <div className="mt-5 border-t border-[#E6E2DA] pt-4">
                <Link
                  href={opp.actionHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#563487] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#462970]"
                >
                  <span>{opp.actionLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Funnel Matrix */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          2. Funil de Interesse por Produto (Visualizações → Favoritos → Carrinho → Salvos p/ Depois → Desmarcados → Compras)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-4">Peça 3D / SKU</th>
                <th className="py-3 pr-4 text-center">Visualizações</th>
                <th className="py-3 pr-4 text-center">Favoritos</th>
                <th className="py-3 pr-4 text-center">Adições Carrinho</th>
                <th className="py-3 pr-4 text-center">Salvos p/ Depois</th>
                <th className="py-3 pr-4 text-center">Adiamentos (Seleção Parcial)</th>
                <th className="py-3 pr-4 text-center">Compras Pagas</th>
                <th className="py-3 text-right">Ação Direta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {intel.productMetrics.map((pm) => (
                <tr key={pm.id}>
                  <td className="py-3.5 pr-4">
                    <strong className="block text-[#24232A]">{pm.name}</strong>
                    <span className="text-[11px] text-[#6E6B78]">
                      {pm.sku} • {formatBRLFromCents(pm.price_cents)} • Estoque: {pm.stock_qty} un
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-center font-bold">{pm.views_count}</td>
                  <td className="py-3.5 pr-4 text-center font-bold text-rose-700">{pm.wishlist_count}</td>
                  <td className="py-3.5 pr-4 text-center font-bold text-[#563487]">{pm.cart_add_count}</td>
                  <td className="py-3.5 pr-4 text-center text-sky-900">{pm.saved_later_count}</td>
                  <td className="py-3.5 pr-4 text-center text-amber-900">{pm.unselected_toggle_count}</td>
                  <td className="py-3.5 pr-4 text-center font-bold text-emerald-800">{pm.paid_count}</td>
                  <td className="py-3.5 text-right">
                    <Link
                      href={`/admin/precificador?product=${pm.id}`}
                      className="rounded-lg border border-[#D5CFC4] bg-[#F2EFE9] px-3 py-1.5 text-[11px] font-bold text-[#24232A] hover:bg-[#E6E2DA]"
                    >
                      Simular Preço
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Row: Interest Alerts Queue & Search Queries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#24232A]">
            <BellRing className="h-5 w-5 text-[#563487]" />
            3. Fila de Avisos de Interesse com Consentimento LGPD ({intel.alerts.length})
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            {intel.alerts.map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4"
              >
                <div>
                  <strong className="block text-[#24232A]">{al.product_name}</strong>
                  <span className="text-[#5A5863]">
                    Lead: {al.visitor_email} {al.visitor_whatsapp ? `• ${al.visitor_whatsapp}` : ''}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#563487]">
                    Gatilho: {al.alert_type === 'price_drop' ? 'Queda de Preço' : 'Reposição de Estoque'}
                    {al.target_price_cents ? ` (Meta: ${formatBRLFromCents(al.target_price_cents)})` : ''}
                  </span>
                </div>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 uppercase">
                  {al.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#24232A]">
            <Search className="h-5 w-5 text-sky-800" />
            4. Termos Buscados pelos Visitantes & Comportamento de Seleção Parcial
          </h2>
          <div className="mt-4 space-y-2.5 text-xs">
            {intel.searchTerms.map((st, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3"
              >
                <span className="font-mono text-[#24232A]">&ldquo;{st.search_term}&rdquo;</span>
                <span className="rounded bg-[#F2EFE9] px-2.5 py-0.5 font-bold text-[#563487]">
                  {st.count} busca(s)
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-[#E6E2DA] pt-4 text-xs">
            <strong className="block text-[#24232A]">Pedidos por Modo do Carrinho Seletivo:</strong>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {intel.orderSelectionStats.map((s, i) => (
                <div key={i} className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <span className="block text-[11px] text-[#5A5863] uppercase">
                    {s.cart_selection_mode === 'partial' ? 'Checkout com Seleção Parcial' : 'Checkout Carrinho Completo'}
                  </span>
                  <strong className="text-base text-emerald-800">
                    {s.orders_count} pedido(s) • {formatBRLFromCents(Number(s.total_revenue_cents))}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
