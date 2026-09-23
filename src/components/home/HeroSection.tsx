// src/components/home/HeroSection.tsx
'use client';

import React from 'react';

export const HeroCenteredHeader: React.FC = () => {
  return (
    <div className="text-center space-y-1.5 max-w-4xl lg:max-w-5xl mx-auto relative z-10 pt-0.5">
      {/* Titular Principal +3px de alto en un solo párrafo continuo */}
      <h1 className="text-[28px] sm:text-[32px] md:text-[38px] lg:text-[42px] font-black text-[#0f172a] dark:text-white tracking-tight leading-[1.2] py-1 whitespace-normal sm:whitespace-nowrap">
        Cuadernillos de <span className="text-[#1d6bf3]">Evaluación Docente</span>
      </h1>

      {/* Subtítulo Descriptivo */}
      <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-tight px-2 max-w-2xl mx-auto">
        Encuentra, revisa y descarga cuadernillos, resoluciones y claves de evaluaciones anteriores.
      </p>
    </div>
  );
};

export const HeroCategoryPills: React.FC = () => {
  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto select-none pt-1 sm:pt-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4 w-full">
        {/* Pastilla 1: Nombramiento (Plano Estático) */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-center space-x-3 cursor-default">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
            NOMBRAMIENTO
          </span>
        </div>

        {/* Pastilla 2: Ascenso (Plano Estático) */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-center space-x-3 cursor-default">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#1d6bf3] dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-black text-[#1d6bf3] dark:text-blue-300 uppercase tracking-wider">
            ASCENSO
          </span>
        </div>

        {/* Pastilla 3: Directivos (Plano Estático) */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-center space-x-3 cursor-default">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            DIRECTIVOS
          </span>
        </div>
      </div>
    </div>
  );
};
