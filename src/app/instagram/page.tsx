import React from 'react';
import Link from 'next/link';
import { Camera as Instagram, ExternalLink, ArrowRight } from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function InstagramFeedPage() {
  const db = await getDb();

  const posts = await db.query<{
    id: string;
    instagram_handle: string;
    media_type: string;
    media_url: string;
    permalink: string;
    caption: string;
    clicks_to_product_count: number;
    product_id: string | null;
    product_name: string | null;
    product_slug: string | null;
    price_cents: number | null;
  }>(
    `SELECT sp.*,
            p.id as product_id,
            p.name as product_name,
            p.slug as product_slug,
            p.price_cents
     FROM social_posts sp
     LEFT JOIN social_post_products spp ON spp.post_id = sp.id
     LEFT JOIN products p ON p.id = spp.product_id
     WHERE sp.is_visible_on_page = TRUE
     ORDER BY sp.published_at DESC`
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E2DA] bg-[#F2EFE9] p-6 sm:p-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-[#563487] uppercase">
              <Instagram className="h-4 w-4" />
              <span>@rbscriacao</span>
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A]">
              Peças apresentadas no Instagram
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#5A5863]">
              Toque em qualquer publicação para abrir a peça correspondente com preço, cores e
              opções de entrega.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.instagram.com/rbscriacao/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#462970]"
            >
              <Instagram className="h-4 w-4" />
              <span>Perfil @rbscriacao</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white"
            >
              <div>
                <Link
                  href={post.product_slug ? `/produto/${post.product_slug}` : '/catalogo'}
                  className="relative block aspect-square overflow-hidden bg-[#F2EFE9]"
                >
                  <img
                    src={post.media_url}
                    alt={post.caption}
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-4">
                  <p className="text-xs leading-relaxed text-[#5A5863]">{post.caption}</p>
                </div>
              </div>

              {post.product_slug && (
                <div className="border-t border-[#E6E2DA] bg-[#FCFBF8] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="block truncate text-xs font-semibold text-[#24232A]">
                        {post.product_name}
                      </strong>
                      {post.price_cents && (
                        <span className="text-xs font-medium text-[#563487]">
                          {formatBRLFromCents(Math.round(post.price_cents * 0.95))} no Pix
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/produto/${post.product_slug}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#563487] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#462970]"
                    >
                      <span>Ver peça</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
