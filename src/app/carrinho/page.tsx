'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  Bookmark,
  CheckSquare,
  Square,
  Clock,
  Tag,
  ArrowRight,
  AlertCircle,
  ImageOff,
} from 'lucide-react';
import { StoreHeader, getVisitorSessionKey } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';
import type { SelectiveCartSummary } from '@/lib/cart-checkout';

export default function CarrinhoSeletivoPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SelectiveCartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cepInput, setCepInput] = useState('');
  const [couponInput, setCouponInput] = useState('');

  const loadCart = useCallback(async () => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch(`/api/cart?sessionKey=${encodeURIComponent(sessionKey)}`);
    if (res.ok) {
      const data: SelectiveCartSummary = await res.json();
      setSummary(data);
      if (data.cep) setCepInput(data.cep);
      if (data.coupon_code) setCouponInput(data.coupon_code);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleToggleItem = async (itemId: string, selected: boolean) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_item', sessionKey, itemId, selected }),
    });
    if (res.ok) {
      setSummary(await res.json());
      window.dispatchEvent(new Event('rbs-cart-updated'));
    }
  };

  const handleToggleAll = async (selected: boolean) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_all', sessionKey, selected }),
    });
    if (res.ok) {
      setSummary(await res.json());
    }
  };

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_quantity', sessionKey, itemId, quantity }),
    });
    if (res.ok) {
      setSummary(await res.json());
    }
  };

  const handleSaveForLater = async (itemId: string, savedForLater: boolean) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_for_later', sessionKey, itemId, savedForLater }),
    });
    if (res.ok) {
      setSummary(await res.json());
      window.dispatchEvent(new Event('rbs-cart-updated'));
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch(
      `/api/cart?sessionKey=${encodeURIComponent(sessionKey)}&itemId=${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      setSummary(await res.json());
      window.dispatchEvent(new Event('rbs-cart-updated'));
    }
  };

  const handleUpdateLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_logistics',
        sessionKey,
        cep: cepInput,
        couponCode: couponInput,
      }),
    });
    if (res.ok) {
      setSummary(await res.json());
    }
  };

  const allSelected =
    summary &&
    summary.active_items.length > 0 &&
    summary.selected_items.length === summary.active_items.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-[#E6E2DA] pb-6">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Sacola de compras
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A]">
            Meu carrinho
          </h1>
          <p className="mt-1 text-sm text-[#5A5863]">
            Marque as peças que deseja levar agora. As demais continuam guardadas para a sua próxima visita.
          </p>
        </div>

        {loading || !summary ? (
          <div className="py-16 text-center text-sm text-[#5A5863]">
            Carregando seu carrinho...
          </div>
        ) : summary.active_items.length === 0 && summary.saved_for_later_items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#E6E2DA] bg-white p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#563487]" />
            <h2 className="font-display mt-4 text-xl font-semibold text-[#24232A]">
              Seu carrinho está vazio
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5A5863]">
              Conheça nossas peças em destaque ou explore o catálogo completo para escolher as suas.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/catalogo"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#563487] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
              >
                Explorar a coleção
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: Active Cart Items + Saved For Later */}
            <div className="space-y-6 lg:col-span-8">
              {summary.active_items.length > 0 && (
                <div className="rounded-2xl border border-[#E6E2DA] bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E2DA] pb-4">
                    <button
                      type="button"
                      onClick={() => handleToggleAll(!allSelected)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#24232A] hover:text-[#563487]"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-5 w-5 text-[#563487]" />
                      ) : (
                        <Square className="h-5 w-5 text-[#8A8694]" />
                      )}
                      <span>
                        Selecionar todas ({summary.selected_lines_count} de{' '}
                        {summary.active_items.length} marcadas)
                      </span>
                    </button>

                    <span className="text-xs text-[#5A5863]">{summary.selection_message}</span>
                  </div>

                  <div className="divide-y divide-[#E6E2DA]">
                    {summary.active_items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-4 py-5 sm:flex-row sm:items-center ${
                          item.selected ? 'opacity-100' : 'opacity-65'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.id, !item.selected)}
                          aria-label={`Selecionar ${item.product_name} para esta compra`}
                          className="flex items-center gap-3.5 text-left"
                        >
                          {item.selected ? (
                            <CheckSquare className="h-5 w-5 shrink-0 text-[#563487]" />
                          ) : (
                            <Square className="h-5 w-5 shrink-0 text-[#8A8694]" />
                          )}
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E6E2DA] bg-[#F2EFE9]">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-[10px] text-[#6E6B78]">
                                <ImageOff className="h-4 w-4 text-[#8A8694]" />
                                <span>Sem foto</span>
                              </div>
                            )}
                          </div>
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                item.selected
                                  ? 'bg-[#F3EFFA] text-[#563487]'
                                  : 'bg-[#F2EFE9] text-[#5A5863]'
                              }`}
                            >
                              {item.selected ? 'Selecionado para compra' : 'Guardado no carrinho'}
                            </span>
                            <span className="text-xs text-[#5A5863]">
                              Preparo: {item.lead_time_days}{' '}
                              {item.lead_time_days === 1 ? 'dia útil' : 'dias úteis'}
                            </span>
                          </div>

                          <Link
                            href={`/produto/${item.product_slug}`}
                            className="font-display block text-base font-semibold text-[#24232A] hover:text-[#563487]"
                          >
                            {item.product_name}
                          </Link>

                          {item.variation_label && (
                            <p className="text-xs text-[#5A5863]">Opção: {item.variation_label}</p>
                          )}
                          {item.custom_text && (
                            <p className="text-xs font-medium text-[#563487]">
                              Personalização: &ldquo;{item.custom_text}&rdquo;
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 pt-2">
                            <div className="inline-flex h-9 items-center rounded-lg border border-[#E6E2DA] bg-[#FCFBF8]">
                              <button
                                type="button"
                                aria-label="Diminuir quantidade"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="px-3 py-1 text-sm font-semibold text-[#24232A] hover:bg-[#F2EFE9]"
                              >
                                −
                              </button>
                              <span className="px-2.5 text-xs font-semibold text-[#24232A]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Aumentar quantidade"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="px-3 py-1 text-sm font-semibold text-[#24232A] hover:bg-[#F2EFE9]"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveForLater(item.id, true)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#563487] hover:underline"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                              <span>Guardar para depois</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-[#5A5863] hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="font-display block text-base font-bold text-[#24232A]">
                            {formatBRLFromCents(item.line_total_cents)}
                          </span>
                          <span className="text-xs text-[#5A5863]">
                            {formatBRLFromCents(item.unit_price_cents)} cada
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved for Later List */}
              {summary.saved_for_later_items.length > 0 && (
                <div className="rounded-2xl border border-[#E6E2DA] bg-white p-5 sm:p-6">
                  <h2 className="font-display text-base font-semibold text-[#24232A]">
                    Guardados para depois ({summary.saved_for_later_items.length})
                  </h2>
                  <div className="mt-4 divide-y divide-[#E6E2DA]">
                    {summary.saved_for_later_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-[#E6E2DA] bg-[#F2EFE9]">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageOff className="h-4 w-4 text-[#8A8694]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#24232A]">
                              {item.product_name}
                            </h3>
                            <span className="text-xs font-medium text-[#5A5863]">
                              {formatBRLFromCents(item.unit_price_cents)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveForLater(item.id, false)}
                          className="rounded-xl border border-[#563487] px-3.5 py-2 text-xs font-semibold text-[#563487] transition hover:bg-[#563487] hover:text-white"
                        >
                          Voltar ao carrinho
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Exclusive Selected Summary */}
            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-[#24232A]">
                  Resumo da seleção ({summary.selected_units_count}{' '}
                  {summary.selected_units_count === 1 ? 'item' : 'itens'})
                </h2>
                <p className="mt-0.5 text-xs text-[#5A5863]">
                  Calculado apenas sobre as peças marcadas.
                </p>

                {/* Coupon + CEP Form */}
                <form
                  onSubmit={handleUpdateLogistics}
                  className="mt-4 space-y-3 border-y border-[#E6E2DA] py-4"
                >
                  <div>
                    <label htmlFor="cart-cep-input" className="block text-xs font-semibold text-[#24232A]">
                      Calcular entrega (CEP)
                    </label>
                    <input
                      id="cart-cep-input"
                      type="text"
                      value={cepInput}
                      onChange={(e) => setCepInput(e.target.value)}
                      placeholder="Ex: 25020-140"
                      className="mt-1 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="cart-coupon-input" className="block text-xs font-semibold text-[#24232A]">
                      Cupom de desconto
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="cart-coupon-input"
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Código do cupom"
                        className="flex-1 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] uppercase focus:border-[#563487] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-[#E6E2DA] bg-[#F2EFE9] px-4 py-2.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </form>

                {/* Breakdown exclusively for selected items */}
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-[#5A5863]">
                    <span>Subtotal ({summary.selected_lines_count} selecionados)</span>
                    <strong className="text-[#24232A]">
                      {formatBRLFromCents(summary.subtotal_cents)}
                    </strong>
                  </div>

                  {summary.discount_cents > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        <span>Cupom ({summary.coupon_code})</span>
                      </span>
                      <strong>− {formatBRLFromCents(summary.discount_cents)}</strong>
                    </div>
                  )}

                  <div className="flex justify-between text-[#5A5863]">
                    <span>Entrega estimada</span>
                    <strong className="text-[#24232A]">
                      {summary.selected_lines_count === 0
                        ? 'R$ 0,00'
                        : summary.shipping_cents === 0
                          ? 'Grátis'
                          : formatBRLFromCents(summary.shipping_cents)}
                    </strong>
                  </div>

                  {summary.selected_lines_count > 0 && (
                    <div className="rounded-xl bg-[#F2EFE9] p-3 text-xs text-[#5A5863]">
                      <div className="flex items-center gap-1.5 font-semibold text-[#24232A]">
                        <Clock className="h-3.5 w-3.5 text-[#563487]" />
                        <span>Prazo estimado da seleção</span>
                      </div>
                      <p className="mt-1">
                        {summary.manufacturing_days}d úteis de preparo + {summary.shipping_days}d
                        úteis de envio ={' '}
                        <strong className="text-[#563487]">
                          {summary.total_delivery_days} dias úteis
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="border-t border-[#E6E2DA] pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-[#5A5863]">Total no cartão</span>
                      <span className="text-base font-bold text-[#24232A]">
                        {formatBRLFromCents(summary.total_credit_card_cents)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-[#563487]">
                      <span className="text-sm font-semibold">Total no Pix (5% off)</span>
                      <span className="font-display text-xl font-bold">
                        {formatBRLFromCents(summary.total_pix_cents)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary CTA with Zero-Selection Guard */}
                <div className="mt-5">
                  {summary.can_checkout ? (
                    <button
                      type="button"
                      onClick={() => router.push('/checkout')}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#563487] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#462970]"
                    >
                      <span>Continuar com os selecionados ({summary.selected_units_count})</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        className="min-h-[48px] w-full cursor-not-allowed rounded-xl bg-[#E6E2DA] px-5 py-3.5 text-sm font-semibold text-[#6E6B78]"
                      >
                        Continuar com os selecionados (0)
                      </button>
                      <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <span>
                          Marque pelo menos uma peça ao lado para prosseguir com a compra.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {summary.unselected_lines_count > 0 && (
                  <p className="mt-3 text-center text-xs text-[#5A5863]">
                    As {summary.unselected_lines_count} peças não marcadas continuarão salvas no
                    carrinho.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
