import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

// Importa a configuração de cache padrão do next-pwa (CommonJS workaround)
const defaultCache = require("next-pwa/cache");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Mantém as regras padrões, mas adiciona NetworkOnly para admin e api no topo
  runtimeCaching: [
    {
      urlPattern: /^\/admin.*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'admin-routes',
      },
    },
    {
      urlPattern: /^\/api.*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api-routes',
      },
    },
    ...defaultCache,
  ],
});

const nextConfig: NextConfig = {
  /* Use webpack bundler for next-pwa compatibility */
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },
};

export default withPWA(nextConfig);
