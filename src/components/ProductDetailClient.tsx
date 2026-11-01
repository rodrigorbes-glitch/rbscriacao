'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Truck,
  Clock,
  BellRing,
  Check,
  Ruler,
  Info,
  ImageOff,
  ChevronDown,
  Rotate3d,
} from 'lucide-react';
import { formatBRLFromCents } from '@/lib/format';
import { getVisitorSessionKey } from './StoreHeader';
import { ModelViewer3D } from './ModelViewer3D';

export interface ProductVariationDTO {
  id: string;
  sku_variation: string;
  color_name: string;
  color_hex: string;
  material_override: string | null;
  size_label: string;
  price_delta_cents: number;
  stock_qty: number;
}

export interface ProductDetailDTO {
  id: string;
  sku: string;
  slug: string;
  name: string;
  subtitle: string | null;
  short_description: string;
  description: string;
  material: string;
  finish: string;
  availability_type: string;
  lead_time_days: number;
  dimensions_mm: string;
  dimensional_tolerance: string;
  weight_grams: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_qty: number;
  allow_customization: boolean;
  customization_instructions: string | null;
  max_custom_chars: number | null;
  care_instructions: string;
  layer_notice: string;
  license_origin: string;
  model_3d_glb_url: string | null;
  images_json: string;
}

