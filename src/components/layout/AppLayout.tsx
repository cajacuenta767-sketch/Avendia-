// src/components/layout/AppLayout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/common/Navbar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Si la ruta es /admin o derivado de admin, retornar únicamente children sin Navbar ni Footer global
  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            AVEND ESCALA — Plataforma para Docentes del Perú
          </p>
        </div>
      </footer>
    </div>
  );
};
