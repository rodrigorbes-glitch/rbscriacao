'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, X, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { getHelpArticleByModule, HelpArticle } from '@/lib/help-knowledge';

export function HelpBalloon({
  moduleSlug,
  article: providedArticle,
  customTitle,
}: {
  moduleSlug?: string;
  article?: HelpArticle;
  customTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const article = providedArticle || getHelpArticleByModule(moduleSlug || 'visao-geral');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#D5C6EC] bg-[#F3EFFA] px-3.5 py-1.5 text-xs font-semibold text-[#563487] transition hover:bg-[#563487] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#563487]"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Como funciona?</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={customTitle || article.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E6E2DA] bg-white p-6 text-[#24232A] shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E2DA] pb-4">
              <div>
                <span className="inline-block rounded-md bg-[#F3EFFA] px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-[#563487] uppercase">
                  Ajuda contextual • {article.menuLabel}
                </span>
                <h3 className="font-display mt-1.5 text-lg font-semibold text-[#24232A]">
                  {customTitle || article.title}
                </h3>
                <p className="mt-1 text-xs text-[#5A5863]">{article.summary}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar ajuda contextual (ESC)"
                className="cursor-pointer rounded-lg border border-[#E6E2DA] bg-[#FCFBF8] p-1.5 text-[#5A5863] hover:bg-[#F2EFE9] hover:text-[#24232A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-[#24232A]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Passo a passo recomendado</span>
                </h4>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-[#24232A]">
                  {article.steps.map((step, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[#E6E2DA] bg-[#FCFBF8] p-2.5"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-[#D5C6EC] bg-[#F3EFFA] p-3.5">
                <div className="text-xs font-semibold tracking-wide text-[#563487] uppercase">
                  Exemplo prático
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#24232A]">
                  {article.practicalExample}
                </p>
              </div>

              {article.commonMistakes.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 uppercase">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    <span>O que evitar</span>
                  </div>
                  <ul className="mt-1 list-inside list-disc text-xs text-amber-950">
                    {article.commonMistakes.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E2DA] pt-4">
              <Link
                href="/admin/ajuda"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#563487] hover:underline"
              >
                <BookOpen className="h-4 w-4" />
                <span>Abrir manual completo na Central de Ajuda</span>
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-xl bg-[#563487] px-4 py-2 text-xs font-semibold text-white hover:bg-[#462970]"
              >
                Entendi (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
