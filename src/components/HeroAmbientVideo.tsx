'use client';

import React, { useEffect, useRef } from 'react';

interface HeroAmbientVideoProps {
  videoUrl?: string;
  title: string;
  subtitle: string;
}

export function HeroAmbientVideo({ videoUrl, title, subtitle }: HeroAmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.play().catch(() => {
      // Fallback silencioso caso o navegador restrinja autoplay
    });
  }, [videoUrl]);

  return (
    <section className="relative h-[86svh] min-h-[540px] max-h-[880px] w-full overflow-hidden bg-[#0F172A]">
      <video
        ref={videoRef}
        key={videoUrl || 'default-rbs-hero-video'}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/hero-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        {videoUrl ? (
          <source src={videoUrl} />
        ) : (
          <>
            <source src="/videos/hero-3d.webm" type="video/webm" />
            <source src="/videos/hero-3d.mp4" type="video/mp4" />
          </>
        )}
      </video>

      {/* Fallback estático para usuários com redução de movimento ativada */}
      <img
        src="/videos/hero-poster.jpg"
        alt="Peça decorativa sendo criada em impressão 3D"
        className="hidden h-full w-full object-cover motion-reduce:block"
      />

      {/* Overlay suave para legibilidade preservando a luz natural */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(15, 23, 42, 0.80) 0%, rgba(15, 23, 42, 0.18) 46%, rgba(15, 23, 42, 0.34) 100%)',
        }}
      />

      {/* Conteúdo editorial no canto inferior esquerdo (estilo Archier) */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="max-w-2xl text-white">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7DD3FC]">
            Design em Impressão 3D · Cores &amp; Formas Autorais
          </p>
          <h1 className="font-display text-3xl font-normal leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[54px]">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/88 sm:text-base">
            {subtitle}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#destaques-colecao"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[#F05A37] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#D94826]"
            >
              <span>Explorar Coleção</span>
              <span aria-hidden="true">↓</span>
            </a>
            <a
              href="#sob-encomenda"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/50 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Solicitar Encomenda
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
