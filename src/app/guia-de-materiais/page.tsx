import React from 'react';
import Link from 'next/link';
import { Thermometer, ArrowRight } from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function GuiaDeMateriaisPage() {
  const materials = [
    {
      code: 'PLA e PLA Seda',
      subtitle: 'Acabamento acetinado, fosco ou furta-cor de origem vegetal',
      tempLimit: 'Até 55 °C',
      mechanical: 'Ótima definição visual para decoração e uso em ambientes internos.',
      finish: 'Seda acetinado, bicolor furta-cor ou fosco aveludado.',
      waterSafe: 'Indicado para áreas internas (acompanha tubo impermeável nos vasos vazados).',
      bestFor: 'Vasos decorativos, luminárias, colecionáveis e organizadores de mesa.',
      care: 'Limpar com pano macio úmido. Não deixar exposto ao sol forte dentro de veículos.',
      filterHref: '/catalogo?material=PLA',
    },
    {
      code: 'PETG',
      subtitle: 'Maior resistência mecânica e impermeabilidade',
      tempLimit: 'Até 72 °C',
      mechanical: 'Alta firmeza, resistente à umidade e ao manuseio constante.',
      finish: 'Acetinado ou texturizado.',
      waterSafe: '100% impermeável e lavável (ideal para vasos com terra e água direta).',
      bestFor: 'Cachepots autodrenantes, suportes de fone, chaveiros NFC e peças funcionais.',
      care: 'Lavável com água e sabão neutro.',
      filterHref: '/catalogo?material=PETG',
    },
    {
      code: 'ABS Técnico',
      subtitle: 'Resistência térmica para peças funcionais',
      tempLimit: 'Até 95 °C',
      mechanical: 'Alta resistência ao calor e a impactos mecânicos.',
      finish: 'Fosco técnico.',
      waterSafe: 'Resistente ao calor e áreas externas cobertas.',
      bestFor: 'Suportes automotivos, caixas de equipamentos e peças sob encomenda.',
      care: 'Indicado para projetos técnicos personalizados.',
      filterHref: '/personalizados',
    },
    {
      code: 'Resina 8K',
      subtitle: 'Superfície lisa para esculturas e miniaturas detalhadas',
      tempLimit: 'Até 60 °C',
      mechanical: 'Altíssima definição de detalhes sem camadas aparentes.',
      finish: 'Superfície lisa acetinada.',
      waterSafe: 'Uso decorativo interno.',
      bestFor: 'Esculturas de galeria, bustos e peças artísticas.',
      care: 'Limpar com flanela seca e evitar quedas.',
      filterHref: '/catalogo?material=Resina',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl border-b border-[#E6E2DA] pb-6">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Cuidados e materiais
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A] sm:text-4xl">
            Guia de materiais e conservação
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">
            Conheça as diferenças entre os materiais que utilizamos no estúdio para escolher a peça
            ideal para o seu ambiente.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {materials.map((m) => (
            <div
              key={m.code}
              className="flex flex-col justify-between rounded-2xl border border-[#E6E2DA] bg-white p-6"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold text-[#24232A]">{m.code}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFFA] px-3 py-1 text-xs font-semibold text-[#563487]">
                    <Thermometer className="h-3.5 w-3.5" />
                    <span>Temperatura: {m.tempLimit}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#5A5863]">{m.subtitle}</p>

                <div className="mt-4 space-y-2.5 text-xs text-[#5A5863]">
                  <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3">
                    <strong className="block text-[#24232A]">Características:</strong>
                    <span>{m.mechanical}</span>
                  </div>
                  <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3">
                    <strong className="block text-[#24232A]">Acabamento e uso com água:</strong>
                    <span>
                      {m.finish} • {m.waterSafe}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3">
                    <strong className="block text-[#24232A]">Recomendado para:</strong>
                    <span>{m.bestFor}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#E6E2DA] pt-4">
                <span className="text-xs text-[#5A5863]">{m.care}</span>
                <Link
                  href={m.filterHref}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#563487] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#462970]"
                >
                  <span>Ver peças</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
