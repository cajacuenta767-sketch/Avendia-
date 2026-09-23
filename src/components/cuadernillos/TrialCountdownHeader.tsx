// src/components/cuadernillos/TrialCountdownHeader.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getFreshDocenteSessionAction } from '@/services/usuariosService';
import { getAccountWhatsAppLink } from '@/lib/whatsapp';

export const TrialCountdownHeader: React.FC = () => {
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const refreshSession = async () => {
      const rawSession = localStorage.getItem('docente_session');
      if (!rawSession) return;
      try {
        const localSession = JSON.parse(rawSession) as Record<string, unknown>;
        let session = localSession;
        const email = typeof localSession.email === 'string' ? localSession.email : '';
        if (email) {
          const fresh = await getFreshDocenteSessionAction(email);
          if (fresh.success && fresh.data) {
            session = { ...localSession, ...fresh.data };
            localStorage.setItem('docente_session', JSON.stringify(session));
          }
        }
        if (!active) return;
        const rol = typeof session.rol === 'string' ? session.rol.toUpperCase() : '';
        const isPrueba = rol.includes('PRUEBA') || rol.includes('24H') || rol.includes('TRIAL');
        if (isPrueba && typeof session.fechaFin === 'string') {
          setSessionData(session);
          setIsExpired(new Date(session.fechaFin) <= new Date());
        } else {
          setSessionData(null);
          setIsExpired(false);
        }
      } catch {
        if (active) setSessionData(null);
      }
    };

    void refreshSession();
    const interval = window.setInterval(() => void refreshSession(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!sessionData?.fechaFin) return;

    const checkTime = () => {
      const targetTime = new Date(sessionData.fechaFin).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        // Mantener la sesión: administración puede ampliar el acceso sin exigir otro login.
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [sessionData]);

  // Si el usuario es regular (1 año) o no está logueado, NO mostrar nada:
  if (!sessionData || !timeLeft) return null;

  // MODAL DE EXPULSIÓN INMEDIATA AL EXPIRAR LAS 24 HORAS
  if (isExpired) {
    const trialWhatsAppUrl = getAccountWhatsAppLink(
      'TRIAL_EXPIRED',
      typeof sessionData.email === 'string' ? sessionData.email : ''
    );
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-rose-500 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/70 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
            ⛔
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Prueba Gratuita Finalizada
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Tu periodo de acceso temporal de <strong>24 horas</strong> ha concluido. Para continuar practicando con todas las evaluaciones oficiales y claves, adquiere tu suscripción completa en <strong>AVEND ESCALA</strong>.
          </p>
          <div className="pt-2">
            <a
              href={trialWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
            >
              <span>💬</span>
              <span>Adquirir Suscripción por WhatsApp</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white underline pt-2 block mx-auto cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const formatDigits = (n: number) => String(n).padStart(2, '0');

  // BARRA SUPERIOR CON CUENTA REGRESIVA EN VIVO
  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2.5">
        <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-black uppercase tracking-wider border border-white/20">
          ⏳ PRUEBA GRATIS 24H
        </span>
        <span className="font-extrabold hidden sm:inline">
          Acceso temporal activo:
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 font-mono font-black text-sm bg-black/35 px-3 py-1 rounded-xl border border-white/20 shadow-inner">
          <span>{formatDigits(timeLeft.hours)}</span>
          <span className="animate-pulse">:</span>
          <span>{formatDigits(timeLeft.minutes)}</span>
          <span className="animate-pulse">:</span>
          <span>{formatDigits(timeLeft.seconds)}</span>
        </div>
        <a
          href="https://wa.me/51954562938?text=Hola%20AVEND%20ESCALA,%20quiero%20adquirir%20el%20acceso%20completo%20a%20cuadernillos"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-white text-orange-700 hover:bg-orange-50 font-black text-[11px] rounded-lg shadow-xs transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer"
        >
          <span>⭐</span>
          <span>Acceso Ilimitado</span>
        </a>
      </div>
    </div>
  );
};

export default TrialCountdownHeader;
