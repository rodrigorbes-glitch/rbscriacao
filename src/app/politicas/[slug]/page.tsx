import React from 'react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default async function PoliticasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const isLgpd = slug.includes('privacidade') || slug.includes('lgpd');

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12 sm:px-6">
        <div className="space-y-4 rounded-2xl border border-[#E6E2DA] bg-white p-8 text-sm leading-relaxed text-[#5A5863]">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Políticas e transparência
          </p>
          <h1 className="font-display text-2xl font-semibold text-[#24232A]">
            {isLgpd
              ? 'Política de Privacidade, Cookies e Proteção de Dados (LGPD — Lei 13.709/2018)'
              : 'Política de Trocas, Devoluções, Prazos e Peças Personalizadas'}
          </h1>

          {isLgpd ? (
            <>
              <p>
                A <strong className="text-[#24232A]">RBS Criação</strong> coleta apenas os dados
                necessários para emissão fiscal, entrega logística, processamento seguro de
                pagamentos e avisos expressamente solicitados pelo cliente.
              </p>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                1. Avisos de produtos e comunicações
              </h2>
              <p>
                Quando você solicita um aviso de promoção ou reposição na página de um produto, seu
                consentimento é registrado exclusivamente para aquela peça, podendo ser cancelado a
                qualquer momento.
              </p>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                2. Arquivos enviados para orçamento personalizado
              </h2>
              <p>
                Arquivos 3D e referências enviados na página de personalizados são armazenados em
                ambiente privado e utilizados unicamente para análise e produção do pedido
                autorizado pelo cliente.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                1. Peças do catálogo
              </h2>
              <p>
                Conforme o Art. 49 do Código de Defesa do Consumidor, você dispõe de até 7 (sete)
                dias corridos após o recebimento para solicitar a troca ou devolução de peças de
                linha não personalizadas.
              </p>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                2. Peças personalizadas e sob medida
              </h2>
              <p>
                Peças produzidas mediante orçamento sob medida ou com gravação exclusiva de nomes e
                logotipos contam com garantia integral de substituição ou reembolso caso apresentem
                divergência em relação ao pedido aprovado ou avaria no transporte.
              </p>
              <h2 className="font-display text-base font-semibold text-[#24232A]">
                3. Textura característica da impressão 3D
              </h2>
              <p>
                As linhas sutis de deposição camada a camada são parte natural do processo de
                impressão 3D e conferem textura própria a cada objeto.
              </p>
            </>
          )}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
