import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import {
  ProductDetailClient,
  type ProductDetailDTO,
  type ProductVariationDTO,
} from '@/components/ProductDetailClient';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function ProdutoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const prodRows = await db.query<ProductDetailDTO>(
    'SELECT * FROM products WHERE slug = $1 LIMIT 1',
    [slug]
  );

  if (prodRows.length === 0) {
    notFound();
  }
  const product = prodRows[0];

  const variations = await db.query<ProductVariationDTO>(
    'SELECT * FROM product_variations WHERE product_id = $1 AND is_active = TRUE ORDER BY price_delta_cents ASC',
    [product.id]
  );

  const related = await db.query<ProductCardProps>(
    "SELECT * FROM products WHERE id != $1 AND is_active = TRUE AND images_json != '[]' ORDER BY featured DESC LIMIT 4",
    [product.id]
  );

  // Record product view event
  await db.query(
    `INSERT INTO commercial_events (id, event_name, session_key, product_id, channel_source)
     VALUES ($1, 'product_view', 'sess-pdp-view', $2, 'catalogo')`,
    [`evt-view-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, product.id]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#5A5863]" aria-label="Trilha de navegação">
          <Link href="/" className="transition hover:text-[#563487]">
            Início
          </Link>
          <span>/</span>
          <Link href="/catalogo" className="transition hover:text-[#563487]">
            Catálogo
          </Link>
          <span>/</span>
          <span className="font-medium text-[#24232A]">{product.name}</span>
        </nav>

        <ProductDetailClient product={product} variations={variations} />

        <section className="mt-14 border-t border-[#E6E2DA] pt-10">
          <div className="max-w-3xl">
            <h2 className="font-display text-xl font-semibold text-[#24232A]">
              Sobre a peça
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#5A5863]">
              {product.description}
            </p>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-14 border-t border-[#E6E2DA] pt-10 pb-6">
            <h2 className="font-display text-xl font-semibold text-[#24232A]">
              Outras peças do estúdio
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </section>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
