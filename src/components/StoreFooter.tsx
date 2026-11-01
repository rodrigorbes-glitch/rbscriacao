import React from 'react';
import Link from 'next/link';
import { Camera as Instagram, MapPin, Phone, Mail } from 'lucide-react';

export function StoreFooter() {
  return (
    <footer className="border-t border-[#E6E2DA] bg-[#F2EFE9] text-[#24232A]">
      {/* Main Footer Columns */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="space-y-4 md:col-span-4">
          <Link href="/" className="inline-block">
            <img
              src="/logo_rbs.png"
              alt="RBS Criação"
              className="h-11 w-auto object-contain"
            />
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-[#5A5863]">
            Estúdio brasileiro de objetos impressos em 3D. Desenhamos e produzimos vasos autorais,
            peças para organizar a rotina, presentes personalizados e lotes corporativos com acabamento de precisão.
          </p>
          <div className="space-y-1.5 pt-1 text-sm text-[#5A5863]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#563487]" />
              <span>Duque de Caxias / RJ • CEP 25020-140 (Envio para todo o Brasil)</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-[#563487]" />
              <span>(21) 99888-7766 (Atendimento via WhatsApp)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#563487]" />
              <span>contato@rbscriacao.com</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <h3 className="font-display text-sm font-semibold tracking-tight text-[#24232A]">
            Comprar
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#5A5863]">
            <li>
              <Link href="/catalogo" className="transition hover:text-[#563487]">
                Catálogo completo
              </Link>
            </li>
            <li>
              <Link href="/categoria/vasos-cachepots" className="transition hover:text-[#563487]">
                Decorar (Vasos e esculturas)
              </Link>
            </li>
            <li>
              <Link href="/categoria/organizacao-setup" className="transition hover:text-[#563487]">
                Organizar (Mesa e trabalho)
              </Link>
            </li>
            <li>
              <Link href="/categoria/presentes-articulados" className="transition hover:text-[#563487]">
                Presentear (Colecionáveis e lembranças)
              </Link>
            </li>
            <li>
              <Link href="/personalizados" className="transition hover:text-[#563487]">
                Pedir uma peça personalizada
              </Link>
            </li>
            <li>
              <Link href="/empresas" className="transition hover:text-[#563487]">
                Para empresas e eventos
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="font-display text-sm font-semibold tracking-tight text-[#24232A]">
            Pedir ajuda
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#5A5863]">
            <li>
              <Link href="/minha-conta" className="transition hover:text-[#563487]">
                Acompanhar meu pedido
              </Link>
            </li>
            <li>
              <Link href="/carrinho" className="transition hover:text-[#563487]">
                Meu carrinho
              </Link>
            </li>
            <li>
              <Link href="/faq" className="transition hover:text-[#563487]">
                Perguntas frequentes
              </Link>
            </li>
            <li>
              <Link href="/guia-de-materiais" className="transition hover:text-[#563487]">
                Cuidados e materiais
              </Link>
            </li>
            <li>
              <Link href="/politicas/trocas-e-personalizados" className="transition hover:text-[#563487]">
                Trocas, devoluções e garantia
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="font-display text-sm font-semibold tracking-tight text-[#24232A]">
            Conhecer a RBS Criação
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#5A5863]">
            <li>
              <Link href="/sobre" className="transition hover:text-[#563487]">
                Nosso estúdio e processo
              </Link>
            </li>
            <li>
              <Link href="/instagram" className="inline-flex items-center gap-1.5 transition hover:text-[#563487]">
                <Instagram className="h-4 w-4 text-[#563487]" />
                <span>@rbscriacao no Instagram</span>
              </Link>
            </li>
            <li>
              <Link href="/parceiros" className="transition hover:text-[#563487]">
                Lojas parceiras e consignação
              </Link>
            </li>
            <li>
              <Link href="/politicas/privacidade-lgpd" className="transition hover:text-[#563487]">
                Privacidade e dados (LGPD)
              </Link>
            </li>
            <li className="pt-2">
              <Link
                href="/admin"
                className="text-xs font-medium text-[#6E6B78] underline decoration-[#D5CFC4] underline-offset-4 transition hover:text-[#563487]"
              >
                Acesso administrativo (Área restrita)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#E6E2DA] bg-[#EAE5DC] py-5 text-xs text-[#5A5863]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span>© 2026 RBS Criação (rbscriacao.com). Todos os direitos reservados.</span>
          <span>Pagamento via Pix (5% de desconto) e Cartão • Envio pelos Correios e Jadlog</span>
        </div>
      </div>
    </footer>
  );
}
