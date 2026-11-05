'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Check, ImageOff, ArrowRight } from 'lucide-react';
import { formatBRLFromCents } from '@/lib/format';
import { getVisitorSessionKey } from './StoreHeader';

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  material: string;
  finish: string;
  availability_type: string;
  lead_time_days: number;
  price_cents: number;
  compare_at_price_cents?: number | null;
  images_json: string;
  stock_qty: number;
  allow_customization?: boolean;
}

const PRODUCTS_WITH_COLOR_OPTIONS = new Set([
  'prod-vaso-furta-cor',
  'prod-cachepot-autodrenante',
  'prod-vaso-voronoi',
  'prod-vaso-sensations',
  'prod-luminaria-lua',
  'prod-chaveiro-nfc-lote',
]);

export function ProductCard({ product }: { product: ProductCardProps }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [favorited, setFavorited] = useState(false);

  let images: string[] = [];
  try {
    const parsed = JSON.parse(product.images_json || '[]');
    if (Array.isArray(parsed)) {
      images = parsed.filter((u) => typeof u === 'string' && u.trim().length > 0);
    }
  } catch {
    images = [];
  }

  const coverImage = images[0] || null;
  const pixPriceCents = Math.round(product.price_cents * 0.95);
  const requiresOptions =
    Boolean(product.allow_customization) || PRODUCTS_WITH_COLOR_OPTIONS.has(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const sessionKey = getVisitorSessionKey();
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey,
          productId: product.id,
          quantity: 1,
          selected: true,
        }),
      });
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event('rbs-cart-updated'));
        setTimeout(() => setAdded(false), 1800);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    const sessionKey = getVisitorSessionKey();
    const localFavs: string[] = JSON.parse(
      window.localStorage.getItem('rbs_local_wishlist') || '[]'
    );
    let updated: string[];
    if (localFavs.includes(product.id)) {
      updated = localFavs.filter((id) => id !== product.id);
      setFavorited(false);
    } else {
      updated = [...localFavs, product.id];
      setFavorited(true);
    }
    window.localStorage.setItem('rbs_local_wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('rbs-wishlist-updated'));

    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, productId: product.id }),
    });
  };

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white transition duration-200 hover:border-[#C5BEB2] hover:shadow-md">
      <div>
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F2EFE9]">
          <Link
            href={`/produto/${product.slug}`}
            className="block h-full w-full"
            aria-label={`Ver detalhes de ${product.name}`}
          >
            {coverImage ? (
              /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(coverImage) ? (
                <video
                  src={coverImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <img
                  src={coverImage}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                />
              )
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-[#6E6B78]">
                <ImageOff className="mb-2 h-6 w-6 stroke-[1.5] text-[#8A8694]" />
                <span className="text-xs font-medium text-[#5A5863]">
                  Imagem em atualização
                </span>
                <span className="mt-1 text-[11px] text-[#6E6B78]">
                  Fotografia de estúdio em preparo
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={`Salvar ${product.name} nos favoritos`}
            className={`absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
              favorited
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-[#E6E2DA] bg-white/90 text-[#24232A] backdrop-blur-xs hover:border-[#563487] hover:text-[#563487]'
            }`}
          >
            <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="p-5 pb-3">
          <p className="text-xs font-medium text-[#5A5863]">
            {product.availability_type === 'ready_stock'
              ? 'Pronta entrega'
              : `Produção em ${product.lead_time_days} ${
                  product.lead_time_days === 1 ? 'dia útil' : 'dias úteis'
                }`}
          </p>

          <Link href={`/produto/${product.slug}`} className="mt-1.5 block">
            <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug text-[#24232A] transition group-hover:text-[#563487]">
              {product.name}
            </h3>
          </Link>

          {product.subtitle && (
            <p className="mt-1 line-clamp-1 text-xs text-[#6E6B78]">{product.subtitle}</p>
          )}
        </div>
      </div>

      <div className="px-5 pt-2 pb-5">
        <div className="border-t border-[#F2EFE9] pt-3">
          {product.compare_at_price_cents &&
            product.compare_at_price_cents > product.price_cents && (
              <span className="block text-xs text-[#6E6B78] line-through">
                {formatBRLFromCents(product.compare_at_price_cents)}
              </span>
            )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-[#24232A]">
              {formatBRLFromCents(pixPriceCents)}
            </span>
            <span className="text-xs font-medium text-[#5A5863]">no Pix (5% off)</span>
          </div>
          <span className="block text-xs text-[#6E6B78]">
            ou {formatBRLFromCents(product.price_cents)} em até 6x sem juros
          </span>
        </div>

        <div className="mt-4">
          {requiresOptions ? (
            <Link
              href={`/produto/${product.slug}`}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#563487] bg-white px-4 py-2.5 text-sm font-semibold text-[#563487] transition hover:bg-[#563487] hover:text-white"
            >
              <span>Escolher opções</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled={adding}
              onClick={handleAddToCart}
              className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                added
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#563487] text-white hover:bg-[#462970]'
              }`}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Adicionado</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>{adding ? 'Adicionando...' : 'Adicionar'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
