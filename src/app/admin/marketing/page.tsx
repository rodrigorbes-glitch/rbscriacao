import React from "react";
import { getDb } from "@/db";
import { formatBRLFromCents } from "@/lib/format";
import { HelpBalloon } from "@/components/HelpBalloon";
import { HELP_ARTICLES } from "@/lib/help-knowledge";
import { AdminMarketingClient } from "@/components/AdminMarketingClient";
import { Image as ImageIcon, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const db = await getDb();

  const [promotions, banners] = await Promise.all([
    db.query<any>("SELECT * FROM promotions ORDER BY created_at DESC"),
    db.query<any>("SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#563487]">
            RBS Operações → Marketing, Promoções & Identidade Visual
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#24232A] mt-1">
            Marketing, Promoções & Banners Responsivos
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Estúdio de banners com enquadramento independente Desktop (16:6) e Mobile (4:5), ponto focal X/Y e trava de margem mínima.
          </p>
        </div>
        <HelpBalloon article={HELP_ARTICLES["marketing-banners"]} />
      </div>

      {/* Studio & Promotion Engine */}
      <AdminMarketingClient />

      {/* Active Promotions & Banners Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E6E2DA] p-6">
          <h2 className="font-bold text-[#24232A] mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#563487]" />
            Campanhas & Cupons Cadastrados ({promotions.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E2DA] text-[11px] font-bold uppercase tracking-wider text-[#5A5863]">
                  <th className="py-2.5 px-2">Campanha / Código</th>
                  <th className="py-2.5 px-2">Regra de Desconto</th>
                  <th className="py-2.5 px-2">Pedido Mín.</th>
                  <th className="py-2.5 px-2">Trava Margem</th>
                  <th className="py-2.5 px-2">Usos</th>
                  <th className="py-2.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2DA] text-xs text-[#24232A]">
                {promotions.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F2EFE9]">
                    <td className="py-3 px-2">
                      <div className="font-bold text-[#24232A]">{p.name}</div>
                      {p.code && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-[#FCFBF8] border border-[#E6E2DA] font-mono text-[11px] font-bold text-[#563487]">
                          {p.code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-bold text-[#563487]">
                      {p.promotion_type === "percentage" || p.promotion_type === "pix_discount"
                        ? `${Number(p.discount_value)}% OFF`
                        : `${formatBRLFromCents(Number(p.discount_value) * 100)} OFF`}
                    </td>
                    <td className="py-3 px-2 text-[#5A5863]">{formatBRLFromCents(Number(p.min_order_cents))}</td>
                    <td className="py-3 px-2 font-bold text-[#24232A]">Mín. {Number(p.min_margin_guard_pct)}%</td>
                    <td className="py-3 px-2 text-[#5A5863]">
                      {p.current_uses} {p.max_uses ? `/ ${p.max_uses}` : ""}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                            : "bg-amber-50 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {p.status === "active" ? "Ativa" : "Rascunho"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Banners Table */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E6E2DA] p-6">
          <h2 className="font-bold text-[#24232A] mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#563487]" />
            Banners Ativos ({banners.length})
          </h2>
          <div className="space-y-3">
            {banners.map((b: any) => (
              <div key={b.id} className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] flex gap-3 items-center">
                <img
                  src={b.desktop_image_url}
                  alt={b.title}
                  className="w-20 h-12 rounded-lg object-cover border border-[#E6E2DA] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#563487]">
                      {b.placement}
                    </span>
                    <span className="text-[10px] text-[#5A5863] font-mono">
                      Foco ({b.focal_point_x}%, {b.focal_point_y}%)
                    </span>
                  </div>
                  <div className="font-bold text-xs text-[#24232A] truncate">{b.title}</div>
                  <div className="text-[11px] text-[#5A5863] truncate">
                    Desktop (16:6) + Mobile (4:5): {b.mobile_image_url}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
