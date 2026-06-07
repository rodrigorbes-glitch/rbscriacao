'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';

const navItems = [
  { name: 'Home', path: '/admin', icon: '📊' },
  { name: 'Finanças', path: '/admin/financeiro', icon: '💲' },
  { name: 'Vendas', path: '/admin/clientes', icon: '👥' },
  { name: 'Distrib', path: '/admin/distribuidores', icon: '🏢' },
  { name: 'Consig', path: '/admin/consignacoes', icon: '🤝' },
  { name: 'Produtos', path: '/admin/produtos', icon: '📦' },
  { name: 'Configs', path: '/admin/configuracoes', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={cn('bottom-nav-item', isActive && 'bottom-nav-item--active')}
            style={{ textDecoration: 'none' }}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
