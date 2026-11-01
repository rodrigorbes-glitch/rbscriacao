import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Cpu,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';

export default function EmpresasB2BPage() {
  const progressiveTiers = [
    {
      qty: '25 unidades',
      unitPriceCents: 1199,
      totalCents: 29975,
      discount: 'Lote inicial',
      leadDays: '3 dias úteis',
    },
    {
      qty: '50 unidades',
      unitPriceCents: 1079,
      totalCents: 53950,
      discount: '10% de desconto',
      leadDays: '4 dias úteis',
    },
    {
      qty: '100 unidades',
      unitPriceCents: 949,
      totalCents: 94900,
      discount: '21% de desconto',
      leadDays: '5 dias úteis',
    },
    {
      qty: '250+ unidades',
      unitPriceCents: 799,
      totalCents: 199750,
      discount: '33% de desconto',
      leadDays: '7 dias úteis',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E6E2DA] bg-[#F2EFE9] p-8 lg:p-12">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#563487] uppercase">
            <Building2 className="h-4 w-4" />
            <span>Para empresas, eventos e escritórios</span>
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[#24232A] sm:text-4xl">
            Brindes com aproximação NFC, troféus autorais e lotes corporativos
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5A5863]">
            Produzimos objetos com a marca da sua empresa em alto-relevo bicolor e aproximação
            digital NFC embutida na peça, sem exigir moldes caros ou quantidades industriais.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/personalizados"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#563487] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#462970]"
            >
              <span>Solicitar orçamento corporativo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/produto/chaveiro-nfc-corporativo-lote"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#E6E2DA] bg-white px-5 py-3 text-sm font-semibold text-[#24232A] transition hover:border-[#563487] hover:text-[#563487]"
            >
              <span>Ver lote de chaveiros NFC</span>
            </Link>
          </div>
        </div>

        {/* 3 Pillars */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <Cpu className="h-7 w-7 text-[#563487]" />
            <h2 className="font-display mt-3 text-lg font-semibold text-[#24232A]">
              Chaveiros e displays com NFC embutido
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">
              Inserimos o chip NFC dentro da peça durante a impressão. Ao aproximar o celular, seu
              cliente abre o Instagram, WhatsApp ou site da sua marca.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <Award className="h-7 w-7 text-[#563487]" />
            <h2 className="font-display mt-3 text-lg font-semibold text-[#24232A]">
              Troféus com nomes individuais
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">
              Desenhamos troféus tridimensionais com acabamento em cobre, dourado ou preto fosco,
              personalizando o nome de cada homenageado.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
            <Layers className="h-7 w-7 text-[#563487]" />
            <h2 className="font-display mt-3 text-lg font-semibold text-[#24232A]">
              Peças técnicas e suportes sob medida
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">
              Produção de gabinetes, suportes de equipamentos e organizadores personalizados com
              repetibilidade dimensional.
            </p>
          </div>
        </div>

        {/* Progressive Pricing Table */}
        <div className="mt-12 rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-[#24232A]">
            Valores de referência por lote (Chaveiro personalizado com NFC)
          </h2>
          <p className="mt-1 text-sm text-[#5A5863]">
            Valores progressivos conforme a quantidade do pedido.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {progressiveTiers.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-5"
              >
                <span className="inline-block rounded-md bg-[#F3EFFA] px-2.5 py-0.5 text-xs font-semibold text-[#563487]">
                  {t.discount}
                </span>
                <h3 className="font-display mt-2 text-lg font-semibold text-[#24232A]">
                  {t.qty}
                </h3>
                <div className="mt-2 text-2xl font-bold text-[#24232A]">
                  {formatBRLFromCents(t.unitPriceCents)}
                  <span className="text-xs font-normal text-[#5A5863]"> / un</span>
                </div>
                <p className="mt-1 text-xs text-[#5A5863]">
                  Total do lote:{' '}
                  <strong className="text-[#24232A]">{formatBRLFromCents(t.totalCents)}</strong>
                </p>
                <p className="mt-2 text-xs text-[#6E6B78]">Prazo médio: {t.leadDays}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
