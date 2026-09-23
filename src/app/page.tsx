// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroCenteredHeader, HeroCategoryPills } from '@/components/home/HeroSection';
import { BenefitsList } from '@/components/home/BenefitsList';
import { LoginForm } from '@/components/auth/LoginForm';
import { getDocenteSession } from '@/lib/authSession';

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    // 1. Verificar sesión docente activa
    const session = getDocenteSession();
    if (session && (session.email || session.id)) {
      router.replace('/cuadernillos');
      return;
    }

    // 2. Verificar sesión de administrador activa
    try {
      const adminRaw = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session')) : null;
      if (adminRaw) {
        const parsedAdmin = JSON.parse(adminRaw);
        if (parsedAdmin && (parsedAdmin.token || parsedAdmin.role || parsedAdmin.name || parsedAdmin.isAuthenticated)) {
          router.replace('/admin');
          return;
        }
      }
    } catch {
      // Ignorar errores de parseo
    }

    setIsCheckingAuth(false);
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f4f8fc] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-md" />
        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Verificando sesión activa...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-0 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden space-y-8">
      <div className="max-w-7xl mx-auto w-full space-y-8 relative pt-0">
        {/* Layout Superior Centrado Ajustado (Hero Title -> Login Card -> Category Pills) */}
        <div id="login-form" className="w-full space-y-2 sm:space-y-2.5 pt-0 scroll-mt-12 flex flex-col items-center">
          <HeroCenteredHeader />
          <LoginForm />
          <HeroCategoryPills />
        </div>

        {/* Sección Inferior de Propuesta de Valor y Conversión (Grid de 8 Beneficios - INTOCADO) */}
        <BenefitsList />
      </div>
    </div>
  );
}
