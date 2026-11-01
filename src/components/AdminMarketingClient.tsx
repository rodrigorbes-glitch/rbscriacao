"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Image as ImageIcon, ShieldAlert, CheckCircle2, Smartphone, Monitor, Crosshair } from "lucide-react";

export function AdminMarketingClient() {
  const router = useRouter();
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState(false);

  // Promotion Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [promoType, setPromoType] = useState<"coupon" | "sitewide" | "bundle">("coupon");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_cents">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrderReais, setMinOrderReais] = useState("120,00");
  const [minMarginGuardPct, setMinMarginGuardPct] = useState("18");

  // Banner Form + Live Preview State
  const [bannerTitle, setBannerTitle] = useState("Uma forma. Vários tons.");
  const [bannerSubtitle, setBannerSubtitle] = useState("O Vaso Premium Furta-Cor revela reflexos entre o cobre e o dourado conforme a luz natural percorre suas facetas em espiral.");
  const [ctaLabel, setCtaLabel] = useState("Conhecer o vaso");
  const [ctaUrl, setCtaUrl] = useState("/produto/vaso-premium-furta-cor");
  const [desktopImageUrl, setDesktopImageUrl] = useState("/products/real/ambiente-sala-vaso-espiral.png");
  const [mobileImageUrl, setMobileImageUrl] = useState("/products/real/vaso-espiral-cobre-mesa.png");
  const [focalPointX, setFocalPointX] = useState(48);
  const [focalPointY, setFocalPointY] = useState(58);
  const [overlayTheme, setOverlayTheme] = useState<"dark" | "light">("light");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Simulated Margin Impact Check
  const discountNum = Number(discountValue.replace(",", ".")) || 0;
  const guardNum = Number(minMarginGuardPct.replace(",", ".")) || 18;
  const estimatedPostPromoMargin = discountType === "percentage" ? 38 - discountNum : 38 - (discountNum / 130) * 100;
  const violatesGuard = estimatedPostPromoMargin < guardNum;

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    setLoadingPromo(true);
    setPromoMsg(null);
    const minOrderCents = Math.round((Number(minOrderReais.replace(",", ".")) || 0) * 100);
    const val =
      discountType === "fixed_cents"
        ? Math.round((Number(discountValue.replace(",", ".")) || 0) * 100)
        : Number(discountValue.replace(",", ".")) || 0;

    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_promotion",
        name,
        code: code.toUpperCase(),
        promoType,
        discountType,
        discountValue: val,
        minOrderCents,
        minMarginGuardPct: guardNum,
        status: violatesGuard ? "draft" : "active",
      }),
    });
    const data = await res.json();
    setLoadingPromo(false);
    if (data.ok) {
      setPromoMsg(
        violatesGuard
          ? "Promoção salva como RASCUNHO porque viola a trava de margem mínima configurada."
          : "Campanha promocional ativada com trava de margem validada!"
      );
      setName("");
      setCode("");
      router.refresh();
    } else {
      setPromoMsg(`Erro: ${data.error}`);
    }
  }

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    setLoadingBanner(true);
    setBannerMsg(null);
    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_banner",
        placement: "home_hero",
        title: bannerTitle,
        subtitle: bannerSubtitle,
        ctaLabel,
        ctaUrl,
        desktopImageUrl,
        mobileImageUrl,
        focalPointX,
        focalPointY,
        overlayTheme,
      }),
    });
    const data = await res.json();
    setLoadingBanner(false);
    if (data.ok) {
      setBannerMsg("Banner responsivo publicado com enquadramento Desktop (16:6) e Mobile (4:5) independentes!");
      router.refresh();
    } else {
      setBannerMsg(`Erro: ${data.error}`);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Banner Responsive Studio */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E6E2DA] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#563487]" />
            <h2 className="font-bold text-[#24232A]">Estúdio de Banners Responsivos (Desktop 16:6 & Mobile 4:5)</h2>
          </div>
          <div className="flex items-center gap-1 bg-[#FCFBF8] p-1 rounded-xl border border-[#E6E2DA]">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewMode === "desktop" ? "bg-[#563487] text-white" : "text-[#5A5863] hover:text-[#24232A]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop 16:6
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewMode === "mobile" ? "bg-[#563487] text-white" : "text-[#5A5863] hover:text-[#24232A]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile 4:5
            </button>
          </div>
        </div>

        {/* Live Responsive Preview */}
        <div className="mb-5 bg-[#FCFBF8] rounded-2xl p-4 flex items-center justify-center border border-[#E6E2DA]">
          <div
            className={`relative overflow-hidden rounded-xl border border-[#D5CFC4] transition-all ${
              previewMode === "desktop" ? "w-full aspect-16/6" : "w-64 aspect-4/5"
            }`}
          >
            <img
              src={previewMode === "desktop" ? desktopImageUrl : mobileImageUrl}
              alt="Preview do Banner"
              style={{ objectPosition: `${focalPointX}% ${focalPointY}%` }}
              className="w-full h-full object-cover"
            />
            <div
              className={`absolute inset-0 flex flex-col justify-end p-5 ${
                overlayTheme === "dark"
                  ? "bg-gradient-to-t from-zinc-950/95 via-zinc-950/50 to-transparent text-white"
                  : "bg-gradient-to-t from-white/95 via-white/60 to-transparent text-zinc-900"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#563487] mb-1">
                Preview {previewMode === "desktop" ? "Desktop 16:6" : "Mobile 4:5"} • Foco ({focalPointX}%, {focalPointY}%)
              </span>
              <h3 className={`font-black leading-tight ${previewMode === "desktop" ? "text-xl" : "text-sm"}`}>
                {bannerTitle}
              </h3>
              <p className={`mt-1 opacity-85 line-clamp-2 ${previewMode === "desktop" ? "text-xs" : "text-[11px]"}`}>
                {bannerSubtitle}
              </p>
              <div className="mt-3">
                <span className="inline-block px-3.5 py-1.5 rounded-lg bg-[#563487] text-white text-xs font-bold">
                  {ctaLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateBanner} className="space-y-3">
          {bannerMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800">
              {bannerMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Título Principal (Zona Segura)</label>
              <input
                type="text"
                required
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Subtítulo</label>
              <input
                type="text"
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Imagem Desktop (16:6)</label>
              <input
                type="text"
                required
                value={desktopImageUrl}
                onChange={(e) => setDesktopImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Imagem Mobile Exclusiva (4:5)</label>
              <input
                type="text"
                required
                value={mobileImageUrl}
                onChange={(e) => setMobileImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1 flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-[#563487]" /> Ponto Focal X ({focalPointX}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={focalPointX}
                onChange={(e) => setFocalPointX(Number(e.target.value))}
                className="w-full accent-[#563487]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1 flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-[#563487]" /> Ponto Focal Y ({focalPointY}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={focalPointY}
                onChange={(e) => setFocalPointY(Number(e.target.value))}
                className="w-full accent-[#563487]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Texto do Botão (CTA)</label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Contraste Overlay</label>
              <select
                value={overlayTheme}
                onChange={(e) => setOverlayTheme(e.target.value as "dark" | "light")}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
              >
                <option value="dark">Fundo Escuro (Texto Claro)</option>
                <option value="light">Fundo Claro (Texto Escuro)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingBanner}
            className="w-full py-2.5 rounded-xl bg-[#563487] hover:bg-[#462970] text-white font-bold text-xs transition cursor-pointer"
          >
            {loadingBanner ? "Publicando Banner..." : "Publicar Banner com Recorte Responsivo"}
          </button>
        </form>
      </div>

      {/* Promotion Engine with Margin Guard */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E6E2DA] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#563487]" />
            <h2 className="font-bold text-[#24232A]">Criar Promoção com Trava de Margem</h2>
          </div>

          {promoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900">
              {promoMsg}
            </div>
          )}

          <form onSubmit={handleCreatePromo} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#5A5863] mb-1">Nome da Campanha *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Semana Maker — 10% OFF acima de R$ 120"
                className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5A5863] mb-1">Código do Cupom</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: MAKER10"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5A5863] mb-1">Modalidade</label>
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
                >
                  <option value="coupon">Cupom no Checkout</option>
                  <option value="sitewide">Desconto Direto na Vitrine</option>
                  <option value="bundle">Combo Progressivo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5A5863] mb-1">Tipo Desconto</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed_cents">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5A5863] mb-1">Valor Desconto *</label>
                <input
                  type="text"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5A5863] mb-1">Pedido Mín. (R$)</label>
                <input
                  type="text"
                  value={minOrderReais}
                  onChange={(e) => setMinOrderReais(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] text-[#24232A] text-xs"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#24232A]">Trava de Margem Líquida Mínima (%)</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={minMarginGuardPct}
                  onChange={(e) => setMinMarginGuardPct(e.target.value)}
                  className="w-20 px-2.5 py-1 rounded-lg border border-[#D5CFC4] text-xs font-bold text-right bg-white text-[#24232A]"
                />
              </div>

              {violatesGuard ? (
                <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                  <div>
                    <strong>Alerta de Erosão de Margem:</strong> Margem estimada pós-desconto ({estimatedPostPromoMargin.toFixed(1)}%) fica abaixo da trava ({guardNum}%). A campanha será salva apenas como <strong>Rascunho</strong>.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-800" />
                  <div>
                    <strong>Margem Protegida:</strong> Margem estimada pós-desconto ({estimatedPostPromoMargin.toFixed(1)}%) respeita a trava mínima de {guardNum}%.
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingPromo}
              className="w-full py-2.5 rounded-xl bg-[#563487] hover:bg-[#462970] text-white font-bold text-xs transition cursor-pointer"
            >
              {loadingPromo
                ? "Validando impacto..."
                : violatesGuard
                ? "Salvar como Rascunho (Viola Trava)"
                : "Ativar Promoção com Trava de Margem"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
