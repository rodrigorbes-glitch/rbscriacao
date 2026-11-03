import React from 'react';
import Link from 'next/link';
import { ArrowRight, Camera as Instagram } from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = await getDb();

  // Connected to the responsive banner editor (desktop + mobile independent framing and focal point)
  const banners = await db.query<{
    id: string;
    title: string;
    subtitle: string | null;
    cta_label: string | null;
    cta_href: string | null;
    desktop_image_url: string;
    mobile_image_url: string;
    focal_point_x: number;
    focal_point_y: number;
  }>(
    "SELECT * FROM banners WHERE placement = 'home_hero' AND is_active = TRUE ORDER BY sort_order ASC LIMIT 1"
  );

  const heroBanner = banners[0] || {
    id: 'ban-hero-default',
    title: 'Uma forma. Vários tons.',
    subtitle:
      'O Vaso Premium Furta-Cor revela reflexos entre o cobre e o dourado conforme a luz natural percorre suas facetas em espiral.',
    cta_label: 'Conhecer o vaso',
    cta_href: '/produto/vaso-premium-furta-cor',
    desktop_image_url: '/products/real/ambiente-sala-vaso-espiral.png',
    mobile_image_url: '/products/real/vaso-espiral-cobre-mesa.png',
    focal_point_x: 48,
    focal_point_y: 58,
  };

  const categories = await db.query<{
    id: string;
    slug: string;
    name: string;
    description: string;
    image_url: string;
  }>('SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC LIMIT 4');

  // Seleção RBS: Only show pieces with verified real studio photography on home highlights
  const featuredProducts = await db.query<ProductCardProps>(
    "SELECT * FROM products WHERE is_active = TRUE AND featured = TRUE AND images_json != '[]' ORDER BY created_at ASC LIMIT 4"
  );

  const socialPosts = await db.query<{
    id: string;
    media_url: string;
    caption: string;
    permalink: string;
    product_slug: string | null;
  }>(
    `SELECT sp.id, sp.media_url, sp.caption, sp.permalink, p.slug AS product_slug
     FROM social_posts sp
     LEFT JOIN social_post_products spp ON spp.post_id = sp.id
     LEFT JOIN products p ON p.id = spp.product_id
     WHERE sp.is_featured_on_home = TRUE
     ORDER BY sp.published_at DESC
     LIMIT 4`
  );

  const focalX = Number(heroBanner.focal_point_x ?? 50);
  const focalY = Number(heroBanner.focal_point_y ?? 50);

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="flex-1">
        {/* 1. Primeira Dobra (Hero Editorial: ~40% Texto / ~60% Fotografia Real) */}
        <section className="border-b border-[#E6E2DA] bg-[#FCFBF8] py-8 sm:py-12 lg:py-16">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
            {/* Left Column (~40% / 5 cols on desktop, 2nd on mobile) */}
            <div className="order-2 space-y-5 lg:order-1 lg:col-span-5">
              <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
                Vaso Premium Furta-Cor • Edição Autoral
              </p>

              <h1 className="font-display text-4xl font-semibold tracking-tight text-[#24232A] sm:text-5xl lg:text-[52px] lg:leading-[1.08]">
                {heroBanner.title}
              </h1>

              <p className="max-w-md text-base leading-relaxed text-[#5A5863]">
                {heroBanner.subtitle}
              </p>

              <div className="flex items-baseline gap-2 pt-1 text-sm text-[#5A5863]">
                <span className="font-semibold text-[#24232A]">R$ 139,90</span>
                <span>(R$ 132,91 no Pix)</span>
                <span>•</span>
                <span>24 cm de altura</span>
                <span>•</span>
                <span>Pronta entrega</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={heroBanner.cta_href || '/produto/vaso-premium-furta-cor'}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#563487] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#462970]"
                >
                  <span>{heroBanner.cta_label || 'Conhecer o vaso'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/catalogo"
                  className="inline-flex min-h-[48px] items-center px-3 py-2 text-sm font-semibold text-[#24232A] underline decoration-[#C5BEB2] underline-offset-4 transition hover:text-[#563487] hover:decoration-[#563487]"
                >
                  Explorar a coleção
                </Link>
              </div>
            </div>

            {/* Right Column (~60% / 7 cols on desktop, 1st on mobile): Wide Real Photograph without inner card, HUD or overlay */}
            <div className="order-1 lg:order-2 lg:col-span-7">
              <Link
                href={heroBanner.cta_href || '/produto/vaso-premium-furta-cor'}
                aria-label="Ver página do Vaso Premium Furta-Cor"
                className="block overflow-hidden rounded-2xl bg-[#F2EFE9]"
              >
                <picture>
                  <source media="(max-width: 767px)" srcSet={heroBanner.mobile_image_url} />
                  <img
                    src={heroBanner.desktop_image_url}
                    alt="Vaso Premium Furta-Cor sobre mesa de madeira em sala iluminada"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                    className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
                  />
                </picture>
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Categorias por Intenção de Compra */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[#24232A] sm:text-3xl">
                Escolha para o seu espaço
              </h2>
              <p className="mt-1 text-sm text-[#5A5863]">
                Objetos desenhados para decorar, organizar a rotina e presentear.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#563487] transition hover:text-[#462970]"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white transition hover:border-[#C5BEB2] hover:shadow-xs"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2EFE9]">
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-display text-base font-semibold text-[#24232A] group-hover:text-[#563487]">
                    {cat.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5A5863]">
                    {cat.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Seleção RBS (4 Peças Visualmente Distintas com Fotografia Real) */}
        <section className="border-t border-[#E6E2DA] bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[#24232A] sm:text-3xl">
                  Seleção RBS
                </h2>
                <p className="mt-1 text-sm text-[#5A5863]">
                  Peças autorais com acabamento acetinado, cores vibrantes e medidas claras.
                </p>
              </div>
              <Link
                href="/catalogo"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-4 py-2 text-sm font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
              >
                <span>Ver todas as peças</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* 4. Faixa Editorial: Personalizados */}
        <section className="border-t border-[#E6E2DA] bg-[#F2EFE9] py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-10 lg:grid-cols-12 lg:gap-12">
              <div className="space-y-4 lg:col-span-6">
                <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
                  Projetos sob medida
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[#24232A] sm:text-3xl">
                  Precisa de uma peça em medida, cor ou formato específico?
                </h2>
                <p className="text-base leading-relaxed text-[#5A5863]">
                  Produzimos objetos personalizados a partir da sua ideia, desenho ou arquivo 3D.
                  Você recebe a análise de material, o prazo exato de fabricação e o valor antes de aprovar.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/personalizados"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#563487] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
                  >
                    <span>Solicitar orçamento</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/empresas"
                    className="inline-flex min-h-[48px] items-center px-2 text-sm font-semibold text-[#24232A] underline decoration-[#C5BEB2] underline-offset-4 transition hover:text-[#563487]"
                  >
                    Brindes e lotes para empresas
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="overflow-hidden rounded-xl bg-[#F2EFE9]">
                  <img
                    src="/products/real/vasos-canelados-bicolor-macro.png"
                    alt="Detalhe real da textura e acabamento em impressão 3D da RBS Criação"
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Instagram @rbscriacao */}
        <section className="border-t border-[#E6E2DA] bg-[#FCFBF8] py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-[#563487] uppercase">
                  <Instagram className="h-3.5 w-3.5" />
                  <span>@rbscriacao</span>
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-[#24232A] sm:text-3xl">
                  Peças reais no dia a dia
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/instagram"
                  className="text-sm font-semibold text-[#563487] transition hover:text-[#462970]"
                >
                  Ver galeria completa →
                </Link>
              </div>
            </div>

            {socialPosts.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {socialPosts.map((post) => {
                  const targetHref = post.product_slug
                    ? `/produto/${post.product_slug}`
                    : '/catalogo';
                  return (
                    <Link
                      key={post.id}
                      href={targetHref}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white transition hover:border-[#C5BEB2] hover:shadow-xs"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-[#F2EFE9]">
                        <img
                          src={post.media_url}
                          alt={post.caption}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-2 text-xs leading-relaxed text-[#5A5863]">
                          {post.caption}
                        </p>
                        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#563487]">
                          <span>Conhecer a peça</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#E6E2DA] bg-white p-6 text-sm text-[#5A5863]">
                Acompanhe nossas novidades no perfil oficial{' '}
                <a
                  href="https://www.instagram.com/rbscriacao/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#563487] underline"
                >
                  @rbscriacao
                </a>
                .
              </div>
            )}
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