export function ProductDetailClient({
  product,
  variations,
}: {
  product: ProductDetailDTO;
  variations: ProductVariationDTO[];
}) {
  const router = useRouter();
  let images: string[] = [];
  try {
    const parsed = JSON.parse(product.images_json || '[]');
    if (Array.isArray(parsed)) {
      images = parsed.filter((u) => typeof u === 'string' && u.trim().length > 0);
    }
  } catch {
    images = [];
  }

  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null);
  const [selectedVariationId, setSelectedVariationId] = useState<string>(
    variations[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [cep, setCep] = useState('');
  const [shippingQuote, setShippingQuote] = useState<
    Array<{ name: string; priceCents: number; carrierDays: number; mfgDays: number; totalDays: number }>
  >([]);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Interest alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertWhatsapp, setAlertWhatsapp] = useState('');
  const [alertType, setAlertType] = useState<'price_drop' | 'restock'>('price_drop');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertSavedMsg, setAlertSavedMsg] = useState('');

  const selectedVariation = variations.find((v) => v.id === selectedVariationId) || null;
  const unitPriceCents =
    Number(product.price_cents) + Number(selectedVariation?.price_delta_cents ?? 0);
  const pixPriceCents = Math.round(unitPriceCents * 0.95);

  const handleCalculateCep = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    const isRj = Number(clean.slice(0, 2)) >= 20 && Number(clean.slice(0, 2)) <= 28;
    const mfg = Number(product.lead_time_days || 1);
    setShippingQuote([
      {
        name: 'SEDEX Expresso (Correios)',
        priceCents: isRj ? 1690 : 2290,
        carrierDays: isRj ? 1 : 2,
        mfgDays: mfg,
        totalDays: mfg + (isRj ? 1 : 2),
      },
      {
        name: 'PAC Econômico (Correios)',
        priceCents: isRj ? 1290 : 1790,
        carrierDays: isRj ? 3 : 5,
        mfgDays: mfg,
        totalDays: mfg + (isRj ? 3 : 5),
      },
      {
        name: 'Retirada no Estúdio RBS (Duque de Caxias/RJ)',
        priceCents: 0,
        carrierDays: 0,
        mfgDays: mfg,
        totalDays: mfg,
      },
    ]);
  };

  const handleAddToCart = async (goToCart: boolean) => {
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        productId: product.id,
        variationId: selectedVariationId || null,
        quantity,
        selected: true,
        customText: customText.trim() || null,
      }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event('rbs-cart-updated'));
      if (goToCart) {
        router.push('/carrinho');
      } else {
        setAddedFeedback(true);
        setTimeout(() => setAddedFeedback(false), 2000);
      }
    }
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionKey = getVisitorSessionKey();
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe_interest_alert',
        sessionKey,
        productId: product.id,
        variationId: selectedVariationId || null,
        visitorEmail: alertEmail,
        visitorWhatsapp: alertWhatsapp,
        alertType,
        targetPriceCents: alertTargetPrice ? Math.round(Number(alertTargetPrice) * 100) : null,
        channel: alertWhatsapp ? 'both' : 'email',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setAlertSavedMsg(data.message);
    }
  };

  const imageLabels = ['Peça inteira', 'No ambiente', 'Detalhe do acabamento'];

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Left Column: Real Photography Gallery (Full piece first, then ambient and macro) */}
      <div className="space-y-4 lg:col-span-7">
        <div className="overflow-hidden rounded-2xl border border-[#E6E2DA] bg-[#F2EFE9]">
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.name}
              className="aspect-square w-full object-cover object-center"
            />
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center p-8 text-center text-[#5A5863]">
              <ImageOff className="mb-3 h-8 w-8 stroke-[1.5] text-[#8A8694]" />
              <span className="font-display text-base font-semibold text-[#24232A]">
                Imagem em atualização
              </span>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#5A5863]">
                Estamos finalizando a fotografia de estúdio desta peça. Todas as medidas, opções de
                cor e compra já estão disponíveis ao lado.
              </p>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-3">
            {images.map((imgUrl, idx) => {
              const isSelected = activeImage === imgUrl;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`overflow-hidden rounded-xl border bg-white p-1.5 text-left transition ${
                    isSelected
                      ? 'border-[#563487] ring-2 ring-[#563487]/20'
                      : 'border-[#E6E2DA] hover:border-[#C5BEB2]'
                  }`}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#F2EFE9]">
                    <img
                      src={imgUrl}
                      alt={`${product.name} — ${imageLabels[idx] || `Foto ${idx + 1}`}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1.5 block px-1 text-xs font-medium text-[#24232A]">
                    {imageLabels[idx] || `Ângulo ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Name, Price, Color, Lead time, Shipping, Buy CTA & On-demand Accordions */}
      <div className="space-y-6 lg:col-span-5">
        {/* 1. Name & Subtitle */}
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#563487] uppercase">
            {product.availability_type === 'ready_stock'
              ? 'Pronta entrega'
              : `Produção sob encomenda • ${product.lead_time_days} ${
                  product.lead_time_days === 1 ? 'dia útil' : 'dias úteis'
                }`}
          </p>
          <h1 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-[#24232A] sm:text-3xl">
            {product.name}
          </h1>
          {product.subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">{product.subtitle}</p>
          )}
        </div>

        {/* 2. Price & Production Lead Time */}
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-5">
          {product.compare_at_price_cents && product.compare_at_price_cents > unitPriceCents && (
            <span className="block text-xs text-[#6E6B78] line-through">
              De {formatBRLFromCents(product.compare_at_price_cents)}
            </span>
          )}
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#24232A]">
              {formatBRLFromCents(pixPriceCents)}
            </span>
            <span className="rounded-md bg-[#F3EFFA] px-2 py-0.5 text-xs font-semibold text-[#563487]">
              no Pix (5% de desconto)
            </span>
          </div>
          <p className="mt-1 text-xs text-[#5A5863]">
            ou <strong className="text-[#24232A]">{formatBRLFromCents(unitPriceCents)}</strong> em
            até 6x de {formatBRLFromCents(Math.ceil(unitPriceCents / 6))} sem juros
          </p>

          <div className="mt-4 flex items-start gap-2.5 border-t border-[#F2EFE9] pt-3.5 text-xs text-[#5A5863]">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#563487]" />
            <div>
              <strong className="font-semibold text-[#24232A]">
                Prazo de preparo no estúdio: {product.lead_time_days}{' '}
                {product.lead_time_days === 1 ? 'dia útil' : 'dias úteis'}
              </strong>
              <span className="block text-[#5A5863]">
                Calculado separadamente do prazo de entrega dos Correios ou transportadora.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Escolher cor / variação */}
        {variations.length > 0 && (
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-[#24232A]">
              Escolher cor e tamanho
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {variations.map((v) => {
                const active = v.id === selectedVariationId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariationId(v.id)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-xl border p-3 text-left text-xs transition ${
                      active
                        ? 'border-[#563487] bg-[#F3EFFA]/60 text-[#24232A] ring-1 ring-[#563487]'
                        : 'border-[#E6E2DA] bg-white text-[#24232A] hover:border-[#C5BEB2]'
                    }`}
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: v.color_hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[#24232A]">
                        {v.color_name}
                      </span>
                      <span className="text-[11px] text-[#5A5863]">
                        {v.size_label}{' '}
                        {v.price_delta_cents > 0
                          ? `(+${formatBRLFromCents(v.price_delta_cents)})`
                          : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Personalização opcional na peça */}
        {product.allow_customization && (
          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-4">
            <label
              htmlFor="custom-engraving-input"
              className="block text-sm font-semibold text-[#24232A]"
            >
              Personalizar gravação na peça (opcional)
            </label>
            <p className="mt-0.5 text-xs text-[#5A5863]">
              {product.customization_instructions}
            </p>
            <input
              id="custom-engraving-input"
              type="text"
              maxLength={product.max_custom_chars || 30}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Digite o nome, data ou iniciais (ou deixe em branco)"
              className="mt-2.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] placeholder-[#6E6B78] focus:border-[#563487] focus:outline-none"
            />
          </div>
        )}

        {/* 5. Ação de compra */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center rounded-xl border border-[#E6E2DA] bg-white">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-full px-3.5 text-base font-semibold text-[#24232A] hover:bg-[#F2EFE9]"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-semibold text-[#24232A]">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-full px-3.5 text-base font-semibold text-[#24232A] hover:bg-[#F2EFE9]"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAddToCart(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#563487] px-6 text-sm font-semibold text-white transition hover:bg-[#462970]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Adicionar e ir ao carrinho</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAddToCart(false)}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#E6E2DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
            >
              {addedFeedback ? (
                <>
                  <Check className="h-4 w-4 text-emerald-700" />
                  <span>Adicionado ao carrinho</span>
                </>
              ) : (
                <span>Adicionar e continuar escolhendo</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAlertOpen((prev) => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2.5 text-xs font-medium text-[#5A5863] transition hover:border-[#563487] hover:text-[#563487]"
            >
              <BellRing className="h-4 w-4" />
              <span>Avise-me sobre preço</span>
            </button>
          </div>
        </div>

        {/* Interest Alert Form */}
        {alertOpen && (
          <form
            onSubmit={handleSaveAlert}
            className="space-y-3 rounded-2xl border border-[#E6E2DA] bg-white p-4"
          >
            <div className="text-xs font-semibold text-[#24232A]">
              Receber aviso de promoção ou reposição desta peça
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="email"
                required
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="Seu e-mail *"
                className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
              />
              <input
                type="text"
                value={alertWhatsapp}
                onChange={(e) => setAlertWhatsapp(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
              />
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as 'price_drop' | 'restock')}
                className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
              >
                <option value="price_drop">Avise-me se entrar em oferta</option>
                <option value="restock">Avise-me quando houver reposição</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={alertTargetPrice}
                onChange={(e) => setAlertTargetPrice(e.target.value)}
                placeholder="Valor desejado (R$) opcional"
                className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#563487] px-4 py-2 text-xs font-semibold text-white hover:bg-[#462970]"
            >
              Salvar aviso
            </button>
            {alertSavedMsg && (
              <p className="text-xs font-semibold text-emerald-700">{alertSavedMsg}</p>
            )}
          </form>
        )}

        {/* 6. Calcular entrega (CEP) */}
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-4">
          <form onSubmit={handleCalculateCep} className="space-y-2">
            <label htmlFor="cep-calculator-input" className="flex items-center gap-2 text-xs font-semibold text-[#24232A]">
              <Truck className="h-4 w-4 text-[#563487]" />
              <span>Calcular entrega e prazo</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="cep-calculator-input"
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Digite seu CEP (ex: 01310-100)"
                className="flex-1 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] placeholder-[#6E6B78] focus:border-[#563487] focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[42px] rounded-xl border border-[#E6E2DA] bg-[#F2EFE9] px-4 py-2.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
              >
                Calcular entrega
              </button>
            </div>
          </form>

          {shippingQuote.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-[#F2EFE9] pt-3 text-xs">
              {shippingQuote.map((sq, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3"
                >
                  <div>
                    <span className="font-semibold text-[#24232A]">{sq.name}</span>
                    <span className="block text-[11px] text-[#5A5863]">
                      {sq.mfgDays}d de preparo + {sq.carrierDays}d de envio ={' '}
                      <strong className="text-[#563487]">{sq.totalDays} dias úteis</strong>
                    </span>
                  </div>
                  <span className="font-semibold text-[#24232A]">
                    {sq.priceCents === 0 ? 'Grátis' : formatBRLFromCents(sq.priceCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Sob demanda: Ver medidas e especificações / Cuidados / Visualização 3D */}
        <div className="divide-y divide-[#E6E2DA] rounded-2xl border border-[#E6E2DA] bg-white">
          <details className="group p-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#24232A]">
              <span className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-[#563487]" />
                <span>Ver medidas e material</span>
              </span>
              <ChevronDown className="h-4 w-4 text-[#5A5863] transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-3 text-xs text-[#5A5863]">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <span className="block text-[11px] text-[#6E6B78]">Medidas externas</span>
                  <strong className="text-sm text-[#24232A]">{product.dimensions_mm}</strong>
                </div>
                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <span className="block text-[11px] text-[#6E6B78]">Peso aproximado</span>
                  <strong className="text-sm text-[#24232A]">{product.weight_grams} g</strong>
                </div>
                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <span className="block text-[11px] text-[#6E6B78]">Material e acabamento</span>
                  <strong className="text-sm text-[#24232A]">
                    {product.material} • {product.finish}
                  </strong>
                </div>
                <div className="rounded-xl bg-[#FCFBF8] p-3 border border-[#E6E2DA]">
                  <span className="block text-[11px] text-[#6E6B78]">Precisão dimensional</span>
                  <strong className="text-sm text-[#24232A]">{product.dimensional_tolerance}</strong>
                </div>
              </div>
              <p className="leading-relaxed text-[#5A5863]">
                Código da peça: <span className="font-medium text-[#24232A]">{selectedVariation?.sku_variation || product.sku}</span>
              </p>
            </div>
          </details>

          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#24232A]">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#563487]" />
                <span>Cuidados e textura da peça</span>
              </span>
              <ChevronDown className="h-4 w-4 text-[#5A5863] transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#5A5863]">
              <p>
                <strong className="text-[#24232A]">Conservação:</strong> {product.care_instructions}
              </p>
              <p>
                <strong className="text-[#24232A]">Acabamento em camadas:</strong> {product.layer_notice}
              </p>
            </div>
          </details>

          {product.model_3d_glb_url && (
            <details className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#24232A]">
                <span className="flex items-center gap-2">
                  <Rotate3d className="h-4 w-4 text-[#563487]" />
                  <span>Visualização 3D interativa</span>
                </span>
                <ChevronDown className="h-4 w-4 text-[#5A5863] transition group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                <ModelViewer3D
                  glbUrl={product.model_3d_glb_url}
                  productName={product.name}
                  dimensionsMm={product.dimensions_mm}
                  material={product.material}
                />
              </div>
            </details>
          )}
        </div>

        {/* Link to Custom Piece */}
        <div className="rounded-xl bg-[#F2EFE9] px-4 py-3 text-xs text-[#5A5863]">
          Deseja esta peça em outra medida ou cor especial?{' '}
          <Link href="/personalizados" className="font-semibold text-[#563487] underline">
            Pedir uma peça personalizada
          </Link>
        </div>
      </div>
    </div>
  );
}
