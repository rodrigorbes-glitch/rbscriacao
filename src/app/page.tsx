import React from 'react';
import Link from 'next/link';
import { ArrowRight, Camera as Instagram } from 'lucide-react';
import { getDb } from '@/db';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { ProductCard, type ProductCardProps } from '@/components/ProductCard';
import { HeroAmbientVideo } from '@/components/HeroAmbientVideo';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = await getDb();

  const [banners, featuredProducts, catalogProducts, socialPosts, brandRows] = await Promise.all([
    db.query<{
      id: string;
      title: string;
      subtitle: string | null;
      cta_label: string | null;
      cta_href: string | null;
      desktop_image_url: string;
      mobile_image_url: string;
      focal_point_x: number;
      focal_point_y: number;
    }>("SELECT * FROM banners WHERE placement = 'home_hero' AND is_active = TRUE ORDER BY sort_order ASC LIMIT 1"),
    db.query<ProductCardProps>(
      "SELECT * FROM products WHERE is_active = TRUE AND featured = TRUE AND images_json != '[]' ORDER BY created_at ASC LIMIT 4"
    ),
    db.query<ProductCardProps>(
      "SELECT * FROM products WHERE is_active = TRUE AND images_json != '[]' ORDER BY featured DESC, created_at DESC LIMIT 8"
    ),
    db.query<{
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
    ),
    db.query<{ value_json: string }>("SELECT value_json FROM store_settings WHERE key = 'brand' LIMIT 1"),
  ]);

  let brand: Record<string, any> = {};
  if (brandRows.length > 0 && brandRows[0].value_json) {
    try {
      brand = JSON.parse(brandRows[0].value_json);
    } catch {}
  }

  const heroMode: 'video' | 'banner' | 'video_e_banner' = brand.heroMode || 'video';
  const heroVideoUrl: string = brand.heroVideoUrl || '';
  const heroTitle: string = brand.heroTitle || 'Design vibrante criado camada por camada.';
  const heroSubtitle: string =
    brand.heroSubtitle ||
    'Vasos, luminárias e objetos decorativos impressos em 3D com precisão, cor e personalidade para transformar o seu ambiente.';

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

  const focalX = Number(heroBanner.focal_point_x ?? 50);
  const focalY = Number(heroBanner.focal_point_y ?? 50);

  const showVideoHero = heroMode === 'video' || heroMode === 'video_e_banner';
  const showTopBanner = heroMode === 'banner';
  const showMidBanner = heroMode === 'video_e_banner';

  const whatsappDigits = String(brand.whatsapp || '5521998887766').replace(/\D/g, '');
  const whatsappFull = whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`;
  const encomendaWhatsAppHref = `https://wa.me/${whatsappFull}?text=${encodeURIComponent(
    'Olá! Gostaria de solicitar uma encomenda personalizada em impressão 3D.'
  )}`;

  const renderEditorialBanner = (isMidSection: boolean) => (
    <section
      className={
        isMidSection
          ? 'border-t border-[#E6E2DA] bg-white py-12 sm:py-14'
          : 'border-b border-[#E6E2DA] bg-[#F7F7F5] py-8 sm:py-12 lg:py-16'
      }
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="order-2 space-y-5 lg:order-1 lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0284C7]">
            Destaque Editorial • Edição Autoral
          </p>

          {isMidSection ? (
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[#18181B] sm:text-4xl">
              {heroBanner.title}
            </h2>
          ) : (
            <h1 className="font-display text-4xl font-semibold tracking-tight text-[#18181B] sm:text-5xl lg:text-[52px] lg:leading-[1.08]">
              {heroBanner.title}
            </h1>
          )}

          <p className="max-w-md text-base leading-relaxed text-[#52525B]">
            {heroBanner.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={heroBanner.cta_href || '/produto/vaso-premium-furta-cor'}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#F05A37] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#D94826]"
            >
              <span>{heroBanner.cta_label || 'Conhecer o vaso'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/catalogo"
              className="inline-flex min-h-[48px] items-center px-3 py-2 text-sm font-semibold text-[#18181B] underline decoration-[#C5BEB2] underline-offset-4 transition hover:text-[#F05A37] hover:decoration-[#F05A37]"
            >
              Explorar a coleção
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7">
          <Link
            href={heroBanner.cta_href || '/produto/vaso-premium-furta-cor'}
            aria-label={heroBanner.title}
            className="block overflow-hidden rounded-2xl bg-[#EFEFED]"
          >
            <picture>
              <source media="(max-width: 767px)" srcSet={heroBanner.mobile_image_url} />
              <img
                src={heroBanner.desktop_image_url}
                alt={heroBanner.title}
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
              />
            </picture>
          </Link>
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#18181B]">
      <StoreHeader />

      <main className="flex-1">
        {/* 1. Topo da Landing Page: Vídeo Full-Screen ou Banner Estático (controlado no Admin) */}
        {showVideoHero && (
          <HeroAmbientVideo
            videoUrl={heroVideoUrl}
            title={heroTitle}
            subtitle={heroSubtitle}
          />
        )}

        {showTopBanner && renderEditorialBanner(false)}

        {/* Faixa limpa de diferenciais */}
        <section className="border-b border-[#E6E2DA] bg-white py-9">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0284C7]">
                01 · Paleta Sob Medida
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#52525B]">
                Do azul cobalto ao coral vibrante ou neutros elegantes — cores vivas para combinar com seu espaço.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0284C7]">
                02 · Alta Precisão 3D
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#52525B]">
                Impressão de alta definição com geometrias orgânicas e acabamento moderno camada por camada.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0284C7]">
                03 · Varejo &amp; Distribuidores
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#52525B]">
                Peças prontas para sua casa, projetos personalizados ou condições especiais para revenda.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Destaques da Coleção */}
        <section id="destaques-colecao" className="py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F05A37]">
                  Curadoria
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-[#18181B] sm:text-3xl">
                  Destaques da Coleção
                </h2>
                <p className="mt-1 text-sm text-[#52525B]">
                  Peças autorais em impressão 3D com acabamento acetinado, cores vibrantes e medidas claras.
                </p>
              </div>
              <Link
                href="/catalogo"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#E6E2DA] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#18181B] transition hover:border-[#F05A37] hover:text-[#F05A37]"
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

        {/* Banner intermediário (somente se Admin = 'video_e_banner') */}
        {showMidBanner && renderEditorialBanner(true)}

        {/* 3. Catálogo Completo (logo após Destaques) */}
        <section className="border-t border-[#E6E2DA] bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0284C7]">
                  Acervo
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-[#18181B] sm:text-3xl">
                  Catálogo Completo
                </h2>
              </div>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F05A37] transition hover:text-[#D94826]"
              >
                <span>Explorar catálogo completo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {catalogProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* 4. Bloco discreto e claro de Sob Encomenda (abaixo do Catálogo, sem imagem) */}
        <section id="sob-encomenda" className="bg-[#F7F7F5] py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#E6E2DA] bg-white px-6 py-7 sm:flex-row sm:items-center sm:px-10 sm:py-8">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-[#F05A37]">
                  <span className="inline-block h-[2px] w-4 rounded bg-[#F05A37]" aria-hidden="true" />
                  <span>Sob Encomenda</span>
                </p>
                <h2 className="font-display mt-2 text-xl font-normal tracking-tight text-[#18181B] sm:text-2xl">
                  Precisa de uma cor, tamanho ou peça personalizada?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#52525B]">
                  Produzimos peças exclusivas em impressão 3D sob medida para decoração, presentes ou eventos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={encomendaWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#18181B] px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#F05A37]"
                >
                  <span>Solicitar Encomenda</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/personalizados"
                  className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-[#52525B] underline decoration-[#C5BEB2] underline-offset-4 transition hover:text-[#18181B]"
                >
                  Enviar arquivo 3D
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Instagram @rbscriacao */}
        <section className="border-t border-[#E6E2DA] bg-[#F7F7F5] py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#0284C7]">
                  <Instagram className="h-3.5 w-3.5" />
                  <span>@rbscriacao</span>
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-[#18181B] sm:text-3xl">
                  Peças reais no dia a dia
                </h2>
              </div>
              <Link
                href="/instagram"
                className="text-sm font-semibold text-[#F05A37] transition hover:text-[#D94826]"
              >
                Ver galeria completa →
              </Link>
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
                      <div className="aspect-square w-full overflow-hidden bg-[#EFEFED]">
                        <img
                          src={post.media_url}
                          alt={post.caption}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-2 text-xs leading-relaxed text-[#52525B]">
                          {post.caption}
                        </p>
                        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#F05A37]">
                          <span>Conhecer a peça</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#E6E2DA] bg-white p-6 text-sm text-[#52525B]">
                Acompanhe nossas novidades no perfil oficial{' '}
                <a
                  href="https://www.instagram.com/rbscriacao/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#F05A37] underline"
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
      <FloatingWhatsApp whatsapp={brand.whatsapp} />
    </div>
  );
}
