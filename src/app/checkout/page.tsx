'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  MapPin,
  CreditCard,
  QrCode,
  AlertCircle,
  CheckCircle2,
  ImageOff,
} from 'lucide-react';
import { StoreHeader, getVisitorSessionKey } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';
import type { SelectiveCartSummary } from '@/lib/cart-checkout';

export default function CheckoutPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SelectiveCartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Guest / Customer fields (preserved on error)
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');

  // Address with ViaCEP auto-fill + manual fallback
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('RJ');
  const [cepStatus, setCepStatus] = useState('');

  const [shippingServiceId, setShippingServiceId] = useState('sedex');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');

  useEffect(() => {
    const load = async () => {
      const sessionKey = getVisitorSessionKey();
      const res = await fetch(`/api/cart?sessionKey=${encodeURIComponent(sessionKey)}`);
      if (res.ok) {
        const data: SelectiveCartSummary = await res.json();
        setSummary(data);
        if (data.cep) setCep(data.cep);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLookupCep = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepStatus('Buscando endereço pelo CEP...');
    try {
      const res = await fetch(`/api/cep/${clean}`);
      if (res.ok) {
        const data = await res.json();
        if (data.street) setStreet(data.street);
        if (data.neighborhood) setNeighborhood(data.neighborhood);
        if (data.city) setCity(data.city);
        if (data.state) setStateUf(data.state);
        setCepStatus(
          data.manualFallback
            ? 'CEP validado. Preencha rua e bairro manualmente.'
            : `Endereço localizado (${data.city}/${data.state}).`
        );
      }
    } catch {
      setCepStatus('Preencha os campos de endereço manualmente.');
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !street.trim() ||
      !number.trim() ||
      !city.trim()
    ) {
      setErrorMsg(
        'Por favor, preencha os campos obrigatórios de identificação e endereço de entrega.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const sessionKey = getVisitorSessionKey();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey,
          customerName,
          customerEmail,
          customerPhone,
          customerCpfCnpj,
          shippingAddress: {
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUf,
          },
          shippingServiceId,
          paymentMethod,
          simulateImmediatePayment: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível concluir o pedido.');
        setSubmitting(false);
        return;
      }

      window.dispatchEvent(new Event('rbs-cart-updated'));
      router.push(
        `/pedido/${encodeURIComponent(data.orderId)}?claim=${encodeURIComponent(
          data.claimToken || ''
        )}`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro de conexão no checkout.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-[#E6E2DA] pb-5">
          <Link href="/carrinho" className="text-xs font-semibold text-[#563487] hover:underline">
            ← Voltar ao carrinho
          </Link>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A]">
            Finalizar pedido
          </h1>
          <p className="mt-1 text-sm text-[#5A5863]">
            Você pode concluir sua compra como visitante sem precisar criar senha agora.
          </p>
        </div>

        {loading || !summary ? (
          <div className="py-16 text-center text-sm text-[#5A5863]">Carregando resumo...</div>
        ) : !summary.can_checkout ? (
          <div className="mt-8 rounded-2xl border border-[#E6E2DA] bg-white p-8 text-center">
            <h2 className="font-display text-lg font-semibold text-[#24232A]">
              Nenhuma peça selecionada para compra
            </h2>
            <p className="mt-2 text-sm text-[#5A5863]">{summary.selection_message}</p>
            <Link
              href="/carrinho"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#563487] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Voltar ao carrinho
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleConfirmOrder}
            className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12"
          >
            {/* Left Column: Customer + Address + Payment */}
            <div className="space-y-6 lg:col-span-7">
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
                <h2 className="font-display text-base font-semibold text-[#24232A]">
                  1. Seus dados para envio e nota
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#24232A]">
                      Nome completo ou razão social *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Mariana Costa"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#24232A]">
                      E-mail para acompanhamento *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#24232A]">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#24232A]">
                      CPF ou CNPJ *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerCpfCnpj}
                      onChange={(e) => setCustomerCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#563487]" />
                  <h2 className="font-display text-base font-semibold text-[#24232A]">
                    2. Endereço de entrega
                  </h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#24232A]">CEP *</label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        required
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={(e) => handleLookupCep(e.target.value)}
                        placeholder="01310-100"
                        className="w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupCep(cep)}
                        className="rounded-xl border border-[#E6E2DA] bg-[#F2EFE9] px-3.5 py-2.5 text-xs font-semibold text-[#24232A] hover:border-[#563487] hover:text-[#563487]"
                      >
                        Buscar
                      </button>
                    </div>
                    {cepStatus && (
                      <span className="mt-1 block text-xs text-emerald-700">{cepStatus}</span>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-[#24232A]">
                      Rua / Avenida *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Nome da rua ou avenida"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#24232A]">Número *</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#24232A]">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, bloco, sala (opcional)"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#24232A]">Bairro *</label>
                    <input
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Seu bairro"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-[#24232A]">Cidade *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Sua cidade"
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#24232A]">UF *</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                      className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] uppercase focus:border-[#563487] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Shipping Mode Selector */}
                <div className="mt-6 space-y-2.5 border-t border-[#E6E2DA] pt-5">
                  <span className="block text-xs font-semibold text-[#24232A]">
                    Opção de entrega (prazo de preparo + envio):
                  </span>
                  {summary.shipping_options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition ${
                        shippingServiceId === opt.id
                          ? 'border-[#563487] bg-[#F3EFFA]/60 text-[#24232A] ring-1 ring-[#563487]'
                          : 'border-[#E6E2DA] bg-[#FCFBF8] text-[#24232A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingService"
                          value={opt.id}
                          checked={shippingServiceId === opt.id}
                          onChange={() => setShippingServiceId(opt.id)}
                          className="accent-[#563487]"
                        />
                        <div>
                          <strong className="block font-semibold text-[#24232A]">
                            {opt.name}
                          </strong>
                          <span className="text-[11px] text-[#5A5863]">
                            {opt.manufacturing_days}d de preparo + {opt.carrier_days}d de envio ={' '}
                            <strong className="text-[#563487]">{opt.total_days} dias úteis</strong>
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-[#24232A]">
                        {opt.price_cents === 0 ? 'Grátis' : formatBRLFromCents(opt.price_cents)}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
                <h2 className="font-display text-base font-semibold text-[#24232A]">
                  3. Forma de pagamento
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left text-xs transition ${
                      paymentMethod === 'pix'
                        ? 'border-[#563487] bg-[#F3EFFA]/60 text-[#24232A] ring-1 ring-[#563487]'
                        : 'border-[#E6E2DA] bg-[#FCFBF8] text-[#24232A]'
                    }`}
                  >
                    <QrCode className="h-6 w-6 shrink-0 text-[#563487]" />
                    <div>
                      <strong className="block text-sm font-semibold">Pix (5% de desconto)</strong>
                      <span className="text-[11px] text-[#5A5863]">
                        Aprovação imediata para iniciar o preparo
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left text-xs transition ${
                      paymentMethod === 'credit_card'
                        ? 'border-[#563487] bg-[#F3EFFA]/60 text-[#24232A] ring-1 ring-[#563487]'
                        : 'border-[#E6E2DA] bg-[#FCFBF8] text-[#24232A]'
                    }`}
                  >
                    <CreditCard className="h-6 w-6 shrink-0 text-[#563487]" />
                    <div>
                      <strong className="block text-sm font-semibold">
                        Cartão de crédito (até 6x)
                      </strong>
                      <span className="text-[11px] text-[#5A5863]">
                        Pagamento seguro via Mercado Pago
                      </span>
                    </div>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Value Summary */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-[#24232A]">
                  Resumo dos valores ({summary.selected_lines_count}{' '}
                  {summary.selected_lines_count === 1 ? 'peça' : 'peças'})
                </h2>

                <div className="mt-4 divide-y divide-[#E6E2DA]">
                  {summary.selected_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E6E2DA] bg-[#F2EFE9]">
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
                          <strong className="block font-semibold text-[#24232A]">
                            {item.quantity}x {item.product_name}
                          </strong>
                          <span className="text-[11px] text-[#5A5863]">
                            Preparo: {item.lead_time_days}d úteis
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-[#24232A]">
                        {formatBRLFromCents(item.line_total_cents)}
                      </span>
                    </div>
                  ))}
                </div>

                {summary.unselected_lines_count > 0 && (
                  <div className="mt-3 rounded-xl bg-[#F2EFE9] p-3 text-xs text-[#5A5863]">
                    <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-[#563487]" />
                    As outras <strong>{summary.unselected_lines_count} peças não marcadas</strong>{' '}
                    continuarão salvas no seu carrinho.
                  </div>
                )}

                <div className="mt-4 space-y-2 border-t border-[#E6E2DA] pt-4 text-sm">
                  <div className="flex justify-between text-[#5A5863]">
                    <span>Subtotal das peças</span>
                    <strong className="text-[#24232A]">
                      {formatBRLFromCents(summary.subtotal_cents)}
                    </strong>
                  </div>
                  {summary.discount_cents > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Cupom ({summary.coupon_code})</span>
                      <strong>− {formatBRLFromCents(summary.discount_cents)}</strong>
                    </div>
                  )}
                  {paymentMethod === 'pix' && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Desconto Pix (5%)</span>
                      <strong>− {formatBRLFromCents(summary.pix_discount_cents)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5A5863]">
                    <span>Entrega</span>
                    <strong className="text-[#24232A]">
                      {formatBRLFromCents(summary.shipping_cents)}
                    </strong>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-[#E6E2DA] pt-3 text-base font-bold text-[#24232A]">
                    <span>Total a pagar</span>
                    <span className="font-display text-2xl text-[#563487]">
                      {formatBRLFromCents(
                        paymentMethod === 'pix'
                          ? summary.total_pix_cents
                          : summary.total_credit_card_cents
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#563487] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#462970] disabled:opacity-50"
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span>
                    {submitting
                      ? 'Confirmando seu pedido...'
                      : `Confirmar pedido (${formatBRLFromCents(
                          paymentMethod === 'pix'
                            ? summary.total_pix_cents
                            : summary.total_credit_card_cents
                        )})`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
