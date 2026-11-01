"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HELP_ARTICLES_LIST } from "@/lib/help-knowledge";
import {
  HelpCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function AdminAjudaPage() {
  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");

  const modules = ["ALL", ...Array.from(new Set(HELP_ARTICLES_LIST.map((a) => a.moduleName)))];

  const filtered = HELP_ARTICLES_LIST.filter((article) => {
    const matchesModule = selectedModule === "ALL" || article.moduleName === selectedModule;
    if (!query.trim()) return matchesModule;
    const q = query.toLowerCase();
    return (
      matchesModule &&
      (article.title.toLowerCase().includes(q) ||
        article.moduleName.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.practicalExample.toLowerCase().includes(q) ||
        article.steps.some((s) => s.toLowerCase().includes(q)) ||
        article.commonMistakes.some((m) => m.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/30 border border-[#E6E2DA] text-[#24232A] rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#563487]">
            <BookOpen className="w-4 h-4" /> Manual de Operação Integrado • Sem Código
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Central de Ajuda Operacional — RBS Criação
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5863] mt-2 leading-relaxed">
            Consulte o passo a passo de cada módulo, exemplos numéricos reais (como o cálculo da margem sobre preço de venda, conversão automática de filamento de <strong>kg para gramas</strong> e conciliação de taxas MDR) e links diretos para agir.
          </p>

          {/* Search Input */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 text-[#5A5863] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por tema (ex: filamento, gramas, DRE, margem, 49,24, Kanban, consignação, banner)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FCFBF8] border border-[#D5CFC4] text-sm text-[#24232A] placeholder:text-[#5A5863] focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Module Pills */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {modules.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedModule === mod
                    ? "bg-[#563487] text-white"
                    : "bg-[#F2EFE9] text-[#5A5863] hover:bg-[#E6E2DA]"
                }`}
              >
                {mod === "ALL" ? `Todos os Módulos (${HELP_ARTICLES_LIST.length})` : mod}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E6E2DA] p-10 text-center">
          <HelpCircle className="w-10 h-10 text-[#5A5863] mx-auto mb-2" />
          <h2 className="font-bold text-[#24232A]">Nenhum guia encontrado para &ldquo;{query}&rdquo;</h2>
          <p className="text-xs text-[#5A5863] mt-1">
            Tente termos como &ldquo;filamento&rdquo;, &ldquo;margem&rdquo;, &ldquo;DRE&rdquo;, &ldquo;Kanban&rdquo; ou &ldquo;consignação&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((article) => (
            <div
              key={article.key}
              className="bg-white rounded-3xl border border-[#E6E2DA] p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#563487]">
                      {article.moduleName}
                    </span>
                    <h2 className="text-lg font-black text-[#24232A] mt-0.5">{article.title}</h2>
                  </div>
                  <Link
                    href={article.relatedScreenUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3EFFA] hover:bg-[#462970]/25 text-[#563487] border border-[#D5C6EC] text-xs font-bold transition shrink-0"
                  >
                    Abrir Tela <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <p className="text-xs text-[#5A5863] leading-relaxed bg-[#FCFBF8] p-3.5 rounded-2xl border border-[#E6E2DA]">
                  {article.summary}
                </p>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                    Passo a Passo Operacional
                  </h3>
                  <ol className="space-y-1.5">
                    {article.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#5A5863]">
                        <span className="w-4 h-4 rounded-full bg-[#563487] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F3EFFA] border border-[#D5C6EC]">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#563487] mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#563487]" />
                    Exemplo Prático Real
                  </h3>
                  <p className="text-xs text-[#24232A] leading-relaxed">{article.practicalExample}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                    Erros Comuns a Evitar
                  </h3>
                  <ul className="space-y-1 text-xs text-[#5A5863] list-disc list-inside">
                    {article.commonMistakes.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E6E2DA] flex items-center justify-between">
                <code className="text-[11px] font-mono text-[#5A5863]">{article.relatedScreenUrl}</code>
                <Link
                  href={article.relatedScreenUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#563487] hover:text-[#563487] transition"
                >
                  {article.relatedScreenLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
