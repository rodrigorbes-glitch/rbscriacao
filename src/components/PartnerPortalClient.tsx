'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Handshake,
  Percent,
  PackageCheck,
  ShoppingBag,
  RotateCcw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { formatBRLFromCents } from '@/lib/format';

interface PartnerPortalData {
  partner: {
    id: string;
    partner_code: string;
    name: string;
    business_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    partner_type: string;
    commission_rate_pct: number;
    coupon_code: string;
    customer_discount_pct: number;
    status: string;
  };
  consignmentItems: Array<{
    id: string;
    product_name: string;
    sku: string;
    shipment_code: string;
    dispatched_qty: number;
    sold_qty: number;
    returned_qty: number;
    damaged_qty: number;
    agreed_unit_price_cents: number;
    partner_commission_pct: number;
  }>;
  commissions: Array<{
    id: string;
    order_number: string | null;
    origin_type: string;
    calculation_base_cents: number;
    commission_rate_pct: number;
    commission_amount_cents: number;
    status: string;
    created_at: string;
  }>;
  comodatos: Array<{
    id: string;
    asset_code: string;
    asset_name: string;
    condition_status: string;
    declared_value_cents: number;
  }>;
  catalogProducts: Array<{
    id: string;
    name: string;
    sku: string;
    price_cents: number;
  }>;
}

