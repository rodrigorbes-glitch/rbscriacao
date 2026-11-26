'use client';

import React, { useEffect, useRef, useState } from 'react';

interface HeroAmbientVideoProps {
  videoUrl?: string;
  title: string;
  subtitle: string;
}

const DEFAULT_CHAPTERS = [
  { label: '01 · Impressão 3D', startSec: 0, endSec: 6.0 },
  { label: '02 · Cor & Luz', startSec: 6.0, endSec: 12.0 },
  { label: '03 · No Seu Espaço', startSec: 12.0, endSec: 18.0 },
];

export function HeroAmbientVideo({ videoUrl, title, subtitle }: HeroAmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const isCustomVideo = Boolean(videoUrl && videoUrl.trim().length > 0);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.defaultMuted = true;
    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Fallback silencioso caso o navegador exija interação prévia
      });
    }
  }, [videoUrl]);

  const handleTimeUpdate = () => {
    if (isCustomVideo || !videoRef.current) return;
    const t = videoRef.current.currentTime;
    const idx = DEFAULT_CHAPTERS.findIndex((c) => t >= c.startSec && t < c.endSec);
    const currentIdx = idx >= 0 ? idx : DEFAULT_CHAPTERS.length - 1;
    const chapter = DEFAULT_CHAPTERS[currentIdx];
    const duration = Math.max(0.1, chapter.endSec - chapter.startSec);
    const pct = Math.max(0, Math.min(100, ((t - chapter.startSec) / duration) * 100));
    setActiveScene(currentIdx);
    setSceneProgress(pct);
  };

  const jumpToChapter = (idx: number) => {
    const vid = videoRef.current;
    if (!vid || isCustomVideo) return;
    vid.currentTime = DEFAULT_CHAPTERS[idx].startSec + 0.05;
    vid.muted = true;
    vid.play().catch(() => {});
    setActiveScene(idx);
    setSceneProgress(0);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0F172A]"
      style={{ height: '100svh', minHeight: '580px', maxHeight: '920px' }}
    >
      {/* Vídeo Full-Screen sempre ativo (muted + playsInline para Chrome, Safari, iOS e Android) */}
      <video
        ref={videoRef}
        key={videoUrl || 'default-rbs-hero-video'}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/videos/hero-poster.jpg"
        onTimeUpdate={handleTimeUpdate}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          zIndex: 1,
        }}
      >
        {isCustomVideo ? (
          <source src={videoUrl} />
        ) : (
          <>
            <source src="/videos/hero-3d.webm" type="video/webm" />
            <source src="/videos/hero-3d.mp4" type="video/mp4" />
          </>
        )}
      </video>

      {/* Overlay gradiente de direção de arte (preserva luz natural + contraste nos textos) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background:
            'linear-gradient(to top, rgba(15, 23, 42, 0.80) 0%, rgba(15, 23, 42, 0.16) 46%, rgba(15, 23, 42, 0.42) 100%)',
        }}
      />

      {/* Conteúdo editorial + capítulos sincronizados (idêntico à prévia aprovada) */}
      <div
        className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 pb-10 sm:px-8 sm:pb-14 lg:flex-row lg:items-end"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="max-w-xl text-white">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7DD3FC]">
            Design em Impressão 3D · Cores &amp; Formas Autorais
          </p>
          <h1
            className="text-3xl font-normal leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[54px]"
            style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
          >
            {title}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-[15px]">
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
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/55 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Solicitar Encomenda
            </a>
          </div>
        </div>

        {/* Capítulos das 3 cenas (sincronizados com o vídeo padrão) */}
        {!isCustomVideo && (
          <div className="flex w-full flex-row gap-3 lg:w-56 lg:flex-col lg:gap-3.5">
            {DEFAULT_CHAPTERS.map((chap, idx) => {
              const isActive = idx === activeScene;
              const fillWidth = idx < activeScene ? 100 : isActive ? sceneProgress : 0;
              return (
                <button
                  key={chap.label}
                  type="button"
                  onClick={() => jumpToChapter(idx)}
                  className="flex-1 cursor-pointer text-left text-white transition"
                >
                  <div
                    className={`mb-1.5 truncate text-[11px] uppercase tracking-[0.12em] transition-opacity ${
                      isActive ? 'font-semibold opacity-100' : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    {chap.label}
                  </div>
                  <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full bg-white transition-[width] duration-150"
                      style={{ width: `${fillWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
