"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Percent, PackageCheck, Repeat, Plus, CheckCircle2, RotateCcw } from "lucide-react";
import { formatBRLFromCents } from "@/lib/format";

interface PartnerRow {
  id: string;
  partner_code: string;
  name: string;
  business_name: string | null;
  email: string;
  phone: string;
  city: string;
  state: string;
  partner_type: string;
  commission_rate_pct: string | number;
  coupon_code: string;
  customer_discount_pct: string | number;
  status: string;
}

interface ConsignmentItemRow {
  id: string;
  dispatched_qty: number;
  sold_qty: number;
  returned_qty: number;
  damaged_qty: number;
  agreed_unit_price_cents: number;
  partner_commission_pct: string | number;
  product_name: string;
  sku: string;
  shipment_code: string;
  partner_name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
}

export function AdminPartnersClient({
  partners,
  consignmentItems,
  products,
}: {
  partners: PartnerRow[];
  consignmentItems: ConsignmentItemRow[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form 1: New Consignment Dispatch or Recurring B2B Purchase
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || "");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [operationMode, setOperationMode] = useState<"consignment" | "recurring_purchase">("consignment");
  const [quantity, setQuantity] = useState("6");
  const [discountPct, setDiscountPct] = useState("20");

  // Form 2: New Partner Registration
  const [newName, setNewName] = useState("");
  const [newBusiness, setNewBusiness] = useState("");
  const [newCity, setNewCity] = useState("Rio de Janeiro");
  const [newState, setNewState] = useState("RJ");
  const [newType, setNewType] = useState("consignado_e_recorrente");
  const [newCommPct, setNewCommPct] = useState("20");
  const [newCustDiscPct, setNewCustDiscPct] = useState("5");
  const [newCoupon, setNewCoupon] = useState("");

  // Inline Rate Editor State per Partner
  const [ratesByPartner, setRatesByPartner] = useState<
    Record<string, { comm: string; disc: string; coupon: string; type: string }>
  >(() =>
    Object.fromEntries(
      partners.map((p) => [
        p.id,
        {
          comm: String(p.commission_rate_pct),
          disc: String(p.customer_discount_pct),
          coupon: p.coupon_code || p.partner_code,
          type: p.partner_type,
        },
      ])
    )
  );

  async function handleSavePartnerRates(partnerId: string) {
    const r = ratesByPartner[partnerId];
    if (!r) return;
    setBusyId(partnerId);
    setFeedback(null);
    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_partner_rates",
        partnerId,
        commissionRatePct: Number(r.comm),
        customerDiscountPct: Number(r.disc),
        couponCode: r.coupon,
        partnerType: r.type,
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (data.ok) {
      setFeedback("Percentuais de comissão, desconto e modalidade do parceiro atualizados com sucesso!");
      router.refresh();
    } else {
      setFeedback(`Erro: ${data.error}`);
    }
  }

  async function handleConsignmentMovement(consignmentItemId: string, movementType: "sale" | "return") {
    setBusyId(`${consignmentItemId}-${movementType}`);
    setFeedback(null);
    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_consignment_movement",
        consignmentItemId,
        movementType,
        qty: 1,
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (data.ok) {
      setFeedback(
        movementType === "sale"
          ? "Baixa de 1 unidade vendida em consignação registrada! Repasse líquido e comissão lançados no Financeiro."
          : "Retorno de 1 unidade da vitrine consignada registrado com sucesso!"
      );
      router.refresh();
    } else {
      setFeedback(`Erro: ${data.error}`);
    }
  }

  async function handleDispatchOrRecurring(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("dispatch-form");
    setFeedback(null);
    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dispatch_consignment_or_recurring",
        partnerId: selectedPartnerId,
        productId: selectedProductId,
        operationMode,
        quantity: Number(quantity),
        discountPct: Number(discountPct),
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (data.ok) {
      setFeedback(
        operationMode === "recurring_purchase"
          ? "Pedido de Compra Recorrente B2B/Revenda lançado com desconto de parceiro e integrado ao Contas a Receber!"
          : "Nova remessa de produtos em consignação enviada para o ponto físico do parceiro!"
      );
      router.refresh();
    } else {
      setFeedback(`Erro: ${data.error}`);
    }
  }

  async function handleCreatePartner(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("create-partner");
    setFeedback(null);
    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_partner",
        name: newName,
        businessName: newBusiness,
        city: newCity,
        state: newState,
        partnerType: newType,
        commissionRatePct: Number(newCommPct),
        customerDiscountPct: Number(newCustDiscPct),
        couponCode: newCoupon,
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (data.ok) {
      setFeedback("Novo parceiro / revendedor recorrente cadastrado com sucesso!");
      setNewName("");
      setNewBusiness("");
      setNewCoupon("");
      router.refresh();
    } else {
      setFeedback(`Erro: ${data.error}`);
    }
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Partner Rates, Recurring Discounts & Registration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-4 mb-4">
            <div>
              <span className="text-xs font-bold text-[#563487] uppercase">
                1. Administração de Percentuais, Comissões e Compras Recorrentes
              </span>
              <h2 className="mt-0.5 text-lg font-extrabold text-[#24232A]">
                Parceiros Credenciados, Lojas Consignadas & Revendedores Recorrentes
              </h2>
            </div>
            <Percent className="h-5 w-5 text-[#563487]" />
          </div>

          <div className="space-y-4">
            {partners.map((p) => {
              const rate = ratesByPartner[p.id] || {
                comm: String(p.commission_rate_pct),
                disc: String(p.customer_discount_pct),
                coupon: p.coupon_code,
                type: p.partner_type,
              };
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4 text-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-[#563487]">{p.partner_code}</span>
                      <h3 className="text-sm font-bold text-[#24232A]">{p.name}</h3>
                      <p className="text-[#5A5863]">
                        {p.business_name} • {p.city}/{p.state} • {p.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      {p.status === "active" ? "Ativo" : p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#E6E2DA]">
                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5863] uppercase mb-1">
                        Modalidade
                      </label>
                      <select
                        value={rate.type}
                        onChange={(e) =>
                          setRatesByPartner((prev) => ({
                            ...prev,
                            [p.id]: { ...rate, type: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-[#D5CFC4] bg-white px-2 py-1.5 text-xs text-[#24232A]"
                      >
                        <option value="consignado_e_afiliado">Consignação + Afiliado</option>
                        <option value="compra_recorrente_b2b">Compra Recorrente (Revenda)</option>
                        <option value="ponto_fisico_consignado">Ponto Físico Consignado</option>
                        <option value="arquiteto_especificador">Arquiteto Especificador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5863] uppercase mb-1">
                        Comissão / Desc. Revenda (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={rate.comm}
                        onChange={(e) =>
                          setRatesByPartner((prev) => ({
                            ...prev,
                            [p.id]: { ...rate, comm: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-xs font-bold text-[#563487]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5863] uppercase mb-1">
                        Desconto Cupom Cliente (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={rate.disc}
                        onChange={(e) =>
                          setRatesByPartner((prev) => ({
                            ...prev,
                            [p.id]: { ...rate, disc: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5863] uppercase mb-1">
                        Cupom / Código
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={rate.coupon}
                          onChange={(e) =>
                            setRatesByPartner((prev) => ({
                              ...prev,
                              [p.id]: { ...rate, coupon: e.target.value.toUpperCase() },
                            }))
                          }
                          className="w-full rounded-lg border border-[#D5CFC4] bg-white px-2 py-1.5 font-mono text-xs text-[#24232A] uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePartnerRates(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-lg bg-[#563487] hover:bg-[#462970] px-3 py-1.5 font-bold text-white transition shrink-0 cursor-pointer"
                        >
                          {busyId === p.id ? "..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Panel: Dispatch Consignment OR Recurring B2B Order + Register Partner */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="h-5 w-5 text-emerald-800" />
              <h2 className="text-base font-extrabold text-[#24232A]">
                Lançar Remessa Consignada ou Compra Recorrente
              </h2>
            </div>
            <p className="text-xs text-[#5A5863] mb-4">
              Envie peças para exposição em consignação ou gere um pedido de reposição recorrente com o desconto tabelado do parceiro.
            </p>

            <form onSubmit={handleDispatchOrRecurring} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#5A5863] mb-1">Tipo de Operação Comercial</label>
                <select
                  value={operationMode}
                  onChange={(e) => setOperationMode(e.target.value as any)}
                  className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] font-semibold"
                >
                  <option value="consignment">Remessa de Estoque em Consignação (Vitrine Parceira)</option>
                  <option value="recurring_purchase">Compra Recorrente de Revenda / Reposição B2B</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5A5863] mb-1">Parceiro / Loja</label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.commission_rate_pct}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5A5863] mb-1">Peça 3D do Catálogo</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                  >
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({formatBRLFromCents(prod.price_cents)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5A5863] mb-1">Quantidade (un)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#5A5863] mb-1">
                    {operationMode === "consignment" ? "Comissão Loja (%)" : "Desconto Recorrente (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#563487] font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busyId === "dispatch-form"}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-white transition cursor-pointer"
              >
                {busyId === "dispatch-form"
                  ? "Processando..."
                  : operationMode === "consignment"
                  ? "Enviar Peças para Consignação"
                  : "Gerar Faturamento de Compra Recorrente"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-5 w-5 text-[#563487]" />
              <h2 className="text-base font-extrabold text-[#24232A]">Cadastrar Novo Parceiro / Revendedor</h2>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Nome do Parceiro *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
                <input
                  type="text"
                  placeholder="Razão Social / Loja"
                  value={newBusiness}
                  onChange={(e) => setNewBusiness(e.target.value)}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Cupom (Ex: LOJA15)"
                  value={newCoupon}
                  onChange={(e) => setNewCoupon(e.target.value.toUpperCase())}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 font-mono text-[#24232A] uppercase"
                />
                <input
                  type="number"
                  placeholder="% Comissão"
                  value={newCommPct}
                  onChange={(e) => setNewCommPct(e.target.value)}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#563487] font-bold"
                />
                <input
                  type="number"
                  placeholder="% Desc. Cliente"
                  value={newCustDiscPct}
                  onChange={(e) => setNewCustDiscPct(e.target.value)}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-emerald-800 font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === "create-partner"}
                className="w-full rounded-xl bg-[#563487] hover:bg-[#462970] py-2 font-bold text-white transition cursor-pointer"
              >
                {busyId === "create-partner" ? "Cadastrando..." : "Credenciar Parceiro"}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* 2. Consignment Inventory & Sales Settlement Table */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase">
              2. Controle Operacional de Produtos e Vendas em Consignação
            </span>
            <h2 className="mt-0.5 text-lg font-extrabold text-[#24232A]">
              Peças em Vitrine nos Parceiros, Baixa de Vendas & Cálculo de Repasse Líquido
            </h2>
          </div>
          <PackageCheck className="h-5 w-5 text-emerald-800" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">Remessa / Parceiro</th>
                <th className="py-3 pr-3">Peça 3D / SKU</th>
                <th className="py-3 pr-3 text-center">Enviado</th>
                <th className="py-3 pr-3 text-center">Vendido</th>
                <th className="py-3 pr-3 text-center">Devolvido</th>
                <th className="py-3 pr-3 text-center">Saldo em Vitrine</th>
                <th className="py-3 pr-3">Preço & %</th>
                <th className="py-3 pr-3">Repasse Líquido RBS</th>
                <th className="py-3 text-right">Ações de Acerto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {consignmentItems.map((ci) => {
                const balanceQty =
                  ci.dispatched_qty - ci.sold_qty - ci.returned_qty - (ci.damaged_qty || 0);
                const grossSoldCents = ci.sold_qty * ci.agreed_unit_price_cents;
                const netRepasseCents = Math.round(
                  grossSoldCents * (1 - Number(ci.partner_commission_pct) / 100)
                );
                return (
                  <tr key={ci.id} className="hover:bg-[#F2EFE9]">
                    <td className="py-3.5 pr-3">
                      <span className="font-mono font-bold text-[#563487] block">{ci.shipment_code}</span>
                      <span className="text-[11px] text-[#5A5863]">{ci.partner_name}</span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <strong className="block text-[#24232A]">{ci.product_name}</strong>
                      <span className="text-[11px] text-[#6E6B78]">SKU: {ci.sku}</span>
                    </td>
                    <td className="py-3.5 pr-3 text-center font-bold">{ci.dispatched_qty} un</td>
                    <td className="py-3.5 pr-3 text-center font-bold text-emerald-800">{ci.sold_qty} un</td>
                    <td className="py-3.5 pr-3 text-center text-[#5A5863]">{ci.returned_qty} un</td>
                    <td className="py-3.5 pr-3 text-center">
                      <span className="rounded-lg bg-[#FCFBF8] border border-[#E6E2DA] px-2.5 py-1 font-bold text-[#24232A]">
                        {balanceQty} un
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <div>{formatBRLFromCents(ci.agreed_unit_price_cents)}</div>
                      <span className="text-[11px] text-[#563487]">-{ci.partner_commission_pct}% parceiro</span>
                    </td>
                    <td className="py-3.5 pr-3 font-black text-emerald-800">
                      {formatBRLFromCents(netRepasseCents)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={balanceQty <= 0 || busyId === `${ci.id}-sale`}
                          onClick={() => handleConsignmentMovement(ci.id, "sale")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-2.5 py-1.5 text-[11px] font-bold text-white transition cursor-pointer"
                        >
                          +1 Venda
                        </button>
                        <button
                          type="button"
                          disabled={balanceQty <= 0 || busyId === `${ci.id}-return`}
                          onClick={() => handleConsignmentMovement(ci.id, "return")}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D5CFC4] bg-white hover:bg-[#F2EFE9] disabled:opacity-40 px-2.5 py-1.5 text-[11px] font-bold text-[#5A5863] transition cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" /> Devolver
                        </button>
                      </div>
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
