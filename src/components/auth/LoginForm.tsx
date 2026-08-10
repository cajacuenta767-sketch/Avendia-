// src/components/auth/LoginForm.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { solicitarCodigoOtpAction, verificarCodigoOtpAction } from '@/services/usuariosService';
import { checkIsAdminEmailAction } from '@/services/adminService';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [timer, setTimer] = useState<number>(54);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, escribe un correo electrónico válido.');
      return;
    }

    setIsLoading(true);

    const res = await solicitarCodigoOtpAction(email);
    setIsLoading(false);

    if (res.success) {
      setStep(2);
      setTimer(54);
      setIsTimerActive(true);
      setSuccessMessage(res.data.message);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanNumbers = pastedData.replace(/\D/g, '').slice(0, 4);

    if (cleanNumbers.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < cleanNumbers.length; i++) {
        newDigits[i] = cleanNumbers[i];
      }
      setOtpDigits(newDigits);

      const nextFocusIndex = Math.min(cleanNumbers.length, 3);
      inputRefs[nextFocusIndex].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const fullCode = otpDigits.join('');
    if (fullCode.length < 4) {
      setErrorMessage('Ingresa los 4 dígitos del código de confirmación.');
      return;
    }

    setIsLoading(true);
    const res = await verificarCodigoOtpAction(email, fullCode);
    setIsLoading(false);

    if (res.success) {
      if (res.data.isAdmin) {
        localStorage.removeItem('admin_auth_session');
        sessionStorage.removeItem('admin_auth_session');
        window.location.href = `/admin?email=${encodeURIComponent(res.data.email)}`;
        return;
      }

      const docenteData = {
        id: res.data.id,
        nombre: res.data.nombre,
        email: res.data.email,
        modalidad: res.data.modalidad,
        nivel: res.data.nivel,
        areas: res.data.areas,
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
    `Hola equipo de AVEND ESCALA, solicito el acceso para mi correo ${email || 'docente'}.`
  );

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-blue-500/5 space-y-5">
      {/* Insignia Superior */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#e0edff] dark:bg-blue-950 text-[#1d6bf3] dark:text-blue-300 text-[11px] font-extrabold uppercase tracking-wider border border-[#c7dcfd] dark:border-blue-900">
          <svg className="w-3.5 h-3.5 text-[#1d6bf3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>PORTAL DE ACCESO DOCENTE</span>
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-[#0f172a] dark:text-white tracking-tight">
          Ingresa a tu cuenta
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Escribe correctamente tu correo electrónico que ya ha registrado en AVEND ESCALA.
        </p>
      </div>

      {/* Alertas de Error o Éxito */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold leading-relaxed flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold leading-relaxed">
          {successMessage}
        </div>
      )}

      {/* FORMULARIO PASO 1 Y PASO 2 */}
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>SOLICITAR CÓDIGO DE ACCESO &gt;</span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {/* Fila del Correo con Botón Reenviar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
              />
            </div>

            <button
              type="button"
              disabled={isTimerActive}
              onClick={() => handleSendOtp()}
              className="h-11 px-3.5 rounded-xl bg-[#b9d5ff] dark:bg-blue-950 text-white dark:text-blue-200 text-xs font-bold disabled:opacity-80 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isTimerActive ? `Reenviar en ${timer}s` : 'Reenviar código'}
            </button>
          </div>

          {/* Seccion de los 4 Casilleros de Código OTP */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              INGRESA EL CÓDIGO DE 4 DÍGITOS
            </label>
            <div className="flex items-center justify-between gap-3">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-14 h-14 text-center text-xl font-black rounded-2xl border border-slate-300 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all shadow-2xs"
                />
              ))}
            </div>
          </div>

          {/* Botón Principal Azul: Confirmar e ingresar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-2xl bg-[#0052cc] hover:bg-[#0043a8] text-white font-extrabold text-xs tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Confirmar e ingresar</span>
            )}
          </button>

          {/* Nota Informativa con icono amarillo */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-4 h-4 rounded-full bg-amber-400 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
              ?
            </span>
            <span className="leading-tight">
              Revisa también la carpeta de spam o correo no deseado.
            </span>
          </div>

          {/* Enlace de Reenvío de código */}
          {isTimerActive && (
            <div className="text-center pt-0.5">
              <span className="text-[11px] font-medium text-slate-400">
                Reenviar código en {timer}s
              </span>
            </div>
          )}
        </form>
      )}

      {/* Divisor con punto central exacto */}
      <div className="relative flex items-center justify-center my-3">
        <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
        <span className="absolute bg-white dark:bg-slate-900 px-2 text-[10px] font-bold text-slate-400">
          o
        </span>
      </div>

      {/* Botón Verde CTA: SOLICITAR ACCESO POR WHATSAPP */}
      <div className="space-y-2.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 rounded-2xl bg-[#00a651] hover:bg-[#008744] text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.142-1.086z" />
          </svg>
          <span>SOLICITAR ACCESO POR WHATSAPP</span>
        </a>

        {/* Subtexto Informativo Inferior */}
        <p className="text-[10px] text-center text-slate-400 italic leading-snug font-serif">
          El acceso es gratuito para los docentes suscritos en la plataforma AVEND ESCALA desde julio del 2026.
        </p>
      </div>
    </div>
  );
};
