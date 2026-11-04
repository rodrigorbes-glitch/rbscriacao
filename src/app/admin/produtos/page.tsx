import React from 'react';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminProductFormClient, ProductItem, CategoryItem } from '@/components/AdminProductFormClient';

export const dynamic = 'force-dynamic';

export default async function AdminProdutosPage() {
  const db = await getDb();

  const products = await db.query<ProductItem>(
    'SELECT * FROM products ORDER BY featured DESC, created_at DESC'
  );

  const categories = await db.query<CategoryItem>(
    'SELECT id, name FROM categories ORDER BY sort_order ASC'
  );

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
            Cadastre novos produtos, envie fotos reais, gerencie valores, estoque e acompanhe a margem unitária.
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

      {/* Interactive Form & Management Client */}
      <AdminProductFormClient initialProducts={products} categories={categories} />
    </div>
  );
}
