// src/app/page.tsx
import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { BenefitsList } from '@/components/home/BenefitsList';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-start pt-4 pb-16 sm:pt-6 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 space-y-12">
      <div className="max-w-7xl mx-auto w-full space-y-12">
        {/* Layout Superior de 2 Columnas Principal (Hero + Formulario de Acceso) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Columna Izquierda: Hero & Resumen */}
          <div className="lg:col-span-7 space-y-8">
            <HeroSection />
          </div>

          {/* Columna Derecha: Formulario Principal de Acceso Docente */}
          <div id="login-form" className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none scroll-mt-24">
            <LoginForm />
          </div>
        </div>

        {/* Sección Inferior de Propuesta de Valor y Conversión (Grid de 8 Beneficios + CTA Verde + Prueba Social) */}
        <BenefitsList />
      </div>
    </div>
  );
}
