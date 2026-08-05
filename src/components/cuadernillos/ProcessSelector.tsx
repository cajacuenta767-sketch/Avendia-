// src/components/cuadernillos/ProcessSelector.tsx
'use client';

import React from 'react';
import { ProcesoMinedu } from '@/types/evaluacion';

interface ProcessOptionItem {
  id: ProcesoMinedu;
  title: string;
  subtitle: string;
  badge: string;
  iconSvg: React.ReactNode;
}

interface ProcessSelectorProps {
  selectedProceso: ProcesoMinedu;
  onSelectProceso: (proceso: ProcesoMinedu) => void;
}

const PROCESS_ITEMS: ProcessOptionItem[] = [
  {
    id: 'NOMBRAMIENTO_DOCENTE',
    title: 'Nombramiento',
    subtitle: 'Ingreso a la Carrera Pública Magisterial',
    badge: 'CPM',
    iconSvg: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'ASCENSO_ESCALAFON',
    title: 'Ascenso',
    subtitle: 'Ascenso en la Carrera Pública Magisterial',
    badge: 'Escala',
    iconSvg: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'ACCESO_CARGOS_DIRECTIVOS',
    title: 'Directivos',
    subtitle: 'Cargos de gestión',
    badge: 'Gestión',
    iconSvg: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

const PROCESS_THEMES: Record<ProcesoMinedu, {
  numBg: string;
  cardBorder: string;
  cardBgSelected: string;
  iconBgSelected: string;
  titleSelected: string;
}> = {
  NOMBRAMIENTO_DOCENTE: {
    numBg: 'bg-[#B45309]',
    cardBorder: 'border-[#B45309]',
    cardBgSelected: 'bg-[#FFF8F0] dark:bg-amber-950/30',
    iconBgSelected: 'bg-[#B45309] text-white',
    titleSelected: 'text-[#B45309] dark:text-amber-300',
  },
  ASCENSO_ESCALAFON: {
    numBg: 'bg-[#5B46F6]',
    cardBorder: 'border-[#5B46F6]',
    cardBgSelected: 'bg-[#F3F0FF] dark:bg-indigo-950/30',
    iconBgSelected: 'bg-[#5B46F6] text-white',
    titleSelected: 'text-[#5B46F6] dark:text-indigo-300',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    numBg: 'bg-[#0D9488]',
    cardBorder: 'border-[#0D9488]',
    cardBgSelected: 'bg-[#F0FAF8] dark:bg-teal-950/30',
    iconBgSelected: 'bg-[#0D9488] text-white',
    titleSelected: 'text-[#0D9488] dark:text-teal-300',
  },
  INGRESO_CPM: {
    numBg: 'bg-[#B45309]',
    cardBorder: 'border-[#B45309]',
    cardBgSelected: 'bg-[#FFF8F0]',
    iconBgSelected: 'bg-[#B45309] text-white',
    titleSelected: 'text-[#B45309]',
  },
  REASIGNACION_DOCENTE: {
    numBg: 'bg-[#B45309]',
    cardBorder: 'border-[#B45309]',
    cardBgSelected: 'bg-[#FFF8F0]',
    iconBgSelected: 'bg-[#B45309] text-white',
    titleSelected: 'text-[#B45309]',
  },
};

export const ProcessSelector: React.FC<ProcessSelectorProps> = ({
  selectedProceso,
  onSelectProceso,
}) => {
  const activeTheme = PROCESS_THEMES[selectedProceso] || PROCESS_THEMES.NOMBRAMIENTO_DOCENTE;

  return (
    <section className="w-full space-y-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
      {/* Encabezado del Paso 1 */}
      <div className="flex items-center space-x-2.5">
        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white font-extrabold text-xs shadow-2xs transition-colors duration-300 ${activeTheme.numBg}`}>
          1
        </span>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Elige el proceso
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            Comienza seleccionando el concurso que estás preparando.
          </p>
        </div>
      </div>

      {/* Tarjetas de Selección de Proceso */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {PROCESS_ITEMS.map((item) => {
          const isSelected = selectedProceso === item.id;
          const theme = PROCESS_THEMES[item.id];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectProceso(item.id)}
              className={`relative flex items-center space-x-3 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? `${theme.cardBorder} ${theme.cardBgSelected} shadow-xs ring-1 ring-black/5`
                  : 'border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Icono de Proceso */}
              <div
                className={`p-2 rounded-lg shrink-0 transition-colors duration-300 ${
                  isSelected
                    ? theme.iconBgSelected
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                {item.iconSvg}
              </div>

              {/* Título y Subtítulo */}
              <div className="min-w-0">
                <h3
                  className={`text-xs font-bold transition-colors duration-300 ${
                    isSelected
                      ? theme.titleSelected
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.title}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight line-clamp-1 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
