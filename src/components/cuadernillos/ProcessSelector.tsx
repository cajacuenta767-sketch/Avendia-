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
    title: 'Nombramiento Docente',
    subtitle: 'Ingreso a la Carrera Pública Magisterial y Prueba Única Nacional',
    badge: 'CPM',
    iconSvg: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'ASCENSO_ESCALAFON',
    title: 'Ascenso de Escala',
    subtitle: 'Promoción a escalas superiores y ascenso en la CPM',
    badge: 'Escala',
    iconSvg: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'ACCESO_CARGOS_DIRECTIVOS',
    title: 'Acceso a Directivos',
    subtitle: 'Concurso para Directores de IE y Especialistas UGEL/DRE',
    badge: 'Gestión',
    iconSvg: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

const PROCESS_COLORS: Partial<Record<ProcesoMinedu, {
  border: string;
  bgSelected: string;
  badgeSelected: string;
  titleSelected: string;
  ring: string;
}>> = {
  NOMBRAMIENTO_DOCENTE: {
    border: 'border-purple-600',
    bgSelected: 'bg-purple-50/70 dark:bg-purple-950/40',
    badgeSelected: 'bg-purple-600 text-white',
    titleSelected: 'text-purple-900 dark:text-purple-200',
    ring: 'ring-purple-500/30',
  },
  ASCENSO_ESCALAFON: {
    border: 'border-blue-600',
    bgSelected: 'bg-blue-50/70 dark:bg-blue-950/40',
    badgeSelected: 'bg-blue-600 text-white',
    titleSelected: 'text-blue-900 dark:text-blue-200',
    ring: 'ring-blue-500/30',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    border: 'border-emerald-600',
    bgSelected: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    badgeSelected: 'bg-emerald-600 text-white',
    titleSelected: 'text-emerald-900 dark:text-emerald-200',
    ring: 'ring-emerald-500/30',
  },
};

export const ProcessSelector: React.FC<ProcessSelectorProps> = ({
  selectedProceso,
  onSelectProceso,
}) => {
  return (
    <section className="w-full space-y-4">
      {/* Encabezado del Paso 1 */}
      <div className="flex items-center space-x-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm">
          1
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Elige el proceso de evaluación
        </h2>
      </div>

      {/* Tarjetas de Selección de Proceso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROCESS_ITEMS.map((item) => {
          const isSelected = selectedProceso === item.id;
          const colors = PROCESS_COLORS[item.id] ?? {
            border: 'border-purple-600',
            bgSelected: 'bg-purple-50/70 dark:bg-purple-950/40',
            badgeSelected: 'bg-purple-600 text-white',
            titleSelected: 'text-purple-900 dark:text-purple-200',
            ring: 'ring-purple-500/30',
          };

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectProceso(item.id)}
              className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 ${
                isSelected
                  ? `${colors.border} ${colors.bgSelected} shadow-md ring-1 ${colors.ring}`
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
              }`}
            >
              {/* Badge superior e Icono */}
              <div className="w-full flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    isSelected
                      ? colors.badgeSelected
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {item.iconSvg}
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isSelected
                      ? colors.badgeSelected
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {item.badge}
                </span>
              </div>

              {/* Título y Subtítulo */}
              <h3
                className={`text-lg font-bold mb-1 ${
                  isSelected
                    ? colors.titleSelected
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {item.subtitle}
              </p>

              {/* Indicador Check Activo */}
              {isSelected && (
                <div className={`absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full ${colors.badgeSelected}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
