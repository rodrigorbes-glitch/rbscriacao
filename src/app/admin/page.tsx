import React from 'react';
import Link from 'next/link';
import {
  Kanban,
  Wallet,
  Boxes,
  AlertTriangle,
  ArrowRight,
  ImageOff,
} from 'lucide-react';
import { getDb } from '@/db';
import { getFinancialDashboard, getCommercialIntelligenceDashboard } from '@/lib/operations';
import { HelpBalloon } from '@/components/HelpBalloon';
import { formatBRLFromCents, formatGramsAndKg, PRODUCTION_STATUS_LABELS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminCockpitPage() {
  const db = await getDb();
  const fin = await getFinancialDashboard(db);
  const intel = await getCommercialIntelligenceDashboard(db, 30);

  const activeJobs = await db.query<{
    id: string;
    batch_code: string;
    printer_name: string;
    stage: string;
    priority: string;
    estimated_grams: number;
    wasted_grams: number;
    product_name: string | null;
    order_number: string | null;
  }>(
    `SELECT pj.*, p.name as product_name, o.order_number
     FROM production_jobs pj
     LEFT JOIN products p ON p.id = pj.product_id
     LEFT JOIN orders o ON o.id = pj.order_id
     WHERE pj.stage != 'shipped'
     ORDER BY pj.created_at DESC`
  );

  const criticalSupplies = await db.query<{
    id: string;
    sku: string;
    name: string;
    stock_consumption_units: number;
    min_threshold_units: number;
    consumption_unit: string;
  }>(
    `SELECT * FROM inventory_supplies
     WHERE stock_consumption_units <= min_threshold_units
     ORDER BY stock_consumption_units ASC`
  );

  const pendingMediaProducts = await db.query<{
    id: string;
    sku: string;
    name: string;
    slug: string;
  }>("SELECT id, sku, name, slug FROM products WHERE images_json = '[]' ORDER BY name ASC");

  const pendingPayables = fin.entries.filter(
    (e) => e.direction === 'payable' && e.status === 'pending'
  );

  return (
    <div className="space-y-8">
      {/* Top Header with Contextual Help Balloon */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-semibold tracking-wider text-[#563487] uppercase">
            Painel RBS → Visão Geral
          </span>
          <h1 className="font-display mt-1 text-2xl font-semibold text-[#24232A] sm:text-3xl">
            Resumo Operacional e Financeiro
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Pedidos em preparo, fluxo de caixa, estoque crítico de filamento e mídias pendentes do catálogo.
          </p>
        </div>
        <HelpBalloon moduleSlug="visao-geral" />
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/producao"
          className="group rounded-2xl border border-[#E6E2DA] bg-white p-5 transition hover:border-[#563487]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A5863] uppercase">Ordens na Fila 3D</span>
            <Kanban className="h-5 w-5 text-[#563487]" />
          </div>
          <div className="font-display mt-3 text-3xl font-bold text-[#24232A]">
            {activeJobs.length}
          </div>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#563487] group-hover:underline">
            <span>Abrir Kanban de produção</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/financeiro"
          className="group rounded-2xl border border-[#E6E2DA] bg-white p-5 transition hover:border-[#563487]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A5863] uppercase">
              Caixa Realizado + A Receber
            </span>
            <Wallet className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="font-display mt-3 text-2xl font-bold text-emerald-800">
            {formatBRLFromCents(fin.fluxoCaixa.cashInflowRealizedCents)}
          </div>
          <span className="mt-2 block text-xs text-[#5A5863]">
            + {formatBRLFromCents(fin.fluxoCaixa.receivablesPendingCents)} previstos a receber
          </span>
        </Link>

        <Link
          href="/admin/financeiro"
          className="group rounded-2xl border border-[#E6E2DA] bg-white p-5 transition hover:border-[#563487]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A5863] uppercase">
              Contas a Vencer
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div className="font-display mt-3 text-2xl font-bold text-[#24232A]">
            {formatBRLFromCents(fin.fluxoCaixa.payablesPendingCents)}
          </div>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 group-hover:underline">
            <span>{pendingPayables.length} títulos aguardando baixa</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/estoque"
          className="group rounded-2xl border border-[#E6E2DA] bg-white p-5 transition hover:border-[#563487]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A5863] uppercase">
              Insumos Críticos
            </span>
            <Boxes className="h-5 w-5 text-rose-700" />
          </div>
          <div className="font-display mt-3 text-3xl font-bold text-rose-700">
            {criticalSupplies.length}
          </div>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-800 group-hover:underline">
            <span>Repor bobinas abaixo do mínimo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Orders to Produce on Kanban */}
        <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                1. Fila de produção 3D e máquinas ativas
              </h2>
              <p className="text-xs text-[#5A5863]">
                Ordens aguardando impressão, em máquina ou em acabamento.
              </p>
            </div>
            <Link
              href="/admin/producao"
              className="rounded-xl bg-[#563487] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#462970]"
            >
              Gerenciar Kanban →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {activeJobs.map((job) => {
              const st = PRODUCTION_STATUS_LABELS[job.stage] || PRODUCTION_STATUS_LABELS.queued;
              return (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4 text-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#563487]">{job.batch_code}</span>
                      {job.order_number && (
                        <span className="rounded bg-[#F2EFE9] px-2 py-0.5 font-mono text-[11px] text-[#24232A]">
                          Pedido #{job.order_number}
                        </span>
                      )}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <strong className="mt-1 block text-sm text-[#24232A]">
                      {job.product_name || 'Peça de reposição / catálogo'}
                    </strong>
                    <span className="text-[#5A5863]">
                      Impressora: {job.printer_name} • Consumo previsto: {job.estimated_grams} g
                      {job.wasted_grams > 0 ? ` • Perda registrada: ${job.wasted_grams} g` : ''}
                    </span>
                  </div>
                  <Link
                    href="/admin/producao"
                    className="rounded-lg border border-[#E6E2DA] bg-white px-3 py-1.5 font-semibold text-[#24232A] hover:border-[#563487] hover:text-[#563487]"
                  >
                    Avançar etapa
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Critical Stock, Pending Media & Commercial Opportunities */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                2. Alerta de estoque crítico (gramas)
              </h2>
              <Link
                href="/admin/estoque"
                className="text-xs font-semibold text-[#563487] hover:underline"
              >
                Registrar compra →
              </Link>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              {criticalSupplies.map((sup) => (
                <div
                  key={sup.id}
                  className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-rose-950"
                >
                  <strong className="block text-[#24232A]">{sup.name}</strong>
                  <span>
                    Saldo atual: <strong>{formatGramsAndKg(sup.stock_consumption_units)}</strong>{' '}
                    (Mínimo: {formatGramsAndKg(sup.min_threshold_units)})
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-base font-semibold text-[#24232A]">
                <ImageOff className="h-4 w-4 text-amber-700" />
                <span>3. Mídias pendentes de fotografia ({pendingMediaProducts.length})</span>
              </h2>
              <Link
                href="/admin/produtos"
                className="text-xs font-semibold text-[#563487] hover:underline"
              >
                Abrir catálogo →
              </Link>
            </div>
            <p className="mt-1 text-xs text-[#5A5863]">
              Itens sinalizados como &ldquo;Imagem em atualização&rdquo; e ocultados dos destaques
              da home até o envio da foto real:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-[#24232A]">
              {pendingMediaProducts.map((pm) => (
                <li
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2"
                >
                  <span className="truncate font-medium">{pm.name}</span>
                  <span className="ml-2 shrink-0 font-mono text-[11px] text-[#5A5863]">
                    {pm.sku}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                4. Oportunidades comerciais
              </h2>
              <Link
                href="/admin/inteligencia"
                className="text-xs font-semibold text-[#563487] hover:underline"
              >
                Ver inteligência →
              </Link>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              {intel.opportunities.slice(0, 2).map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4"
                >
                  <span className="text-[10px] font-semibold text-[#563487] uppercase">
                    {opp.type}
                  </span>
                  <strong className="mt-0.5 block text-[#24232A]">{opp.productName}</strong>
                  <p className="mt-1 text-[#5A5863]">{opp.metricObserved}</p>
                  <Link
                    href={opp.actionHref}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-[#563487] hover:underline"
                  >
                    <span>{opp.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
