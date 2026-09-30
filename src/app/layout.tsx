// src/app/layout.tsx
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://cuadernillos.avend.pe'),
  title: 'AVEND ESCALA - Banco de Evaluaciones y Recursos MINEDU',
  description:
    'Plataforma oficial para docentes de descarga de cuadernillos, resoluciones, claves y recursos didácticos del Ministerio de Educación del Perú.',
  keywords: [
    'cuadernillos avend pe',
    'cuadernillos.avend.pe',
    'avend escala',
    'avend.pe',
    'evaluaciones minedu',
    'nombramiento docente',
    'ascenso docente',
    'banco de cuadernillos',
  ],
  alternates: {
    canonical: 'https://cuadernillos.avend.pe',
  },
  openGraph: {
    title: 'AVEND ESCALA - Banco de Evaluaciones y Recursos MINEDU',
    description:
      'Plataforma oficial para docentes de descarga de cuadernillos, resoluciones, claves y recursos didácticos del Ministerio de Educación del Perú.',
    url: 'https://cuadernillos.avend.pe',
    siteName: 'AVEND ESCALA',
    locale: 'es_PE',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/favicon.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png?v=3', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(event) {
                  if (
                    (event.filename && event.filename.includes('chrome-extension://')) ||
                    (event.message && (event.message.includes('M_ID') || event.message.includes('extension')))
                  ) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(event) {
                  if (
                    event.reason &&
                    (String(event.reason).includes('chrome-extension://') || String(event.reason).includes('M_ID'))
                  ) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50/60 text-gray-900 antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
