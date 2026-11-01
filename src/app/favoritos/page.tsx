'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, RefreshCw, Trash2, ImageOff } from 'lucide-react';
import { StoreHeader, getVisitorSessionKey } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';

interface WishlistItemDTO {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  material: string;
  finish: string;
  price_cents: number;
  availability_type: string;
  lead_time_days: number;
  images_json: string;
}

export default function FavoritosPage() {
  const [items, setItems] = useState<WishlistItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');

  const loadFavorites = useCallback(async () => {
    const sessionKey = getVisitorSessionKey();
    const localIds: string[] = JSON.parse(
      window.localStorage.getItem('rbs_local_wishlist') || '[]'
    );

    if (localIds.length > 0) {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge_local_wishlist',
          sessionKey,
          productIds: localIds,
        }),
      });
    }

    const res = await fetch(`/api/wishlist?sessionKey=${encodeURIComponent(sessionKey)}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (productId: string) => {
    const sessionKey = getVisitorSessionKey();
    const localIds: string[] = JSON.parse(
      window.localStorage.getItem('rbs_local_wishlist') || '[]'
    );
    window.localStorage.setItem(
      'rbs_local_wishlist',
      JSON.stringify(localIds.filter((id) => id !== productId))
    );
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, productId }),
    });
    await loadFavorites();
    window.dispatchEvent(new Event('rbs-wishlist-updated'));
  };

  const handleMoveToCart = async (productId: string) => {
    const sessionKey = getVisitorSessionKey();
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, productId, quantity: 1, selected: true }),
    });
    window.dispatchEvent(new Event('rbs-cart-updated'));
    setSyncMessage('Peça adicionada ao seu carrinho.');
    setTimeout(() => setSyncMessage(''), 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Lista de desejos
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A]">
              Peças favoritas
            </h1>
            <p className="mt-1 text-sm text-[#5A5863]">
              Suas peças favoritas ficam salvas neste navegador. Entre na sua conta quando quiser
              acessá-las em outro aparelho.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E6E2DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#563487]" />
            <span>Entrar para sincronizar</span>
          </Link>
        </div>

        {syncMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
            {syncMessage}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-[#5A5863]">Carregando favoritos...</div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#E6E2DA] bg-white p-10 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#563487]" />
            <h2 className="font-display mt-4 text-xl font-semibold text-[#24232A]">
              Sua lista de favoritos está vazia
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5A5863]">
              Toque no ícone de coração nas peças do catálogo para guardá-las aqui.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#563487] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              let imgs: string[] = [];
              try {
                const parsed = JSON.parse(item.images_json || '[]');
                if (Array.isArray(parsed)) {
                  imgs = parsed.filter((u) => typeof u === 'string' && u.trim().length > 0);
                }
              } catch {
                imgs = [];
              }
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E6E2DA] bg-white p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#E6E2DA] bg-[#F2EFE9]">
                      {imgs[0] ? (
                        <img
                          src={imgs[0]}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[10px] text-[#6E6B78]">
                          <ImageOff className="h-4 w-4 text-[#8A8694]" />
                          <span>Em atualização</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-[#5A5863]">
                        {item.material} • {item.finish}
                      </span>
                      <Link
                        href={`/produto/${item.slug}`}
                        className="font-display mt-0.5 block text-base font-semibold text-[#24232A] hover:text-[#563487]"
                      >
                        {item.name}
                      </Link>
                      <span className="mt-2 block text-base font-bold text-[#24232A]">
                        {formatBRLFromCents(Math.round(item.price_cents * 0.95))} no Pix
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-[#E6E2DA] pt-3">
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(item.product_id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#563487] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#462970]"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Adicionar ao carrinho</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.product_id)}
                      aria-label="Remover dos favoritos"
                      className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-2.5 text-[#5A5863] hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
