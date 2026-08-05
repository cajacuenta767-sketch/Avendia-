// src/components/home/BenefitsList.tsx
'use client';

import React from 'react';

interface BenefitCard {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const BENEFIT_CARDS: BenefitCard[] = [
  {
    id: 'minedu',
    title: 'Material oficial MINEDU',
    desc: 'Exámenes aplicados desde 2015 hasta el último publicado.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'resoluciones',
    title: 'Resoluciones detalladas',
    desc: 'Cada pregunta con explicación, conceptos clave y recomendaciones didácticas.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
    ),
  },
  {
    id: 'simulacros',
    title: 'Simulacros y prácticas ilimitadas',
    desc: 'Entrene todas las veces que necesite.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
    ),
  },
  {
    id: 'retroalimentacion',
    title: 'Retroalimentación inmediata',
    desc: 'Revise sus respuestas y fortalezca su aprendizaje.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'control',
    title: 'Control de tiempo, puntaje y avance',
    desc: 'Mida su rendimiento en tiempo real.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'cobertura',
    title: 'Cobertura por niveles y especialidades',
    desc: 'EBR, EBA y EBE en sus distintas áreas.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'acceso24h',
    title: 'Acceso las 24 horas',
    desc: 'Estudie desde cualquier momento y dispositivo.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
        </svg>
      </div>
    ),
  },
  {
    id: 'avendbot',
    title: 'AVEND BOT y herramientas de estudio',
    desc: 'Apoyo adicional con lector de texto, subrayado, pizarra y más.',
    icon: (
      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    ),
  },
];

export const BenefitsList: React.FC = () => {
  const handleCtaClick = () => {
    const loginEl = document.getElementById('login-form');
    if (loginEl) {
      loginEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full bg-gradient-to-b from-blue-50/80 via-indigo-50/40 to-blue-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-blue-100/90 dark:border-slate-800 p-6 sm:p-12 shadow-xl shadow-blue-500/5 text-center space-y-10 relative overflow-hidden">
      {/* Fondo Decorativo Atmosférico */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Cabecera de la Sección */}
      <div className="space-y-2 max-w-2xl mx-auto relative z-10">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          ¿Por qué elegir <span className="text-blue-600 dark:text-blue-400">AVEND ESCALA</span>?
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          Todo lo que necesita para prepararse mejor en un solo lugar.
        </p>
      </div>

      {/* 2. Cuadrícula de Beneficios (Grid de 8 Tarjetas Informativas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative z-10">
        {BENEFIT_CARDS.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center text-center shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3 group"
          >
            {card.icon}
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {card.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 3. Botón de Llamada a la Acción (CTA Verde Corporativo) */}
      <div className="pt-2 relative z-10 space-y-4 max-w-xl mx-auto">
        <button
          type="button"
          onClick={handleCtaClick}
          className="w-full bg-[#00a651] hover:bg-[#008f45] active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wider py-4 px-8 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>ÚNETE A LA PLATAFORMA AVEND ESCALA</span>
        </button>

        {/* 4. Pie de Sección (Prueba Social) */}
        <div className="flex items-center justify-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>
            Miles de docentes ya se preparan con <strong className="text-blue-600 dark:text-blue-400 font-black">AVEND ESCALA</strong>.
          </span>
        </div>
      </div>
    </section>
  );
};
