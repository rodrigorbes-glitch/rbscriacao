'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: '📊' },
  { name: 'PDV', path: '/admin/financeiro', icon: '💲' },
  { name: 'Pedidos da Loja', path: '/admin/pedidos', icon: '🛍️' },
  { name: 'Calculadora', path: '/admin/calculadora', icon: '🧮' },
  { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
  { name: 'Distribuidores', path: '/admin/distribuidores', icon: '🏢' },
  { name: 'Produtos', path: '/admin/produtos', icon: '📦' },
  { name: 'Configurações', path: '/admin/configuracoes', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">RBS Criação</span>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={cn('nav-item', isActive && 'nav-item--active')}
              style={{ textDecoration: 'none' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
