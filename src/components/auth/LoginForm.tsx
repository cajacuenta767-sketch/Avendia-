// src/components/auth/LoginForm.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAccountWhatsAppLink } from '@/lib/whatsapp';
import type { AccountWhatsAppReason } from '@/lib/whatsapp';
import { loginDirectoPorCorreoAction } from '@/services/usuariosService';
import { saveDocenteSession } from '@/lib/authSession';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 3>(1);
  const [email, setEmail] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [whatsappReason, setWhatsappReason] = useState<AccountWhatsAppReason>('LOGIN_ACCESS');

  const cardRef = useRef<HTMLDivElement>(null);
  const adminPinInputRef = useRef<HTMLInputElement>(null);

  // Centrado automático inmediato de la tarjeta en pantalla al cambiar al paso de PIN admin
  useEffect(() => {
    if (step === 3) {
      const timerId = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        adminPinInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [step]);

  const handleDirectLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setWhatsappReason('LOGIN_ACCESS');

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setErrorMessage('Por favor, escribe un correo electrónico válido.');
      return;
    }

    setIsLoading(true);

    const res = await loginDirectoPorCorreoAction(emailTrimmed);
    setIsLoading(false);

    if (res.success) {
      if (res.data.isAdmin) {
        setStep(3);
        setSuccessMessage('✓ Cuenta de Administrador detectada. Ingresa tu PIN de acceso.');
        return;
      }

      const docenteData = {
        id: res.data.id,
        nombre: res.data.nombre,
        email: res.data.email,
        rol: res.data.rol,
        estado: res.data.estado,
        accesoGranted: res.data.accesoGranted,
        region: (res.data as any).region || 'Lima',
        institucionEducativa: (res.data as any).institucionEducativa || '',
        modalidad: res.data.modalidad,
        nivel: res.data.nivel,
        areas: res.data.areas,
        fechaFin: res.data.fechaFin,
      };
      saveDocenteSession(docenteData);
      router.push('/cuadernillos');
    } else {
      if (res.error.code === 'UNREGISTERED_EMAIL') {
        setWhatsappReason('UNREGISTERED');
      }
      setErrorMessage(res.error.message);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setWhatsappReason('LOGIN_ACCESS');
  };

  const handleVerifyAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!adminPin.trim()) {
      setErrorMessage('Ingresa tu PIN de acceso de administrador.');
      return;
    }

    setIsLoading(true);
    const { verifyAdminCredentialsAction } = await import('@/services/adminService');
    const res = await verifyAdminCredentialsAction(email, adminPin.trim());
    setIsLoading(false);

    if (res.success) {
      const adminSessionData = {
        token: res.data.token,
        name: res.data.name,
        email: res.data.email || email,
        role: res.data.role,
        permisoUsuarios: res.data.permisoUsuarios ?? true,
        permisoCuadernillos: res.data.permisoCuadernillos ?? true,
        permisoRecursos: res.data.permisoRecursos ?? true,
        permisoMetricas: res.data.permisoMetricas ?? true,
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem('admin_auth_session', JSON.stringify(adminSessionData));
      sessionStorage.setItem('admin_auth_session', JSON.stringify(adminSessionData));
      document.cookie = `admin_auth_session=${encodeURIComponent(JSON.stringify(adminSessionData))}; path=/; max-age=${10 * 365 * 24 * 60 * 60}; SameSite=Lax`;
      window.dispatchEvent(new Event('admin_session_change'));
      // La Server Action ya emitió la cookie HTTP-only firmada. Una navegación
      // completa garantiza que el panel lea esa sesión en la siguiente solicitud.
      window.location.assign('/admin');
    } else {
      setErrorMessage('❌ PIN de acceso de administrador incorrecto.');
    }
  };

  const whatsappUrl = getAccountWhatsAppLink(whatsappReason, email);

  return (
    <div
      ref={cardRef}
      className="w-full max-w-[440px] mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-4.5 shadow-lg shadow-blue-500/5 dark:shadow-none space-y-2.5 sm:space-y-3 scroll-mt-24 transition-all"
    >
      {/* Insignia y Título Centrado */}
      <div className="text-center space-y-0.5">
        <div className="inline-flex items-center justify-center space-x-1.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-[#1d6bf3] dark:text-blue-400 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#0f172a] dark:text-white tracking-tight">
            Escribe tu correo
          </h2>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-center font-medium leading-tight max-w-sm mx-auto">
          Ingresa correctamente el correo registrado en <strong className="font-bold text-slate-800 dark:text-slate-200">AVEND ESCALA</strong> para acceder a todos los cuadernillos.
        </p>
      </div>

      {/* Alertas de Error o Éxito */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold leading-relaxed flex items-start space-x-2">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold leading-relaxed">
          {successMessage}
        </div>
      )}

      {/* FORMULARIO PASO 1, PASO 2 Y PASO 3 (PIN ADMIN) */}
      {step === 1 ? (
        <form onSubmit={handleDirectLogin} className="space-y-2.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1d6bf3]">
              <svg className="w-4 h-4 text-[#1d6bf3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-blue-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#1d6bf3] outline-none transition-all shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-[#1d6bf3] hover:bg-[#1557c0] text-white font-black text-xs tracking-wide uppercase shadow-sm shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] whitespace-nowrap"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>INGRESAR &rarr;</span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAdminPin} className="space-y-2.5">
          <div className="space-y-0.5">
            <label className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
              PIN DE ACCESO DE ADMINISTRADOR
            </label>
            <input
              ref={adminPinInputRef}
              type="password"
              autoFocus
              maxLength={12}
              required
              placeholder="CÓDIGO DE ACCESO / PIN"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-[#f8fafc] dark:bg-slate-800 text-center text-xs font-black text-slate-900 dark:text-white tracking-widest font-mono outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-sm shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>INGRESAR AL DASHBOARD ADMIN &gt;</span>
            )}
          </button>
        </form>
      )}

      {/* Divisor con punto central exacto */}
      <div className="flex items-center justify-center my-0.5 sm:my-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Botón Verde CTA: SOLICITAR ACCESO POR WHATSAPP */}
      <div className="space-y-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-11 rounded-xl bg-[#00a651] hover:bg-[#008f45] text-white font-black text-xs tracking-wide uppercase shadow-sm shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] whitespace-nowrap px-3"
        >
          <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.142-1.086z" />
          </svg>
          <span>{whatsappReason === 'UNREGISTERED' ? 'REGISTRARME POR WHATSAPP' : 'SOLICITAR ACCESO POR WHATSAPP'}</span>
        </a>

        {/* Subtexto Informativo Inferior */}
        <p className="text-[10.5px] text-center text-slate-400 font-normal leading-tight pt-0">
          El acceso es gratuito para los docentes usuarios en la plataforma AVEND ESCALA desde julio del 2026.
        </p>
      </div>
    </div>
  );
};
