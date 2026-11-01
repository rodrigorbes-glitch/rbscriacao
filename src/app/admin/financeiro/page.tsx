import React from 'react';
import { getDb } from '@/db';
import { getFinancialDashboard } from '@/lib/operations';
import { HelpBalloon } from '@/components/HelpBalloon';
import {
  AdminFinanceActionsClient,
  QuickSettleButton,
} from '@/components/AdminFinanceActionsClient';
import { formatBRLFromCents } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminFinanceiroPage() {
  const db = await getDb();
  const fin = await getFinancialDashboard(db);

  const receivables = fin.entries.filter((e) => e.direction === 'receivable');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Financeiro & Resultado Gerencial
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Gestão Financeira, Conciliação & DRE (Caixa vs. Competência)
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Separação rigorosa entre compra de filamento (Ativo de Estoque / Saída de Caixa) e consumo produtivo (CMV por Competência), evitando tripla contagem.
          </p>
        </div>
        <HelpBalloon moduleSlug="financeiro" />
      </div>

      {/* Bank / Gateway Accounts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fin.accounts.map((acc) => (
          <div
            key={acc.id}
            className="rounded-2xl border border-[#E6E2DA] bg-white p-5"
          >
            <span className="text-[11px] font-bold text-[#5A5863] uppercase">
              {acc.institution} ({acc.account_type})
            </span>
            <h2 className="mt-1 text-sm font-bold text-[#24232A]">{acc.name}</h2>
            <div className="mt-2 text-2xl font-black text-emerald-800">
              {formatBRLFromCents(acc.balance_cents)}
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-side: DRE por Competência vs. Fluxo de Caixa */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <span className="text-xs font-bold text-[#563487] uppercase">
            Visão Econômica (Regime de Competência)
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-[#24232A]">
            DRE Gerencial da Operação 3D
          </h2>
          <p className="text-xs text-[#5A5863]">
            Reconhece a receita pela venda e o CMV exclusivamente pelas gramas de filamento e embalagens efetivamente consumidas nas ordens produzidas.
          </p>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(+) Receita Bruta de Vendas & Lotes 3D</span>
              <strong className="text-[#24232A]">{formatBRLFromCents(fin.dreCompetencia.grossRevenueCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(−) Taxas de Gateway (Conciliadas / Estimadas)</span>
              <strong className="text-rose-700">− {formatBRLFromCents(fin.dreCompetencia.gatewayFeesCompetenceCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA] font-bold">
              <span className="text-[#24232A]">(=) Receita Líquida Operacional</span>
              <strong className="text-emerald-800">{formatBRLFromCents(fin.dreCompetencia.netRevenueCompetenceCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(−) CMV Real (Filamento Consumido em g + Perdas + Embalagem)</span>
              <strong className="text-rose-700">− {formatBRLFromCents(fin.dreCompetencia.cogsSupplyConsumedCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(−) Fretes Melhor Envio & Comissões de Parceiros</span>
              <strong className="text-rose-700">
                − {formatBRLFromCents(fin.dreCompetencia.shippingExpenseCents + fin.dreCompetencia.partnerCommissionCents)}
              </strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(−) Despesas Operacionais (Energia Fazenda 3D / Manutenção)</span>
              <strong className="text-rose-700">− {formatBRLFromCents(fin.dreCompetencia.operatingExpenseCents)}</strong>
            </div>
            <div className="flex justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-black">
              <span className="text-[#24232A]">(=) Resultado Líquido por Competência</span>
              <span className="text-emerald-800">
                {formatBRLFromCents(fin.dreCompetencia.netOperatingResultCompetenceCents)}
              </span>
            </div>
            <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-[11px] text-sky-900">
              ℹ️ <strong>Nota de Integridade Contábil:</strong> Compras de bobinas para reposição de estoque ({formatBRLFromCents(fin.dreCompetencia.inventoryAssetPurchasesCents)}) estão registradas como formação de Ativo de Estoque e Saída de Caixa, sem duplicar no CMV acima.
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <span className="text-xs font-bold text-emerald-800 uppercase">
            Visão Tesouraria (Regime de Caixa)
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-[#24232A]">
            Fluxo de Caixa Realizado & Projetado
          </h2>
          <p className="text-xs text-[#5A5863]">
            Considera o dinheiro efetivamente recebido e pago nas contas bancárias/gateway, mais a projeção de títulos em aberto.
          </p>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(+) Entradas Líquidas Recebidas (Caixa Realizado)</span>
              <strong className="text-emerald-800">{formatBRLFromCents(fin.fluxoCaixa.cashInflowRealizedCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-[#5A5863]">(−) Saídas Pagas (Incluindo Compra de Bobinas & Fretes Pagos)</span>
              <strong className="text-rose-700">− {formatBRLFromCents(fin.fluxoCaixa.cashOutflowRealizedCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA] font-bold">
              <span className="text-[#24232A]">(=) Geração Líquida de Caixa Realizada</span>
              <strong className="text-[#24232A]">{formatBRLFromCents(fin.fluxoCaixa.netCashFlowRealizedCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-sky-900">(+) Contas a Receber Previstas (Aberto)</span>
              <strong className="text-sky-900">+ {formatBRLFromCents(fin.fluxoCaixa.receivablesPendingCents)}</strong>
            </div>
            <div className="flex justify-between rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
              <span className="text-amber-900">(−) Contas a Pagar Previstas (Energia, Comissões, Fornecedores)</span>
              <strong className="text-amber-900">− {formatBRLFromCents(fin.fluxoCaixa.payablesPendingCents)}</strong>
            </div>
            <div className="flex justify-between rounded-2xl border border-[#D5C6EC] bg-[#F3EFFA] p-4 text-sm font-black">
              <span className="text-[#24232A]">(=) Saldo Projetado após Liquidações</span>
              <span className="text-[#563487]">
                {formatBRLFromCents(fin.fluxoCaixa.projectedCashBalanceDeltaCents)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Interactive Forms: New Entry + Fee Reconciliation */}
      <AdminFinanceActionsClient receivableEntries={receivables} />

      {/* Complete Financial Ledger Table */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          Razão de Contas a Pagar, Contas a Receber & Conciliações ({fin.entries.length} lançamentos)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">Código</th>
                <th className="py-3 pr-3">Tipo / Classe Contábil</th>
                <th className="py-3 pr-3">Descrição & Origem</th>
                <th className="py-3 pr-3">Competência / Venc.</th>
                <th className="py-3 pr-3">Bruto</th>
                <th className="py-3 pr-3">Taxa Prev. / Real</th>
                <th className="py-3 pr-3">Líquido</th>
                <th className="py-3 text-right">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {fin.entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-3 font-mono font-bold text-[#563487]">{e.entry_code}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        e.direction === 'receivable'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {e.direction === 'receivable' ? 'A Receber' : 'A Pagar'}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-[#6E6B78]">
                      {e.accounting_class}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <strong className="block text-[#24232A]">{e.description}</strong>
                    <span className="text-[11px] text-[#5A5863]">{e.counterparty_name}</span>
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-[#5A5863]">
                    Comp: {String(e.competence_date).slice(0, 10)}
                    <br />
                    Venc: {String(e.due_date).slice(0, 10)}
                  </td>
                  <td className="py-3 pr-3 font-bold">{formatBRLFromCents(e.gross_amount_cents)}</td>
                  <td className="py-3 pr-3 text-[11px] text-[#5A5863]">
                    Prev: {formatBRLFromCents(e.fee_estimated_cents)}
                    {e.fee_actual_cents !== null && (
                      <span className="block font-bold text-sky-900">
                        Real: {formatBRLFromCents(e.fee_actual_cents)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 font-extrabold text-[#24232A]">
                    {formatBRLFromCents(e.net_amount_cents)}
                  </td>
                  <td className="py-3 text-right">
                    {e.status === 'pending' ? (
                      <QuickSettleButton entryId={e.id} />
                    ) : (
                      <span className="rounded-md bg-[#F2EFE9] px-2.5 py-1 text-[10px] font-bold text-emerald-800 uppercase">
                        {e.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
