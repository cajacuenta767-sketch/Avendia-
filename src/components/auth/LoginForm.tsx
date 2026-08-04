// src/components/auth/LoginForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { loginDocenteAction } from '@/services/usuariosService';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [emailOrDni, setEmailOrDni] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modales
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!emailOrDni.trim()) {
      setErrorMessage('Ingresa tu correo electrónico o número de DNI.');
      return;
    }

    if (!pin.trim() || pin.length < 4) {
      setErrorMessage('Ingresa un PIN de acceso válido.');
      return;
    }

    setIsLoading(true);

    const res = await loginDocenteAction(emailOrDni, pin);
    setIsLoading(false);

    if (res.success) {
      const docenteData = {
        id: res.data.id,
        dni: res.data.dni,
        nombre: res.data.nombre,
        email: res.data.email,
        fechaFin: res.data.fechaFin,
      };
      localStorage.setItem('docente_session', JSON.stringify(docenteData));
      window.dispatchEvent(new Event('docente_session_change'));
      router.push('/cuadernillos');
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const whatsappUrl = getWhatsAppLink(
    'Hola equipo de AVEND ESCALA, solicito la activación de mi cuenta para acceder al Banco de Evaluaciones MINEDU.'
  );

  return (
    <>
      <div className="w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-7 sm:p-8 shadow-xl shadow-blue-500/5 relative overflow-hidden">
        {/* Insignia Superior */}
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold uppercase tracking-wider border border-blue-100 dark:border-blue-900">
            🔐 Portal de Acceso Docente
          </span>
          <span className="text-[11px] font-semibold text-gray-400">ACCESO RÁPIDO</span>
        </div>

        <div className="mb-6 space-y-1">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Ingresa a tu cuenta
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ingresa tu correo o DNI registrado y tu PIN de acceso
          </p>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Input 1: Correo / DNI */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Correo Electrónico o DNI
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={emailOrDni}
                onChange={(e) => setEmailOrDni(e.target.value)}
                placeholder="ejemplo@docente.pe o 71234567"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Input 2: PIN de Acceso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                PIN de Acceso
              </label>
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                ¿Olvidaste tu PIN?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPin ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Botón 1: Iniciar Sesión */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>INGRESAR A MI CUENTA</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Enlace Limpio para Crear Cuenta Nueva */}
        <div className="my-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            ¿Docente nuevo? Crear cuenta aquí
          </button>
        </div>

        {/* Botón 2: Solicitar Acceso por WhatsApp (Verde Esmeralda CTA) */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.142-1.086z" />
          </svg>
          <span>SOLICITAR ACCESO POR WHATSAPP</span>
        </a>
      </div>

      {/* Modales Accesibles */}
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </>
  );
};
