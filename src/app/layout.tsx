import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RBS Criação | Estúdio Brasileiro de Objetos Impressos em 3D',
  description:
    'Objetos autorais de decoração, organização e presentes impressos em 3D com acabamento de estúdio. Peças prontas e projetos sob medida para todo o Brasil.',
  metadataBase: new URL('https://www.rbscriacao.com'),
  openGraph: {
    title: 'RBS Criação — Estúdio de Design & Impressão 3D (@rbscriacao)',
    description:
      'Vasos autorais, cachepots, utilidades e objetos personalizados impressos em 3D.',
    url: 'https://www.rbscriacao.com',
    siteName: 'RBS Criação',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${inter.variable}`}
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-screen bg-[#FCFBF8] text-[#24232A] antialiased selection:bg-[#563487] selection:text-white">
        {children}
      </body>
    </html>
  );
}
