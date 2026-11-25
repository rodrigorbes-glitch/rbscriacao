'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Image as ImageIcon, Sparkles, Upload, RotateCcw, CheckCircle2 } from 'lucide-react';

export interface HeroSettingsData {
  heroMode: 'video' | 'banner' | 'video_e_banner';
  heroVideoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
}

export function AdminHeroVideoControl({ initial }: { initial: HeroSettingsData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [heroMode, setHeroMode] = useState<'video' | 'banner' | 'video_e_banner'>(initial.heroMode || 'video');
  const [heroVideoUrl, setHeroVideoUrl] = useState(initial.heroVideoUrl || '');
  const [heroTitle, setHeroTitle] = useState(
    initial.heroTitle || 'Design vibrante criado camada por camada.'
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    initial.heroSubtitle ||
      'Vasos, luminárias e objetos decorativos impressos em 3D com precisão, cor e personalidade para transformar o seu ambiente.'
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleUploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.mp4') && !ext.endsWith('.webm')) {
      setStatusMsg({ type: 'error', text: 'Envie um vídeo em formato MP4 (H.264) ou WebM.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({
        type: 'error',
        text: `O vídeo tem ${(file.size / (1024 * 1024)).toFixed(2)} MB. Mantenha abaixo de 5 MB para carregamento rápido em celulares.`,
      });
      return;
    }

    setUploading(true);
    setStatusMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao enviar o vídeo.' });
      } else {
        setHeroVideoUrl(data.url);
        setStatusMsg({
          type: 'success',
          text: 'Vídeo enviado com sucesso! Clique em "Salvar Exibição do Topo" para publicar na loja.',
        });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Erro de conexão ao enviar vídeo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          heroMode,
          heroVideoUrl,
          heroTitle,
          heroSubtitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao salvar configuração.' });
      } else {
        setStatusMsg({ type: 'success', text: 'Exibição da página inicial atualizada com sucesso!' });
        router.refresh();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Erro de conexão ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  const options = [
    {
      key: 'video' as const,
      icon: Film,
      title: 'Só Vídeo no Topo',
      desc: 'Exibe apenas o Vídeo Full-Screen em loop no topo da loja (banner oculto, mas salvo).',
    },
    {
      key: 'banner' as const,
      icon: ImageIcon,
      title: 'Só Banner no Topo',
      desc: 'Substitui o vídeo pelo banner estático configurado abaixo no Estúdio de Banners.',
    },
    {
      key: 'video_e_banner' as const,
      icon: Sparkles,
      title: 'Vídeo + Banner',
      desc: 'Exibe o Vídeo Full-Screen no topo e o Banner logo abaixo de Destaques da Coleção.',
    },
  ];

  return (
    <form onSubmit={handleSave} className="rounded-3xl border border-[#E6E2DA] bg-white p-6 space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#24232A]">
          Exibição do Topo da Página Inicial (Vídeo Full-Screen vs. Banner)
        </h2>
        <p className="mt-1 text-xs text-[#5A5863]">
          Escolha se a tela inicial exibirá o Vídeo Full-Screen, o Banner Estático ou ambos, e substitua o vídeo quando desejar.
        </p>
      </div>

      {/* 3 modos de exibição */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = heroMode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setHeroMode(opt.key)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                active
                  ? 'border-[#0284C7] bg-[#F0F9FF]'
                  : 'border-[#E6E2DA] bg-[#FCFBF8] hover:border-[#C5BEB2]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#24232A]">
                  <Icon className="h-4 w-4 text-[#0284C7]" />
                  {opt.title}
                </span>
                <span className={`text-[11px] font-bold ${active ? 'text-[#0284C7]' : 'text-[#8A8A93]'}`}>
                  {active ? '● Ativo' : '○'}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5A5863]">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Campos de vídeo (visíveis quando vídeo está ativo) */}
      {(heroMode === 'video' || heroMode === 'video_e_banner') && (
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-5 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <div className="relative overflow-hidden rounded-xl bg-[#0F172A]">
              <video
                key={heroVideoUrl || 'default-preview-video'}
                autoPlay
                muted
                loop
                playsInline
                poster="/videos/hero-poster.jpg"
                className="h-44 w-full object-cover"
              >
                {heroVideoUrl ? (
                  <source src={heroVideoUrl} />
                ) : (
                  <>
                    <source src="/videos/hero-3d.webm" type="video/webm" />
                    <source src="/videos/hero-3d.mp4" type="video/mp4" />
                  </>
                )}
              </video>
              <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                {heroVideoUrl ? 'Vídeo personalizado' : 'Vídeo padrão 1080p (< 2,3 MB)'}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleUploadVideo}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0284C7] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0369A1] disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Enviando...' : 'Substituir Vídeo (.mp4/.webm)'}
              </button>
              {heroVideoUrl && (
                <button
                  type="button"
                  onClick={() => setHeroVideoUrl('')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E2DA] bg-white px-3 py-2 text-xs font-semibold text-[#5A5863] transition hover:text-[#24232A]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar Padrão
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 lg:col-span-7">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#24232A]">
                URL Direta do Vídeo (opcional — MP4 ou WebM até 5 MB)
              </label>
              <input
                type="text"
                value={heroVideoUrl}
                onChange={(e) => setHeroVideoUrl(e.target.value)}
                placeholder="Deixe vazio para usar o vídeo padrão da RBS Criação"
                className="w-full rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2 text-xs text-[#24232A] outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#24232A]">
                Título Sobreposto no Vídeo
              </label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2 text-xs text-[#24232A] outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#24232A]">
                Subtítulo / Descrição do Vídeo
              </label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full rounded-xl border border-[#E6E2DA] bg-white px-3.5 py-2 text-xs text-[#24232A] outline-none focus:border-[#0284C7]"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          {statusMsg && (
            <p
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                statusMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {statusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {statusMsg.text}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#24232A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#F05A37] disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar Exibição do Topo'}
        </button>
      </div>
    </form>
  );
}
