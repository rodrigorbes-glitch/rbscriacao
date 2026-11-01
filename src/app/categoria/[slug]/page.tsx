import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const catRows = await db.query<{
    id: string;
    slug: string;
    name: string;
    description: string;
  }>('SELECT * FROM categories WHERE slug = $1 LIMIT 1', [slug]);

  if (catRows.length === 0) {
    notFound();
  }
  const category = catRows[0];

  const products = await db.query<ProductCardProps>(
    'SELECT * FROM products WHERE category_id = $1 AND is_active = TRUE ORDER BY featured DESC, price_cents ASC',
    [category.id]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-[#E6E2DA] pb-6">
          <Link href="/catalogo" className="text-xs font-semibold text-[#563487] hover:underline">
            ← Voltar ao catálogo completo
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[#24232A]">
            {category.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#5A5863]">{category.description}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
