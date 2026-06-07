'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Falha ao registrar Service Worker:', error);
        });
    }
  }, []);

  return null;
}
