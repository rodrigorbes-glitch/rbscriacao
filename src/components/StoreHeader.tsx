'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
} from 'lucide-react';

export function getVisitorSessionKey(): string {
  if (typeof window === 'undefined') return 'sess-default-visitor';
  let key = window.localStorage.getItem('rbs_session_key');
  if (!key) {
    key = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem('rbs_session_key', key);
  }
  return key;
}

export function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishCount, setWishCount] = useState<number>(0);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const sessionKey = getVisitorSessionKey();
        const res = await fetch(`/api/cart?sessionKey=${encodeURIComponent(sessionKey)}`);
        if (res.ok) {
          const data = await res.json();
          setCartCount(Number(data.active_items?.length || 0));
        }
        const localFavs = JSON.parse(window.localStorage.getItem('rbs_local_wishlist') || '[]');
        setWishCount(Array.isArray(localFavs) ? localFavs.length : 0);
      } catch {
        // ignore
      }
    };
    loadCounts();
    window.addEventListener('rbs-cart-updated', loadCounts);
    window.addEventListener('rbs-wishlist-updated', loadCounts);
    return () => {
      window.removeEventListener('rbs-cart-updated', loadCounts);
      window.removeEventListener('rbs-wishlist-updated', loadCounts);
    };
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
    setMobileOpen(false);
    setMobileSearchOpen(false);
  };

  const navLinks = [
    { href: '/catalogo', label: 'Catálogo' },
    { href: '/personalizados', label: 'Personalizados' },
    { href: '/empresas', label: 'Para empresas' },
    { href: '/sobre', label: 'O Estúdio' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6E2DA] bg-[#FCFBF8]/95 text-[#24232A] backdrop-blur-md">
      {/* Main Navigation Row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={mobileOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6E2DA] bg-white text-[#24232A] transition hover:bg-[#F2EFE9] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-3 py-1" aria-label="RBS Criação — Página inicial">
            <img
              src="/logo_rbs.png"
              alt="RBS Criação"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>
        </div>

        {/* Concise Desktop Navigation */}
        <nav className="hidden items-center gap-2 lg:flex" aria-label="Navegação principal">
          {navLinks.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[#F3EFFA] font-semibold text-[#563487]'
                    : 'text-[#24232A] hover:bg-[#F2EFE9]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Search + One-handed Mobile Actions */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar vasos, peças..."
                aria-label="Buscar objetos na loja"
                className="w-52 rounded-xl border border-[#E6E2DA] bg-white py-2 pr-9 pl-3.5 text-sm text-[#24232A] placeholder-[#6E6B78] transition focus:border-[#563487] focus:outline-none xl:w-64"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[#5A5863] hover:text-[#563487]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* One-handed mobile search button */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Buscar peças"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6E2DA] bg-white text-[#24232A] transition hover:bg-[#F2EFE9] md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href="/favoritos"
            aria-label="Peças salvas nos favoritos"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6E2DA] bg-white text-[#24232A] transition hover:border-[#563487]/40 hover:bg-[#F3EFFA] hover:text-[#563487]"
          >
            <Heart className="h-4 w-4" />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#563487] px-1 text-[11px] font-semibold text-white">
                {wishCount}
              </span>
            )}
          </Link>

          <Link
            href="/minha-conta"
            aria-label="Minha conta e pedidos"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6E2DA] bg-white text-[#24232A] transition hover:border-[#563487]/40 hover:bg-[#F3EFFA] hover:text-[#563487]"
          >
            <User className="h-4 w-4" />
          </Link>

          <Link
            href="/carrinho"
            aria-label={`Carrinho de compras (${cartCount} itens)`}
            className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-[#563487] px-3.5 text-sm font-medium text-white transition hover:bg-[#462970]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold text-white">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>

      {/* One-handed Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="border-t border-[#E6E2DA] bg-white px-4 py-3 md:hidden">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Qual peça você procura?"
              aria-label="Qual peça você procura?"
              autoFocus
              className="flex-1 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-base text-[#24232A] placeholder-[#6E6B78] focus:border-[#563487] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#563487] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#462970]"
            >
              Buscar
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#E6E2DA] bg-[#FCFBF8] px-4 py-4 lg:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar vasos, suportes, presentes..."
              className="flex-1 rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2.5 text-base text-[#24232A] placeholder-[#6E6B78]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#563487] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </form>

          <nav className="grid grid-cols-1 gap-1" aria-label="Menu mobile">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3.5 py-3 text-base font-medium text-[#24232A] hover:bg-[#F2EFE9]"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-[#E6E2DA]" />
            <Link
              href="/instagram"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#5A5863] hover:bg-[#F2EFE9] hover:text-[#24232A]"
            >
              Instagram @rbscriacao
            </Link>
            <Link
              href="/faq"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#5A5863] hover:bg-[#F2EFE9] hover:text-[#24232A]"
            >
              Dúvidas frequentes
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
