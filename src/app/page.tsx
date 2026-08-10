// src/app/page.tsx
import React from 'react';
import { HeroHeader, HeroInfoBlocks } from '@/components/home/HeroSection';
import { BenefitsList } from '@/components/home/BenefitsList';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f8fc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-6 pb-20 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-7xl mx-auto w-full space-y-16">
        {/* Layout Superior de 2 Columnas Principal (Hero + Formulario de Acceso) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
          {/* Columna Izquierda: Encabezado Hero */}
          <div className="lg:col-span-7 space-y-8">
            <HeroHeader />

            {/* En Desktop: Los bloques informativos van en la columna izquierda */}
            <div className="hidden lg:block">
              <HeroInfoBlocks />
            </div>
          </div>

          {/* Columna Derecha: Formulario Principal de Acceso Docente + Bloques Informativos en Móvil */}
          <div id="login-form" className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none scroll-mt-24 space-y-8">
            <LoginForm />

            {/* En Móvil (Celular): Los bloques informativos aparecen justo debajo del Formulario de Acceso */}
            <div className="block lg:hidden">
              <HeroInfoBlocks />
            </div>
          </div>
        </div>

        {/* Sección Inferior de Propuesta de Valor y Conversión (Grid de 8 Beneficios + CTA Verde + Prueba Social) */}
        <BenefitsList />
      </div>
    </div>
  );
}
