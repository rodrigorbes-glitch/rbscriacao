import React from 'react';
import Link from 'next/link';
import { ImageOff, CheckCircle2 } from 'lucide-react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminProductFormClient } from '@/components/AdminProductFormClient';
import { formatBRLFromCents } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminProdutosPage() {
  const db = await getDb();

  const products = await db.query<{
    id: string;
    sku: string;
    slug: string;
    name: string;
    material: string;
    finish: string;
    availability_type: string;
    lead_time_days: number;
    filament_grams_per_unit: number;
    support_purge_grams_per_unit: number;
    print_time_minutes: number;
    price_cents: number;
    cost_cents: number;
    stock_qty: number;
    images_json: string;
    featured: boolean;
  }>('SELECT * FROM products ORDER BY featured DESC, created_at DESC');

  const pendingPhotos = products.filter((p) => {
    try {
      const parsed = JSON.parse(p.images_json || '[]');
      return !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      return true;
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-semibold tracking-wider text-[#563487] uppercase">
            Painel RBS → Produtos & Mídias
          </span>
          <h1 className="font-display mt-1 text-2xl font-semibold text-[#24232A] sm:text-3xl">
            Catálogo de Peças, Fotografia e Margem Unitária
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Gerencie especificações, consumo em gramas, preço de venda e acompanhe as fotografias pendentes.
          </p>
        </div>
        <HelpBalloon moduleSlug="precificador" />
      </div>

      {/* Pending Media Alert Panel for the Administrator */}
      {pendingPhotos.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6">
          <div className="flex items-start gap-3">
            <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold text-amber-950">
                Mídias pendentes de fotografia original ({pendingPhotos.length} produtos)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Estes produtos estão com a sinalização discreta{' '}
                <strong>&ldquo;Imagem em atualização&rdquo;</strong> na loja e foram retirados dos
                destaques visuais da página inicial para evitar o uso de ilustrações genéricas:
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {pendingPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <strong className="block truncate text-[#24232A]">{item.name}</strong>
                      <span className="font-mono text-[11px] text-[#5A5863]">{item.sku}</span>
                    </div>
                    <Link
                      href={`/produto/${item.slug}`}
                      className="shrink-0 font-semibold text-[#563487] hover:underline"
                    >
                      Ver ficha
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <AdminProductFormClient />

      <section className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase">
                <th className="py-3 pr-3">SKU / Peça</th>
                <th className="py-3 pr-3">Fotografia</th>
                <th className="py-3 pr-3">Material & Prazo</th>
                <th className="py-3 pr-3">Filamento + Suporte</th>
                <th className="py-3 pr-3">Custo Direto</th>
                <th className="py-3 pr-3">Preço Venda</th>
                <th className="py-3 pr-3">Estoque</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {products.map((p) => {
                let imgs: string[] = [];
                try {
                  imgs = JSON.parse(p.images_json || '[]');
                } catch {
                  imgs = [];
                }
                const hasPhoto = Array.isArray(imgs) && imgs.length > 0;
                const grossMarginPct =
                  p.price_cents > 0
                    ? Math.round(((p.price_cents - p.cost_cents) / p.price_cents) * 100)
                    : 0;
                return (
                  <tr key={p.id}>
                    <td className="py-3.5 pr-3">
                      <strong className="block text-[#24232A]">{p.name}</strong>
                      <span className="font-mono text-[11px] text-[#563487]">{p.sku}</span>
                    </td>
                    <td className="py-3.5 pr-3">
                      {hasPhoto ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          <span>{imgs.length} foto(s) real(is)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          <ImageOff className="h-3 w-3 text-amber-700" />
                          <span>Foto pendente</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className="font-semibold text-[#24232A]">{p.material}</span> •{' '}
                      {p.finish}
                      <span className="block text-[11px] text-[#5A5863]">
                        Preparo: {p.lead_time_days}d ({p.availability_type})
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-[#24232A]">
                      {p.filament_grams_per_unit}g + {p.support_purge_grams_per_unit}g purga
                      <span className="block text-[10px] text-[#5A5863]">
                        Tempo: {p.print_time_minutes} min
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-[#5A5863]">
                      {formatBRLFromCents(p.cost_cents)}
                    </td>
                    <td className="py-3.5 pr-3">
                      <strong className="text-sm text-[#24232A]">
                        {formatBRLFromCents(p.price_cents)}
                      </strong>
                      <span className="block text-[10px] text-emerald-800">
                        Margem bruta: {grossMarginPct}%
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-semibold text-[#24232A]">{p.stock_qty} un</td>
                    <td className="space-x-2 py-3.5 text-right">
                      <Link
                        href={`/admin/precificador?product=${p.id}`}
                        className="rounded-lg bg-[#F3EFFA] px-2.5 py-1 text-[11px] font-semibold text-[#563487] hover:bg-[#563487] hover:text-white"
                      >
                        Precificar
                      </Link>
                      <Link
                        href={`/produto/${p.slug}`}
                        className="rounded-lg border border-[#E6E2DA] bg-white px-2.5 py-1 text-[11px] text-[#24232A] hover:border-[#563487]"
                      >
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
