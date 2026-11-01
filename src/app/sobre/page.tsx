import React from 'react';
import { Layers, ShieldCheck, MapPin } from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function SobrePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-[#E6E2DA] bg-white p-8 lg:p-12">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Nosso estúdio
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[#24232A] sm:text-4xl">
            Sobre a RBS Criação
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5A5863]">
            Sediada em Duque de Caxias / RJ e enviando para todo o Brasil, a{' '}
            <strong className="text-[#24232A]">RBS Criação</strong> desenha e produz objetos em
            impressão 3D com foco na beleza das formas, no toque dos materiais e na precisão do
            acabamento.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-5">
              <Layers className="h-6 w-6 text-[#563487]" />
              <h2 className="font-display mt-3 text-base font-semibold text-[#24232A]">
                Produção calibrada
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5A5863]">
                Cada peça é impressa com controle fino de camadas e inspecionada individualmente
                antes de sair da bancada.
              </p>
            </div>
            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-5">
              <ShieldCheck className="h-6 w-6 text-[#563487]" />
              <h2 className="font-display mt-3 text-base font-semibold text-[#24232A]">
                Materiais selecionados
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5A5863]">
                Utilizamos filamentos com brilho acetinado, textura fosca e alta resistência para
                cada uso.
              </p>
            </div>
            <div className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-5">
              <MapPin className="h-6 w-6 text-[#563487]" />
              <h2 className="font-display mt-3 text-base font-semibold text-[#24232A]">
                Prazos transparentes
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5A5863]">
                Você sabe com clareza quantos dias sua peça leva para ser preparada no estúdio e o
                tempo de entrega até sua casa.
              </p>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
