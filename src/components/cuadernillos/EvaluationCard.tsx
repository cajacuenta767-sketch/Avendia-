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

function cleanNoAplicaText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/NO_APLICA\s*[-•]?\s*/gi, '')
    .replace(/No Aplica \/ Cargos Directivos\s*[-•]?\s*/gi, '')
    .replace(/No Aplica\s*[-•]?\s*/gi, '')
    .trim();
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

  const isDirectivos = evaluacion.proceso === 'ACCESO_CARGOS_DIRECTIVOS';

  const rawCodigo = evaluacion.codigo || evaluacion.mineduCode || '';
  const codigoMostrar = cleanNoAplicaText(rawCodigo);

  const procesoConcursoLabel =
    evaluacion.proceso === 'ASCENSO_ESCALAFON'
      ? 'CONCURSO DE ASCENSO'
      : isDirectivos
      ? 'DIRECTIVOS'
      : 'CONCURSO DE NOMBRAMIENTO';

  // Sanitización de nombres de cargos / especialidades
  const especialidadSubtitulo = cleanNoAplicaText(evaluacion.especialidad) || 'Acceso a cargos directivos';
  const tipoCuadernilloLabel = cleanNoAplicaText(evaluacion.especialidadLabel || evaluacion.titulo) || especialidadSubtitulo;

  // Orígenes configurables desde el panel de administración
  const origenCuadernillo = evaluacion.resources?.origenCuadernillo || 'MINEDU';
  const origenResolucion = evaluacion.resources?.origenResolucion || 'AVEND';
  const origenClaves = evaluacion.resources?.origenClaves || 'MINEDU';

  // Verificación estricta de Nivel Válido según MINEDU
  const isNivelValido =
    !isDirectivos &&
    evaluacion.nivel &&
    evaluacion.nivel.toUpperCase() !== 'NO_APLICA' &&
    !evaluacion.nivel.toLowerCase().includes('no aplica');

  const renderSourceBadge = (source: string) => {
    const isMinedu = source.toUpperCase() === 'MINEDU';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ml-auto border shadow-2xs ${
          isMinedu
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        }`}
      >
        {source}
      </span>
    );
  };

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-3 border border-gray-200/80 dark:border-slate-800 shadow-sm shadow-gray-200/50 dark:shadow-none transition-all duration-200 flex flex-col sm:flex-row items-stretch w-full overflow-hidden">
      {/* 1. Panel Lateral / Superior en Móvil (Estilo Fidedigno MINEDU) */}
      <div className="w-full sm:w-40 md:w-44 bg-gray-200/60 dark:bg-slate-800/90 rounded-2xl p-3.5 flex flex-col justify-between shrink-0 border border-gray-300/40 dark:border-slate-700/60 mb-3 sm:mb-0">
        {/* MODALIDAD / CATEGORÍA SUPERIOR */}
        <div>
          <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block">
            MODALIDAD
          </span>
          <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase block mt-0.5">
            {isDirectivos ? 'EVALUACIÓN DOCENTE' : evaluacion.modalidad}
          </span>
        </div>

        {/* NIVEL (Solo si es un nivel pedagógico válido: Inicial, Primaria, Secundaria) */}
        {isNivelValido && (
          <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 my-1">
            <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
              NIVEL
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 text-center block mt-1 capitalize">
              {evaluacion.nivel.toLowerCase()}
            </span>
          </div>
        )}

        {/* TIPO DE CARGO O ESPECIALIDAD */}
        <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 my-1">
          <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
            {isDirectivos ? 'TIPO DE CARGO O ESPECIALIDAD' : 'TIPO DE CUADERNILLO'}
          </span>
          <span className="text-[10px] font-bold text-gray-800 dark:text-slate-200 text-center leading-tight block mt-0.5 line-clamp-2">
            {especialidadSubtitulo}
          </span>
        </div>

        {/* PIE DEL PANEL GRIS (Directivos / Concurso + Año) */}
        <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 mt-1 flex items-end justify-between w-full">
          <span className="text-[7px] font-black text-gray-600 dark:text-slate-400 uppercase leading-tight w-20">
            {procesoConcursoLabel}
          </span>
          <span className="text-xl font-black text-gray-900 dark:text-white leading-none">
            {evaluacion.anio}
          </span>
        </div>
      </div>

      {/* 2. Panel Principal (Contenido y Botones) */}
      <div className="flex-1 min-w-0 pl-0 sm:pl-3.5 md:pl-4 py-1 pr-1 flex flex-col justify-between bg-white dark:bg-slate-900">
        <div>
          {/* Fila Superior: Píldora Modalidad + Badge Proceso + Badge Novedad */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold truncate border border-gray-200/80 dark:border-slate-700 max-w-[150px] sm:max-w-none">
                {isNivelValido ? `${evaluacion.modalidad} - ${evaluacion.nivel}` : evaluacion.modalidad}
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                evaluacion.proceso === 'ASCENSO_ESCALAFON'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200'
                  : isDirectivos
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200'
              }`}>
                {evaluacion.proceso === 'ASCENSO_ESCALAFON' ? 'EBR - ASCENSO' : isDirectivos ? 'EBR - DIRECTIVOS' : 'EBR - INICIAL'}
              </span>
            </div>

            {evaluacion.isLatest && (
              <span className="bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border border-emerald-200/80 dark:border-emerald-800">
                MÁS RECIENTE
              </span>
            )}
          </div>

          {/* Bloque Año y Subtítulo Fidedigno del Modelo Cliente MINEDU */}
          <div className="mt-2">
            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide block">
              AÑO
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight block leading-none mt-0.5">
              {evaluacion.anio}
            </span>

            {/* Subtítulo dinámico idéntico a las capturas oficiales MINEDU */}
            <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 line-clamp-1">
              {isDirectivos ? `Directivos - ${especialidadSubtitulo}` : `Cuadernillo de ${especialidadSubtitulo}`}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">
              {isDirectivos ? 'Evaluación para cargos de gestión' : `Prueba Oficial MINEDU ${evaluacion.anio}`}
            </p>

            <div className="text-[10px] sm:text-[11px] font-mono mt-1 break-all sm:break-normal">
              <span className="text-rose-600 font-bold uppercase">CÓDIGO: </span>
              <span className="text-gray-900 dark:text-slate-100 font-bold">{codigoMostrar}</span>
            </div>
          </div>
        </div>

        {/* 3. Botones de Acción Inferiores */}
        <div className="space-y-1.5 sm:space-y-2 w-full mt-3">
          {/* Botón 1: VER CUADERNILLO */}
          <button
            type="button"
            onClick={(e) => handleAction('CUADERNILLO', e)}
            className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs font-bold cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
              <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <span className="truncate">VER CUADERNILLO</span>
            </div>
            {renderSourceBadge(origenCuadernillo)}
          </button>

          {/* Botón 2: VER RESOLUCIÓN */}
          <button
            type="button"
            onClick={(e) => handleAction('RESOLUCION', e)}
            className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs font-bold cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span className="truncate">VER RESOLUCIÓN</span>
            </div>
            {renderSourceBadge(origenResolucion)}
          </button>

          {/* Botón 3: VER CLAVES */}
          <button
            type="button"
            onClick={(e) => handleAction('CLAVES', e)}
            className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-100 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
              <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1-1-1 1-1-1-2 2H2v-3.586l5.257-5.257A6 6 0 1118 8z" />
              </svg>
              <span className="truncate">VER CLAVES</span>
            </div>
            {renderSourceBadge(origenClaves)}
          </button>
        </div>
      </div>
    </article>
  );
};