export function PartnerPortalClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PartnerPortalData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Replenishment form
  const [repProductId, setRepProductId] = useState('');
  const [repQuantity, setRepQuantity] = useState('5');

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch('/api/parceiro');
      if (res.status === 401) {
        router.push('/login?redirect=/parceiros');
        return;
      }
      const json = await res.json();
      if (json.error) {
        setErrorMsg(json.error);
      } else {
        setData(json);
        if (json.catalogProducts?.length > 0) {
          setRepProductId(json.catalogProducts[0].id);
        }
      }
    } catch (err) {
      setErrorMsg('Falha ao conectar com o Portal do Parceiro.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  }

  async function handleRecordSale(consignmentItemId: string) {
    setBusyId(`sale-${consignmentItemId}`);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/parceiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_consignment_sale',
          consignmentItemId,
          qty: 1,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setFeedback(result.message);
        await loadData();
      } else {
        setErrorMsg(result.error || 'Erro ao registrar baixa.');
      }
    } catch {
      setErrorMsg('Erro na comunicação com o servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRequestReplenishment(e: React.FormEvent) {
    e.preventDefault();
    setBusyId('replenish');
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/parceiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_replenishment_order',
          productId: repProductId,
          quantity: Number(repQuantity),
        }),
      });
      const result = await res.json();
      if (result.success) {
        setFeedback(result.message);
        await loadData();
      } else {
        setErrorMsg(result.error || 'Erro ao solicitar reposição.');
      }
    } catch {
      setErrorMsg('Erro na comunicação com o servidor.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFBF8]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#563487] border-r-transparent"></div>
          <p className="mt-3 text-xs font-semibold text-[#5A5863]">Carregando seu portal de parceiro...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFBF8] p-4">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-lg font-bold text-[#24232A]">Acesso Restrito ao Portal</h1>
          <p className="mt-2 text-xs text-[#5A5863]">{errorMsg}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-[#563487] px-4 py-2.5 text-xs font-bold text-white">
              Fazer Login
            </Link>
            <Link href="/" className="rounded-xl border border-[#E6E2DA] px-4 py-2.5 text-xs font-bold text-[#24232A]">
              Voltar à Loja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalCommissionsEarned = data.commissions.reduce((acc, c) => acc + c.commission_amount_cents, 0);

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#24232A]">
      {/* Isolated Partner Portal Header */}
      <header className="sticky top-0 z-30 border-b border-[#E6E2DA] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo_rbs.png" alt="RBS Criação" className="h-8 w-auto object-contain" />
              <div>
                <span className="font-display block text-xs font-bold tracking-wide text-[#24232A]">
                  PORTAL DO PARCEIRO
                </span>
                <span className="block text-[11px] font-medium text-[#563487]">
                  Ambiente Comercial Restrito
                </span>
              </div>
            </Link>
            <div className="hidden border-l border-[#E6E2DA] pl-4 sm:block">
              <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                {data.partner.business_name || data.partner.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#5A5863] md:inline">
              Código: <strong className="text-[#563487] font-mono">{data.partner.partner_code}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E2DA] bg-white px-3 py-2 text-xs font-semibold text-[#5A5863] hover:text-red-700 hover:border-red-300 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        {feedback && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800" />
            <span>{feedback}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-800" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Partner Metrics & Agreement Summary (Compact on Mobile) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-3.5 sm:p-5">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#5A5863] uppercase">Comissão de Venda</span>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-[#563487]">{data.partner.commission_rate_pct}%</div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-[#5A5863] hidden sm:block">Definida em contrato com a RBS Criação</p>
          </div>

          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-3.5 sm:p-5">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#5A5863] uppercase">Cupom para Clientes</span>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-emerald-800 font-mono">{data.partner.coupon_code}</div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-[#5A5863] hidden sm:block">{data.partner.customer_discount_pct}% desc. comprador</p>
          </div>

          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-3.5 sm:p-5">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#5A5863] uppercase">Comissões Ganhas</span>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-[#24232A]">
              {formatBRLFromCents(totalCommissionsEarned)}
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-[#5A5863] hidden sm:block">{data.commissions.length} venda(s) apurada(s)</p>
          </div>

          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-3.5 sm:p-5">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#5A5863] uppercase">Saldo em Vitrine</span>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-sky-800">
              {data.consignmentItems.reduce(
                (acc, ci) => acc + (ci.dispatched_qty - ci.sold_qty - ci.returned_qty - (ci.damaged_qty || 0)),
                0
              )}{' '}
              un
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-[#5A5863] hidden sm:block">Peças físicas no ponto comercial</p>
          </div>
        </div>

        {/* 2. Consignment Items: Responsive Cards on Mobile + Table on Desktop */}
        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase">
                Suas Peças em Consignação (Vitrine Física)
              </span>
              <h2 className="mt-0.5 text-base sm:text-lg font-extrabold text-[#24232A]">
                Controle de Estoque e Baixa Imediata de Vendas
              </h2>
            </div>
            <PackageCheck className="h-5 w-5 text-emerald-800" />
          </div>

          {data.consignmentItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#5A5863]">
              Nenhuma remessa de consignação ativa no momento.
            </p>
          ) : (
            <>
              {/* Mobile View: Clean Cards without horizontal scrolling */}
              <div className="mt-4 space-y-3 sm:hidden">
                {data.consignmentItems.map((ci) => {
                  const balanceQty =
                    ci.dispatched_qty - ci.sold_qty - ci.returned_qty - (ci.damaged_qty || 0);
                  const commUnitCents = Math.round(
                    ci.agreed_unit_price_cents * (Number(ci.partner_commission_pct) / 100)
                  );
                  return (
                    <div
                      key={ci.id}
                      className="rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-3.5 text-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-sm text-[#24232A]">{ci.product_name}</strong>
                          <span className="text-[11px] text-[#5A5863]">
                            SKU: {ci.sku} • Remessa: <span className="font-mono font-bold text-[#563487]">{ci.shipment_code}</span>
                          </span>
                        </div>
                        <span className="rounded-lg bg-white border border-[#D5CFC4] px-2 py-0.5 text-xs font-black text-[#24232A]">
                          {balanceQty} un em vitrine
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#E6E2DA] pt-2 text-[11px]">
                        <div>
                          <span className="text-[#5A5863]">Preço venda: </span>
                          <strong className="text-[#24232A]">{formatBRLFromCents(ci.agreed_unit_price_cents)}</strong>
                        </div>
                        <div>
                          <span className="text-[#5A5863]">Sua comissão: </span>
                          <strong className="text-emerald-800 font-bold">{formatBRLFromCents(commUnitCents)} ({ci.partner_commission_pct}%)</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={balanceQty <= 0 || busyId === `sale-${ci.id}`}
                        onClick={() => handleRecordSale(ci.id)}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        {busyId === `sale-${ci.id}` ? 'Baixando...' : '+ Registrar Venda de 1 Unidade'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Full Table */}
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                      <th className="py-3 pr-3">Remessa</th>
                      <th className="py-3 pr-3">Peça 3D</th>
                      <th className="py-3 pr-3 text-center">Recebido</th>
                      <th className="py-3 pr-3 text-center">Vendido</th>
                      <th className="py-3 pr-3 text-center">Saldo em Vitrine</th>
                      <th className="py-3 pr-3">Preço ao Cliente</th>
                      <th className="py-3 pr-3">Sua Comissão</th>
                      <th className="py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
                    {data.consignmentItems.map((ci) => {
                      const balanceQty =
                        ci.dispatched_qty - ci.sold_qty - ci.returned_qty - (ci.damaged_qty || 0);
                      const commUnitCents = Math.round(
                        ci.agreed_unit_price_cents * (Number(ci.partner_commission_pct) / 100)
                      );
                      return (
                        <tr key={ci.id} className="hover:bg-[#FCFBF8]">
                          <td className="py-3.5 pr-3 font-mono font-bold text-[#563487]">{ci.shipment_code}</td>
                          <td className="py-3.5 pr-3">
                            <strong className="block text-[#24232A]">{ci.product_name}</strong>
                            <span className="text-[11px] text-[#5A5863]">SKU: {ci.sku}</span>
                          </td>
                          <td className="py-3.5 pr-3 text-center font-bold">{ci.dispatched_qty} un</td>
                          <td className="py-3.5 pr-3 text-center font-bold text-emerald-800">{ci.sold_qty} un</td>
                          <td className="py-3.5 pr-3 text-center">
                            <span className="rounded-lg bg-[#FCFBF8] border border-[#E6E2DA] px-2.5 py-1 font-bold text-[#24232A]">
                              {balanceQty} un
                            </span>
                          </td>
                          <td className="py-3.5 pr-3 font-medium">
                            {formatBRLFromCents(ci.agreed_unit_price_cents)}
                          </td>
                          <td className="py-3.5 pr-3 font-bold text-emerald-800">
                            {formatBRLFromCents(commUnitCents)} ({ci.partner_commission_pct}%)
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              disabled={balanceQty <= 0 || busyId === `sale-${ci.id}`}
                              onClick={() => handleRecordSale(ci.id)}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                            >
                              {busyId === `sale-${ci.id}` ? 'Baixando...' : '+ Registrar Venda'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* 3. Replenishment Form + Comodato Assets */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Order Replenishment with Partner Discount */}
          <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-5 w-5 text-[#563487]" />
              <h2 className="text-base font-extrabold text-[#24232A]">
                Solicitar Reposição / Compra Recorrente
              </h2>
            </div>
            <p className="text-xs text-[#5A5863] mb-4">
              Peça mais unidades para o seu estoque com o desconto de parceiro de {data.partner.commission_rate_pct}% aplicado automaticamente.
            </p>

            <form onSubmit={handleRequestReplenishment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#5A5863] mb-1">Peça 3D Desejada</label>
                <select
                  value={repProductId}
                  onChange={(e) => setRepProductId(e.target.value)}
                  className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] font-semibold"
                >
                  {data.catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatBRLFromCents(p.price_cents)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5A5863] mb-1">Quantidade de Unidades</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={repQuantity}
                  onChange={(e) => setRepQuantity(e.target.value)}
                  className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={busyId === 'replenish'}
                className="w-full rounded-xl bg-[#563487] hover:bg-[#462970] py-2.5 font-bold text-white transition cursor-pointer"
              >
                {busyId === 'replenish' ? 'Enviando...' : 'Enviar Pedido de Reposição'}
              </button>
            </form>
          </section>

          {/* Comodato Assets */}
          <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-sky-800" />
              <h2 className="text-base font-extrabold text-[#24232A]">
                Expositores e Mostruários em Comodato
              </h2>
            </div>
            <p className="text-xs text-[#5A5863] mb-4">
              Equipamentos e totens fornecidos pela RBS Criação sob sua guarda para exposição das peças.
            </p>

            <div className="space-y-3 text-xs">
              {data.comodatos.length === 0 ? (
                <p className="text-[#5A5863]">Nenhum expositor registrado para este parceiro.</p>
              ) : (
                data.comodatos.map((ca) => (
                  <div key={ca.id} className="rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-800">{ca.asset_code}</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {ca.condition_status}
                      </span>
                    </div>
                    <strong className="mt-1 block text-[#24232A]">{ca.asset_name}</strong>
                    <p className="mt-1 text-[#5A5863]">
                      Valor patrimonial segurado: {formatBRLFromCents(ca.declared_value_cents)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
