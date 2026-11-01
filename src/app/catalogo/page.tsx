import React from 'react';
import Link from 'next/link';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string; availability?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const db = await getDb();

  const categories = await db.query<{ id: string; slug: string; name: string }>(
    'SELECT id, slug, name FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC'
  );

  let sql = 'SELECT * FROM products WHERE is_active = TRUE';
  const params: unknown[] = [];

  if (sp.material) {
    params.push(sp.material);
    sql += ` AND UPPER(material) = UPPER($${params.length})`;
  }
  if (sp.availability) {
    params.push(sp.availability);
    sql += ` AND availability_type = $${params.length}`;
  }
  if (sp.cat) {
    params.push(sp.cat);
    sql += ` AND category_id = $${params.length}`;
  }
  sql += ' ORDER BY featured DESC, price_cents ASC';

  const products = await db.query<ProductCardProps>(sql, params);

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E2DA] pb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Coleção RBS Criação
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-[#24232A]">
              Catálogo de peças
            </h1>
            <p className="mt-1 text-sm text-[#5A5863]">
              Escolha vasos, organizadores, colecionáveis e presentes produzidos em nosso estúdio.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/catalogo"
              className={`min-h-[40px] inline-flex items-center rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                !sp.material && !sp.availability && !sp.cat
                  ? 'border-[#563487] bg-[#563487] text-white'
                  : 'border-[#E6E2DA] bg-white text-[#24232A] hover:bg-[#F2EFE9]'
              }`}
            >
              Todas as peças ({products.length})
            </Link>
            <Link
              href="/catalogo?availability=ready_stock"
              className={`min-h-[40px] inline-flex items-center rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                sp.availability === 'ready_stock'
                  ? 'border-[#563487] bg-[#563487] text-white'
                  : 'border-[#E6E2DA] bg-white text-[#24232A] hover:bg-[#F2EFE9]'
              }`}
            >
              Pronta entrega
            </Link>
            {['PLA', 'PETG', 'Resina'].map((mat) => (
              <Link
                key={mat}
                href={`/catalogo?material=${mat}`}
                className={`min-h-[40px] inline-flex items-center rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  sp.material?.toUpperCase() === mat.toUpperCase()
                    ? 'border-[#563487] bg-[#563487] text-white'
                    : 'border-[#E6E2DA] bg-white text-[#24232A] hover:bg-[#F2EFE9]'
                }`}
              >
                {mat}
              </Link>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2 text-xs font-medium text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
