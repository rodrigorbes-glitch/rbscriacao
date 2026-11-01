import React from "react";
import Link from "next/link";
import { getDb } from "@/db";
import { formatBRLFromCents } from "@/lib/format";
import { HelpBalloon } from "@/components/HelpBalloon";
import { HELP_ARTICLES } from "@/lib/help-knowledge";
import { Camera as Instagram, Rss, Code2, ExternalLink, CheckCircle2, Tag, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminInstagramPage() {
  const db = await getDb();

  const [posts, products, postProducts] = await Promise.all([
    db.query<any>("SELECT * FROM social_posts ORDER BY published_at DESC"),
    db.query<any>("SELECT id, name, slug, price_cents, stock_qty FROM products WHERE is_active = TRUE ORDER BY name ASC"),
    db.query<any>(
      `SELECT spp.post_id, p.id, p.name, p.slug, p.price_cents
       FROM social_post_products spp
       JOIN products p ON p.id = spp.product_id`
    ),
  ]);

  const taggedByPostId = new Map<string, any[]>();
  for (const row of postProducts) {
    const list = taggedByPostId.get(row.post_id) || [];
    list.push(row);
    taggedByPostId.set(row.post_id, list);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
            RBS Operações → Social Commerce & Meta Business Suite
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#24232A] mt-1">
            Instagram @rbscriacao, Feed Comprável & Meta CAPI
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Sincronização de catálogo XML/JSON para Sacolinha do Instagram, curadoria de posts e deduplicação Server-Side CAPI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/instagram"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D5CFC4] text-xs font-bold text-[#24232A] hover:border-pink-500/50 transition"
          >
            Ver Vitrine /instagram <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <HelpBalloon article={HELP_ARTICLES["instagram-meta"]} />
        </div>
      </div>

      {/* Meta Catalog XML / JSON Feed & CAPI Deduplication Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E6E2DA] text-[#24232A] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-pink-400">
              <Rss className="w-4 h-4" /> Feed Oficial de Catálogo Meta Commerce (Sacolinha Instagram)
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-800 border border-emerald-400/30 text-[11px] font-bold">
              Sincronização Dinâmica Ativa
            </span>
          </div>
          <p className="text-xs text-[#5A5863] leading-relaxed mb-4">
            Estes endpoints geram em tempo real o catálogo estruturado com <code className="text-[#563487]">g:id</code>,{" "}
            <code className="text-[#563487]">g:availability</code>, preço em BRL, imagens de estúdio e atributos de impressão 3D. Cadastre a URL XML no{" "}
            <strong>Meta Commerce Manager → Fontes de Dados → Lista Programada</strong>.
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A5863]">
                  URL Feed XML (RSS 2.0 Google/Meta Base)
                </div>
                <code className="text-xs font-mono text-emerald-800">/api/catalog/meta?format=xml</code>
              </div>
              <a
                href="/api/catalog/meta?format=xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2EFE9] hover:bg-[#E6E2DA] text-xs font-bold text-[#24232A] transition shrink-0"
              >
                Abrir XML <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A5863]">
                  URL Feed JSON (Inspeção & Integrações Headless)
                </div>
                <code className="text-xs font-mono text-sky-900">/api/catalog/meta?format=json</code>
              </div>
              <a
                href="/api/catalog/meta?format=json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2EFE9] hover:bg-[#E6E2DA] text-xs font-bold text-[#24232A] transition shrink-0"
              >
                Inspecionar JSON <Code2 className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E6E2DA] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <h2 className="font-bold text-[#24232A]">Meta Pixel + Conversions API (CAPI)</h2>
            </div>
            <p className="text-xs text-[#5A5863] leading-relaxed mb-4">
              Todos os eventos comerciais da loja (<code className="font-mono text-[#563487]">ViewContent</code>,{" "}
              <code className="font-mono text-[#563487]">AddToCart</code>, <code className="font-mono text-[#563487]">AddToWishlist</code>,{" "}
              <code className="font-mono text-[#563487]">InitiateCheckout</code> e <code className="font-mono text-[#563487]">Purchase</code>) são gravados com{" "}
              <code className="font-mono font-bold text-[#24232A]">event_id_dedup</code> único para deduplicação entre navegador e servidor.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E2DA]">
                <span className="font-semibold text-[#5A5863]">Conta Instagram Vinculada</span>
                <span className="font-bold text-pink-400">@rbscriacao</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E2DA]">
                <span className="font-semibold text-[#5A5863]">Chave de Deduplicação CAPI</span>
                <span className="font-mono text-[11px] font-bold text-emerald-800">event_id_dedup + session_key</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E2DA]">
                <span className="font-semibold text-[#5A5863]">Produtos Sincronizados no Feed</span>
                <span className="font-bold text-[#24232A]">{products.length} SKUs ativos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curated Shoppable Posts */}
      <div className="bg-white rounded-3xl border border-[#E6E2DA] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-[#24232A] flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-400" />
            Publicações Curadas no Feed Comprável ({posts.length})
          </h2>
          <span className="text-xs text-[#5A5863]">
            Cada post possui produtos marcados com compra em 1 clique na vitrine pública
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post: any) => {
            const taggedProducts = taggedByPostId.get(post.id) || [];

            return (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] flex flex-col sm:flex-row gap-4"
              >
                <img
                  src={post.media_url}
                  alt={post.caption}
                  className="w-full sm:w-32 h-32 rounded-xl object-cover border border-[#E6E2DA] bg-white shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-pink-400">{post.instagram_handle}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Destacado
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5863] line-clamp-2 leading-relaxed">{post.caption}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E6E2DA]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A5863] mb-1.5 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#563487]" /> Peças 3D Marcadas neste Post:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {taggedProducts.map((tp: any) => (
                        <Link
                          key={tp.id}
                          href={`/produto/${tp.slug}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D5CFC4] text-[11px] font-bold text-[#24232A] hover:border-[#563487] transition"
                        >
                          <span>{tp.name}</span>
                          <span className="text-[#563487]">{formatBRLFromCents(tp.price_cents)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
