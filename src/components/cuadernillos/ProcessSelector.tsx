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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
    subtitle: 'Cargos de gestión educativa',
    badge: 'Gestión',
    iconSvg: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
    numBg: 'bg-purple-600',
    cardBorder: 'border-purple-600 ring-2 ring-purple-500/20',
    cardBgSelected: 'bg-purple-50/70 dark:bg-purple-950/40',
    iconBgSelected: 'bg-purple-600 text-white',
    titleSelected: 'text-purple-700 dark:text-purple-300 font-extrabold',
  },
  ASCENSO_ESCALAFON: {
    numBg: 'bg-blue-600',
    cardBorder: 'border-blue-600 ring-2 ring-blue-500/20',
    cardBgSelected: 'bg-blue-50/70 dark:bg-blue-950/40',
    iconBgSelected: 'bg-blue-600 text-white',
    titleSelected: 'text-blue-700 dark:text-blue-300 font-extrabold',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    numBg: 'bg-emerald-600',
    cardBorder: 'border-emerald-600 ring-2 ring-emerald-500/20',
    cardBgSelected: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    iconBgSelected: 'bg-emerald-600 text-white',
    titleSelected: 'text-emerald-700 dark:text-emerald-300 font-extrabold',
  },
  INGRESO_CPM: {
    numBg: 'bg-purple-600',
    cardBorder: 'border-purple-600',
    cardBgSelected: 'bg-purple-50',
    iconBgSelected: 'bg-purple-600 text-white',
    titleSelected: 'text-purple-700',
  },
  REASIGNACION_DOCENTE: {
    numBg: 'bg-purple-600',
    cardBorder: 'border-purple-600',
    cardBgSelected: 'bg-purple-50',
    iconBgSelected: 'bg-purple-600 text-white',
    titleSelected: 'text-purple-700',
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
          <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
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
                  ? `${theme.cardBorder} ${theme.cardBgSelected} shadow-xs`
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
                <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight line-clamp-1 mt-0.5 font-medium">
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
