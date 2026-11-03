'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Wallet,
  Megaphone,
  Handshake,
  Settings,
  BookOpen,
  ExternalLink,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

// Simplified Navigation according to Directive 5:
// Visão geral, Vendas, Produção e estoque, Financeiro, Marketing, Parceiros, Configurações e Ajuda.
const ADMIN_NAV = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Vendas', icon: ShoppingBag },
  { href: '/admin/producao', label: 'Produção & Estoque', icon: Boxes },
  { href: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/admin/parceiros', label: 'Parceiros', icon: Handshake },
  { href: '/admin/integracoes', label: 'Configurações', icon: Settings },
  { href: '/admin/ajuda', label: 'Ajuda', icon: BookOpen },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  React.useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchSession();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen bg-[#FCFBF8] text-[#24232A]">
      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E6E2DA] bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E6E2DA] px-5 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <img
              src="/logo_rbs.png"
              alt="Painel RBS Criação"
              className="h-8 w-auto object-contain"
            />
            <div>
              <span className="font-display block text-xs font-bold tracking-wide text-[#24232A]">
                PAINEL RBS
              </span>
              <span className="block text-[11px] font-medium text-[#563487]">
                Gestão & Estúdio 3D
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-[#5A5863] hover:bg-[#F2EFE9] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
          aria-label="Navegação do Painel RBS"
        >
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#563487] text-white shadow-2xs'
                    : 'text-[#24232A] hover:bg-[#F2EFE9]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E6E2DA] p-3 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-2 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
          >
            <span>Ver loja pública</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-[#5A5863] hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E6E2DA] bg-[#FCFBF8]/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu do painel"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E2DA] bg-white text-[#24232A] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <span className="text-xs font-semibold text-[#563487]">
                Painel RBS • Operação Autoral
              </span>
              <p className="text-[11px] text-[#5A5863]">
                Perfil:{' '}
                <strong className="text-[#24232A]">
                  {currentUser
                    ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Administrador' : currentUser.role})`
                    : 'Acesso Autorizado'}
                </strong>
                {currentUser && <span className="ml-1 text-[#6E6B78] font-mono">[{currentUser.email}]</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              title="Sair do painel"
            >
              Sair
            </button>
            <Link
              href="/admin/precificador"
              className="rounded-xl border border-[#E6E2DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
            >
              Precificador 3D
            </Link>
            <Link
              href="/admin/ajuda"
              className="rounded-xl border border-[#E6E2DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
            >
              Ajuda
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
