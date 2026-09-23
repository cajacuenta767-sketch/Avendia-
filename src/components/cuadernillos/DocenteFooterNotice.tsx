// src/components/cuadernillos/DocenteFooterNotice.tsx
'use client';

import React, { useState, useEffect } from 'react';

export const DocenteFooterNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // 1. Verificar si hay sesión activa de docente
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
    if (!sessionStr) {
      setIsVisible(false);
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      if (session && session.email) {
        const email = session.email.toLowerCase().trim();
        setUserEmail(email);

        // 2. Verificar si este docente específico ya vio y aceptó el mensaje
        const hasSeen = localStorage.getItem(`avend_footer_notice_seen_${email}`);
        if (!hasSeen) {
          setIsVisible(true);
        }
      }
    } catch {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    if (userEmail) {
      localStorage.setItem(`avend_footer_notice_seen_${userEmail}`, 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 mb-6 px-4">
      <div className="bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        
        {/* Texto Oficial en Cursiva y Tamaño Más Legible */}
        <p className="text-xs sm:text-sm md:text-[14px] text-slate-700 dark:text-slate-300 italic leading-relaxed text-left flex-1">
          📌 Los cuadernillos y claves MINEDU están disponibles libremente. Las resoluciones en PDF de <strong className="font-black not-italic text-slate-900 dark:text-white tracking-wide">AVEND ESCALA</strong> corresponden únicamente al último examen de Ascenso y al último examen de Nombramiento, y podrán descargarse solo según la modalidad, nivel y/o especialidad registrada por el docente.
        </p>

        {/* Botón de Confirmación para no volver a mostrar */}
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-extrabold cursor-pointer transition-all active:scale-95 flex items-center space-x-1.5 shadow-2xs"
          title="Entendido (No volver a mostrar)"
        >
          <span>✕</span>
          <span>Entendido</span>
        </button>
      </div>
    </div>
  );
};

export default DocenteFooterNotice;
