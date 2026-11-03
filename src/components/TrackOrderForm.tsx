'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function TrackOrderForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim().replace(/^#/, '');
    if (!clean) return;
    router.push(`/pedido/${encodeURIComponent(clean)}`);
  };

  return (
    <form onSubmit={handleTrack} className="flex gap-2">
      <input
        type="text"
        required
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        placeholder="Ex: RBS-2026-1001"
        className="flex-1 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-xs text-[#24232A] focus:border-[#563487] focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#563487] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#462970] transition cursor-pointer"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rastrear</span>
      </button>
    </form>
  );
}
