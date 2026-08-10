// src/components/home/HeroSection.tsx
'use client';

import React from 'react';

export const HeroHeader: React.FC = () => {
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.name || parsed.role || parsed.token || parsed.isAuthenticated)) {
          setIsAdmin(true);
        }
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-6">
      {/* Badge Superior */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#dbeafe] dark:bg-blue-950/80 text-[#1d4ed8] dark:text-blue-300 text-xs font-black uppercase tracking-wider border border-[#bfdbfe] dark:border-blue-900">
        <span className="text-sm">🚀</span>
        <span>{isAdmin ? 'ACCESO ADMIN' : 'ACCESO PLATAFORMA DOCENTE'}</span>
      </div>

    {/* Titular Principal Exacto de las imágenes */}
    <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-[#0f172a] dark:text-white tracking-tight leading-[1.12]">
      Prepárate para tu <br className="hidden sm:inline" />
      examen docente con{' '}
      <span className="text-[#1d6bf3]">
        material oficial y resoluciones AVEND ESCALA.
      </span>
    </h1>

    {/* Botones / Insignias de Procesos con los Colores Oficiales del Cliente */}
    <div className="flex flex-wrap gap-2.5 text-xs font-black uppercase tracking-wider pt-1">
      {/* Nombramiento: Morado / Púrpura */}
      <span className="px-4 py-2.5 rounded-2xl bg-purple-600 text-white flex items-center space-x-2 shadow-sm">
        <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>NOMBRAMIENTO</span>
      </span>

      {/* Ascenso de Escala: Azul */}
      <span className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white flex items-center space-x-2 shadow-sm">
        <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span>ASCENSO DE ESCALA</span>
      </span>

      {/* Cargos Directivos: Verde */}
      <span className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white flex items-center space-x-2 shadow-sm">
        <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>CARGOS DIRECTIVOS</span>
      </span>
    </div>
  </div>
);
};

export const HeroInfoBlocks: React.FC = () => (
  <div className="space-y-6">
    {/* Descripción Pedagógica Exacta */}
    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-medium pt-1">
      Acceso inmediato a la colección completa de cuadernillos y claves MINEDU,{' '}
      <strong className="font-extrabold text-[#1d6bf3]">
        descarga el solucionario completo
      </strong>{' '}
      de los últimos exámenes en formatos pdf listos para estudiar y sacar el máximo puntaje.
    </p>

    {/* Tarjeta Recomendación Inferior Exacta */}
    <div className="p-5 rounded-3xl bg-[#f0f6ff] dark:bg-slate-900/90 border border-[#dbeafe] dark:border-slate-800 flex items-center space-x-4 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <div className="text-xs space-y-0.5">
        <p className="font-black text-[#0f172a] dark:text-white text-xs sm:text-sm">
          Plataforma recomendada para docentes de todo el Perú
        </p>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-snug">
          EBR, EBA, EBE en todos sus niveles y áreas de especialidad como Inicial, Primaria, Secundaria, etc.
        </p>
      </div>
    </div>
  </div>
);

export const HeroSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <HeroHeader />
      <HeroInfoBlocks />
    </div>
  );
};
