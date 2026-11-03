'use client';

import React from 'react';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export function LogoutButton({
  className = 'inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer',
  label = 'Sair da conta',
  showIcon = true,
}: LogoutButtonProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      window.localStorage.removeItem('rbs_auth_user');
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <button type="button" onClick={handleLogout} className={className} title="Encerrar sessão nesta máquina">
      {showIcon && <LogOut className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}
