// src/components/cuadernillos/EvaluationCard.tsx
'use client';

import React from 'react';
import { Evaluacion } from '@/types/evaluacion';

interface EvaluationCardProps {
  evaluacion: Evaluacion;
  onOpenResource?: (
    evaluationId: string,
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => void;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluacion,
  onOpenResource,
}) => {
  const handleAction = (
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (onOpenResource) {
      onOpenResource(evaluacion.id, resourceType);
    } else {
      console.log(`Abriendo recurso ${resourceType} para evaluación ${evaluacion.id}`);
    }
  };

  return (
    <article className="group relative flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-800">
      {/* 1. Cabecera de la Tarjeta */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Badge de Modalidad / Tipo */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {evaluacion.modalidad} · {evaluacion.nivel}
          </span>

          <div className="flex items-center space-x-2">
            {/* Badge de Más Reciente */}
            {evaluacion.isLatest && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ★ Más Reciente
              </span>
            )}
            {/* Badge del Año */}
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
              {evaluacion.anio}
            </span>
          </div>
        </div>

        {/* Título de la Evaluación */}
        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          {evaluacion.titulo}
        </h3>

        {/* Etiqueta de Especialidad / Área */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium">{evaluacion.especialidadLabel}</span>
        </div>
      </div>

      {/* 2. Botonera Triple de Acción */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {/* Botón 1: Ver Cuadernillo */}
        <button
          type="button"
          onClick={(e) => handleAction('CUADERNILLO', e)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-200 text-xs font-bold transition-all border border-blue-100 dark:border-blue-900/50"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>VER CUADERNILLO</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-200/60 dark:bg-blue-900/80 text-blue-800 dark:text-blue-100 uppercase">
            PDF
          </span>
        </button>

        {/* Botón 2: Ver Resolución */}
        <button
          type="button"
          onClick={(e) => handleAction('RESOLUCION', e)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 text-xs font-bold transition-all border border-emerald-100 dark:border-emerald-900/50"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>VER RESOLUCIÓN</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 uppercase">
            SOLUCIONARIO
          </span>
        </button>

        {/* Botón 3: Ver Claves */}
        <button
          type="button"
          onClick={(e) => handleAction('CLAVES', e)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold transition-all border border-amber-100 dark:border-amber-900/50"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
            </svg>
            <span>VER CLAVES</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 uppercase">
            RESPUESTAS
          </span>
        </button>
      </div>
    </article>
  );
};
