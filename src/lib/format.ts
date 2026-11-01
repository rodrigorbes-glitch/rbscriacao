export function formatBRLFromCents(cents: number | null | undefined): string {
  const safe = Number(cents ?? 0) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
}

export function formatBRL(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0));
}

export function formatGramsAndKg(grams: number): string {
  const g = Math.round(Number(grams || 0));
  const kg = (g / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${g.toLocaleString('pt-BR')} g (${kg} kg)`;
}

export function formatDateBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

export function formatDateTimeBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

export const FINANCIAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando pagamento', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  authorized: { label: 'Autorizado', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  paid: { label: 'Pago', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  reconciled: { label: 'Pago e conciliado', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  partially_refunded: { label: 'Reembolso parcial', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  refunded: { label: 'Reembolsado', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  failed: { label: 'Recusado', color: 'bg-red-50 text-red-800 border-red-200' },
  expired: { label: 'Expirado', color: 'bg-stone-100 text-stone-700 border-stone-300' },
  cancelled: { label: 'Cancelado', color: 'bg-stone-100 text-stone-600 border-stone-300' },
};

export const PRODUCTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Aguardando pagamento', color: 'bg-stone-100 text-stone-700 border-stone-300' },
  queued: { label: 'Na fila de impressão', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  printing: { label: 'Em impressão 3D', color: 'bg-[#F3EFFA] text-[#563487] border-[#D8CEEA]' },
  post_processing: { label: 'Acabamento e revisão', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  ready_to_ship: { label: 'Pronto para envio', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  shipped: { label: 'Enviado', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

export const FULFILLMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unfulfilled: { label: 'Em preparo', color: 'bg-stone-100 text-stone-700 border-stone-300' },
  ready_for_pickup: { label: 'Pronto para retirada', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  label_generated: { label: 'Etiqueta gerada', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  in_transit: { label: 'Em trânsito', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  delivered: { label: 'Entregue', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  returned: { label: 'Devolvido', color: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export const AVAILABILITY_LABELS: Record<string, { label: string; badge: string }> = {
  ready_stock: { label: 'Pronta entrega', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  made_to_order: { label: 'Feito sob encomenda', badge: 'bg-[#F2EFE9] text-[#24232A] border-[#DED9CF]' },
  custom_project: { label: 'Sob medida', badge: 'bg-[#F3EFFA] text-[#563487] border-[#D8CEEA]' },
};
