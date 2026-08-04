// src/app/layout.tsx
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import './globals.css';

export const metadata = {
  title: 'AVEND ESCALA - Banco de Evaluaciones y Recursos MINEDU',
  description:
    'Plataforma oficial para docentes de descarga de cuadernillos, resoluciones, claves y recursos didácticos del Ministerio de Educación del Perú.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50/60 text-gray-900 antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
