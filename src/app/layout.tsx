import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RBS Criação",
  description: "Peças exclusivas e brindes personalizados. Compre no varejo ou seja um distribuidor parceiro.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RBS Criação",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "RBS Criação",
    description: "Peças exclusivas e brindes personalizados. Compre no varejo ou seja um distribuidor parceiro.",
    url: "https://www.rbscriacao.com",
    siteName: "RBS Criação",
    images: [
      {
        url: "https://www.rbscriacao.com/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Logo RBS Criação",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RBS Criação",
    description: "Peças exclusivas e brindes personalizados. Compre no varejo ou seja um distribuidor parceiro.",
    images: ["https://www.rbscriacao.com/icons/icon-512x512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
