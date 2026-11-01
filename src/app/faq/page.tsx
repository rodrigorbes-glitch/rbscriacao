import React from 'react';
import { HelpCircle, MessageSquare, Mail, Clock } from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';

export default function FaqContatoPage() {
  const faqs = [
    {
      q: 'Como é a textura das peças impressas em 3D?',
      a: 'Na impressão 3D, a peça ganha forma camada por camada (entre 0,12 mm e 0,20 mm). Essa trama sutil faz parte da identidade do objeto e realça o reflexo da luz nos acabamentos acetinados e furta-cor.',
    },
    {
      q: 'Como funciona a seleção de itens no carrinho?',
      a: 'Você pode guardar várias peças no carrinho e marcar apenas as que deseja comprar agora. As peças não marcadas continuam salvas no carrinho para uma próxima compra.',
    },
    {
      q: 'Por que o prazo de preparo aparece separado do frete?',
      a: 'Peças em pronta entrega saem em até 1 dia útil. Peças feitas sob encomenda ou com gravação personalizada levam de 2 a 4 dias úteis no estúdio antes do envio. Mostrar os dois prazos dá total clareza sobre a chegada do seu pedido.',
    },
    {
      q: 'Posso usar água e plantas naturais nos vasos?',
      a: 'Sim. Nossos cachepots em PETG são impermeáveis e os modelos vazados acompanham tubo interno estanque para receber água e flores naturais.',
    },
    {
      q: 'Como funcionam trocas e garantia?',
      a: 'Peças do catálogo contam com 7 dias corridos após o recebimento para troca ou devolução (Art. 49 do CDC). Peças feitas sob medida ou personalizadas com nome contam com garantia integral contra qualquer avaria no transporte ou divergência em relação ao pedido aprovado.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="border-b border-[#E6E2DA] pb-6">
          <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
            Atendimento ao cliente
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#24232A]">
            Perguntas frequentes e contato
          </h1>
        </div>

        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E6E2DA] bg-white p-5 sm:p-6"
            >
              <h2 className="font-display flex items-center gap-2 text-base font-semibold text-[#24232A]">
                <HelpCircle className="h-4 w-4 shrink-0 text-[#563487]" />
                <span>{item.q}</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A5863]">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#E6E2DA] bg-[#F2EFE9] p-6 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E6E2DA] bg-white p-4 text-xs">
            <MessageSquare className="h-5 w-5 text-[#563487]" />
            <strong className="mt-2 block text-sm text-[#24232A]">WhatsApp</strong>
            <span className="text-[#5A5863]">(21) 99888-7766</span>
          </div>
          <div className="rounded-xl border border-[#E6E2DA] bg-white p-4 text-xs">
            <Mail className="h-5 w-5 text-[#563487]" />
            <strong className="mt-2 block text-sm text-[#24232A]">E-mail</strong>
            <span className="text-[#5A5863]">contato@rbscriacao.com</span>
          </div>
          <div className="rounded-xl border border-[#E6E2DA] bg-white p-4 text-xs">
            <Clock className="h-5 w-5 text-[#563487]" />
            <strong className="mt-2 block text-sm text-[#24232A]">Horário de atendimento</strong>
            <span className="text-[#5A5863]">Segunda a sexta, 9h às 18h</span>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
