'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera as Instagram, Phone, Mail, Globe } from 'lucide-react';

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function StoreFooter() {
  const [contact, setContact] = useState({
    whatsapp: '(21) 99888-7766',
    email: 'contato@rbscriacao.com',
    instagram: '@rbscriacao',
    instagramUrl: 'https://instagram.com/rbscriacao',
    facebook: '@rbscriacao',
    facebookUrl: 'https://facebook.com/rbscriacao',
    shippingText: 'Envio para todo o Brasil',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.brand) {
          setContact((prev) => ({
            ...prev,
            whatsapp: data.brand.whatsapp || prev.whatsapp,
            email: data.brand.email || prev.email,
            instagram: data.brand.instagram || prev.instagram,
            instagramUrl: data.brand.instagramUrl || prev.instagramUrl,
            facebook: data.brand.facebook || prev.facebook,
            facebookUrl: data.brand.facebookUrl || prev.facebookUrl,
            shippingText: data.brand.shippingText || prev.shippingText,
          }));
        }
      })
      .catch(() => {});
  }, []);

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
          <div className="space-y-2 pt-1 text-sm text-[#5A5863]">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-[#563487]" />
              <span>{contact.shippingText}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-[#563487]" />
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[#563487]"
              >
                {contact.whatsapp} (Atendimento via WhatsApp)
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#563487]" />
              <a
                href={`mailto:${contact.email}`}
                className="transition hover:text-[#563487]"
              >
                {contact.email}
              </a>
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
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition hover:text-[#563487]"
              >
                <Instagram className="h-4 w-4 text-[#563487]" />
                <span>Instagram {contact.instagram}</span>
              </a>
            </li>
            {contact.facebookUrl && (
              <li>
                <a
                  href={contact.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition hover:text-[#563487]"
                >
                  <FacebookIcon className="h-4 w-4 text-[#563487]" />
                  <span>Facebook RBS Criação</span>
                </a>
              </li>
            )}
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
