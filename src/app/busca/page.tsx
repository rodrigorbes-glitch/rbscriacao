import React from 'react';
import Link from 'next/link';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q || '').trim();
  const db = await getDb();

  let products: ProductCardProps[] = [];
  if (query) {
    products = await db.query<ProductCardProps>(
      `SELECT * FROM products
       WHERE is_active = TRUE
         AND (
           LOWER(name) LIKE LOWER($1)
           OR LOWER(short_description) LIKE LOWER($1)
           OR LOWER(material) LIKE LOWER($1)
           OR LOWER(sku) LIKE LOWER($1)
         )
       ORDER BY featured DESC`,
      [`%${query}%`]
    );

    await db.query(
      `INSERT INTO commercial_events (id, event_name, session_key, search_term, channel_source)
       VALUES ($1, 'search_query', 'sess-search', $2, 'busca_interna')`,
      [`evt-srch-${Date.now()}`, query]
    );
  } else {
    products = await db.query<ProductCardProps>(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY featured DESC LIMIT 8'
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-[#E6E2DA] pb-6">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Busca no catálogo
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-[#24232A] sm:text-3xl">
            {query ? `Resultados para "${query}" (${products.length})` : 'Explore nossa coleção'}
          </h1>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-[#E6E2DA] bg-white p-8 text-center">
            <h2 className="font-display text-lg font-semibold text-[#24232A]">
              Não encontrou a peça &ldquo;{query}&rdquo; pronta no catálogo?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#5A5863]">
              Produzimos peças sob medida a partir de fotos de referência, medidas ou arquivos 3D.
            </p>
            <Link
              href="/personalizados"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#563487] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#462970]"
            >
              Pedir uma peça personalizada
            </Link>
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
