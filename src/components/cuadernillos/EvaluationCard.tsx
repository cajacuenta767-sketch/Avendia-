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
    .replace(/^AIP\s*\/\s*Aula de Innovaci[oó]n Pedag[oó]gica/gi, 'Profesor de Innovación Pedagógica')
    .replace(/Aula de Innovaci[oó]n Pedag[oó]gica/gi, 'Profesor de Innovación Pedagógica')
    .replace(/^AIP\s*\/\s*/gi, '')
    .replace(/\bAIP\s*\/\s*/gi, '')
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
  const isAscenso = evaluacion.proceso === 'ASCENSO_ESCALAFON';
  const isNombramiento = evaluacion.proceso === 'NOMBRAMIENTO_DOCENTE' || evaluacion.proceso === 'INGRESO_CPM';

  // Extraer código oficial limpio (sin residuos de IDs, códigos sintéticos ni undefined/null)
  const rawCodigo =
    (evaluacion.codigoCuadernillo && evaluacion.codigoCuadernillo.trim()) ||
    (evaluacion.resources?.codigoCuadernillo && evaluacion.resources.codigoCuadernillo.trim()) ||
    (evaluacion.codigoResolucion && evaluacion.codigoResolucion.trim()) ||
    (evaluacion.resources?.codigoResolucion && evaluacion.resources.codigoResolucion.trim()) ||
    (evaluacion.codigoClaves && evaluacion.codigoClaves.trim()) ||
    (evaluacion.resources?.codigoClaves && evaluacion.resources.codigoClaves.trim()) ||
    (evaluacion as any).codigoExamen ||
    '';
  const isCodigoValido =
    Boolean(rawCodigo) &&
    !rawCodigo.startsWith('MINEDU-REC-') &&
    !rawCodigo.toUpperCase().includes('NO_APLICA') &&
    !rawCodigo.toLowerCase().includes('undefined') &&
    !rawCodigo.toLowerCase().includes('null') &&
    rawCodigo !== '—' &&
    rawCodigo !== '-';
  const codigoMostrar = isCodigoValido ? cleanNoAplicaText(rawCodigo) : '';

  const procesoConcursoLabel =
    isAscenso
      ? 'CONCURSO DE ASCENSO'
      : isDirectivos
      ? 'DIRECTIVOS'
      : 'CONCURSO DE NOMBRAMIENTO';

  const procesoMiniaturaLabel = isAscenso
    ? 'ASCENSO DE ESCALA'
    : isDirectivos
    ? 'CARGOS DIRECTIVOS'
    : 'NOMBRAMIENTO DOCENTE';

  const modalidadNombreCompleto =
    evaluacion.modalidad === 'EBR'
      ? 'Educación Básica Regular'
      : evaluacion.modalidad === 'EBA'
      ? 'Educación Básica Alternativa'
      : evaluacion.modalidad === 'EBE'
      ? 'Educación Básica Especial'
      : evaluacion.modalidad === 'CETPRO'
      ? 'Educación Técnico-Productiva'
      : evaluacion.modalidad;

  // Sanitización y cálculo independiente de Especialidad y Tipo de Cuadernillo
  const rawEspClean = cleanNoAplicaText(evaluacion.especialidad);
  const rawTitleClean = cleanNoAplicaText(evaluacion.titulo);

  // Determinar si el cuadernillo es Habilidades Generales
  const isHg =
    rawEspClean.toLowerCase().includes('habilidades generales') ||
    rawEspClean.toLowerCase().includes('general') ||
    rawTitleClean.toLowerCase().includes('habilidades generales') ||
    rawTitleClean.toLowerCase().includes('comprensión lectora') ||
    rawTitleClean.toLowerCase().includes('razonamiento lógico');

  const tipoCuadernilloDisplay =
    (evaluacion as any).tipoCuadernillo ||
    (isHg ? 'Habilidades Generales' : 'Conocimiento Curriculares y Pedagógicos');

  let especialidadDisplay = rawEspClean;
  if (isHg && (rawEspClean.toLowerCase().includes('habilidades generales') || rawEspClean.toLowerCase().includes('general'))) {
    const labelClean = cleanNoAplicaText(evaluacion.especialidadLabel);
    especialidadDisplay = (!labelClean.toLowerCase().includes('habilidades generales') && !labelClean.toLowerCase().includes('general')) ? labelClean : '';
  }

  // Verificación estricta de Nivel Válido según MINEDU
  const isNivelValido =
    !isDirectivos &&
    evaluacion.modalidad !== 'EBE' &&
    evaluacion.nivel &&
    evaluacion.nivel.toUpperCase() !== 'NO_APLICA' &&
    !evaluacion.nivel.toLowerCase().includes('no aplica') &&
    (evaluacion.nivel as string) !== '—' &&
    (evaluacion.nivel as string) !== '-';

  const formatNivelLimpio = (nivel?: string | null): string => {
    if (!nivel) return '';
    const n = nivel.trim().toUpperCase();
    if (n === 'NO_APLICA' || n.includes('NO APLICA')) return '';
    if (n === 'EBA_AVANZADO') return 'Avanzado';
    if (n === 'EBA_INICIAL_INTERMEDIO') return 'Inicial - Intermedio';
    if (n === 'INICIAL') return 'Inicial';
    if (n === 'PRIMARIA') return 'Primaria';
    if (n === 'SECUNDARIA') return 'Secundaria';
    return nivel
      .replace(/^EBA_/i, '')
      .replace(/^EBR_/i, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const nivelLimpioDisplay = isNivelValido ? formatNivelLimpio(evaluacion.nivel) : '';

  const isInicial = cleanNoAplicaText(evaluacion.nivel).toLowerCase().includes('inicial');
  const isPrimaria = cleanNoAplicaText(evaluacion.nivel).toLowerCase().includes('primaria');

  const normalizeForComparison = (s?: string | null): string => {
    if (!s) return '';
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^educacion\s+/i, '')
      .replace(/^eba\s+/i, '')
      .replace(/^ebr\s+/i, '')
      .replace(/[\s\-_/]+/g, '')
      .trim();
  };

  const isEspecialidadRedundante =
    isInicial ||
    normalizeForComparison(especialidadDisplay) === normalizeForComparison(cleanNoAplicaText(evaluacion.nivel)) ||
    normalizeForComparison(especialidadDisplay) === normalizeForComparison(nivelLimpioDisplay) ||
    (isPrimaria && (
      normalizeForComparison(especialidadDisplay) === 'primaria' ||
      normalizeForComparison(especialidadDisplay) === 'educacionprimaria' ||
      !especialidadDisplay
    ));

  const hasEspecialidadDisplay = Boolean(
    !isInicial &&
    especialidadDisplay &&
    especialidadDisplay !== '—' &&
    especialidadDisplay !== '-' &&
    especialidadDisplay.toUpperCase() !== 'NO_APLICA' &&
    especialidadDisplay.toLowerCase() !== 'general' &&
    especialidadDisplay.toLowerCase() !== 'sin especialidad' &&
    !isEspecialidadRedundante
  );

  // Orígenes configurables desde el panel de administración
  const origenCuadernillo = evaluacion.resources?.origenCuadernillo || 'MINEDU';
  const origenResolucion = evaluacion.resources?.origenResolucion || 'AVEND';
  const origenClaves = evaluacion.resources?.origenClaves || 'MINEDU';

  // Validación estricta de existencia real de archivos cargados
  const hasValidResource = (key?: string | null): boolean => {
    if (!key || !key.trim()) return false;
    const clean = key.trim().toLowerCase();
    return !clean.includes('ejemplo.pdf') && clean !== 'null' && clean !== 'undefined' && clean !== 'none';
  };

  const tieneCuadernillo = hasValidResource(evaluacion.resources?.cuadernilloKey || (evaluacion as any).urlCuadernillo);
  const tieneResolucion = hasValidResource(evaluacion.resources?.resolucionKey || (evaluacion as any).urlResolucion);
  const tieneClaves = hasValidResource(evaluacion.resources?.clavesKey || (evaluacion as any).urlClaves);

  const renderSourceBadge = (source: string) => {
    const isMinedu = source.toUpperCase() === 'MINEDU';
    if (isMinedu) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ml-auto border shadow-2xs bg-[#F3F4F6] border-[#D1D5DB] text-[#4B5563]">
          {source}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ml-auto border shadow-2xs bg-[#D1FAE5] border-[#6EE7B7] text-[#047857]">
        {source}
      </span>
    );
  };

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-3 border border-gray-200/90 dark:border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-none hover:shadow-[0_12px_28px_-5px_rgba(0,0,0,0.18),0_8px_10px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-blue-400/80 dark:hover:border-blue-500/50 transition-all duration-300 ease-out flex flex-col sm:flex-row items-stretch w-full overflow-hidden">
      {/* 1. Panel Lateral / Portada Miniatura en Móvil y Desktop (Estilo Fidedigno MINEDU) */}
      <div className="w-full sm:w-48 md:w-52 min-h-[175px] sm:min-h-[220px] bg-slate-100/90 dark:bg-slate-800/95 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shrink-0 border border-slate-200 dark:border-slate-700/80 shadow-2xs mb-3 sm:mb-0 transition-all">
        {isDirectivos ? (
          <div className="flex-1 flex flex-col justify-between">
            {/* ENCABEZADO: Título del Concurso + Bandera Perú */}
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-300/60 dark:border-slate-700/60 shrink-0">
              <span className="text-[8.5px] font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider truncate max-w-[130px]">
                CARGOS DIRECTIVOS
              </span>
              <span className="text-xs shrink-0 select-none">🇵🇪</span>
            </div>

            {/* CUERPO DEL PANEL: Concurso y Cargo Evaluado Dinámico */}
            <div className="flex-1 flex flex-col justify-center py-2 space-y-2 text-center">
              <div>
                <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                  CATEGORÍA
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-black text-gray-900 dark:text-white text-center uppercase leading-tight block mt-0.5 px-1">
                  Acceso a Cargos Directivos y Especialistas
                </span>
              </div>

              {/* CARGO / SUBCATEGORÍA DINÁMICA */}
              <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                  SUBCATEGORÍA
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-black text-gray-900 dark:text-white text-center leading-snug block mt-0.5 line-clamp-2 px-1">
                  {rawEspClean || (evaluacion as any).area || 'Directivos y Especialistas'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Nombramiento / Ascenso */
          <div className="flex-1 flex flex-col justify-between">
            {/* ENCABEZADO: Título del Concurso + Bandera Perú */}
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-300/60 dark:border-slate-700/60 shrink-0">
              <span className="text-[8.5px] font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider truncate max-w-[130px]">
                {procesoMiniaturaLabel}
              </span>
              <span className="text-xs shrink-0 select-none">🇵🇪</span>
            </div>

            {/* CUERPO DEL PANEL: Centrado verticalmente y balanceado */}
            <div className="flex-1 flex flex-col justify-center py-2 space-y-1.5 text-center">
              {/* MODALIDAD */}
              <div>
                <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                  MODALIDAD
                </span>
                <span className="text-[11px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5">
                  {modalidadNombreCompleto}
                </span>
              </div>

              {/* NIVEL (Oculto en Directivos y EBE) */}
              {isNivelValido && nivelLimpioDisplay && (
                <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                  <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                    NIVEL
                  </span>
                  <span className="text-[11px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5">
                    {nivelLimpioDisplay}
                  </span>
                </div>
              )}

              {/* ESPECIALIDAD */}
              {hasEspecialidadDisplay && (
                <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                  <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                    ESPECIALIDAD
                  </span>
                  <span className="text-[10.5px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5 line-clamp-2">
                    {especialidadDisplay}
                  </span>
                </div>
              )}

              {/* TIPO DE CUADERNILLO / EVALUACIÓN */}
              {isNombramiento && tipoCuadernilloDisplay ? (
                <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                  <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                    TIPO DE CUADERNILLO
                  </span>
                  <span className="text-[10px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5 line-clamp-2">
                    {tipoCuadernilloDisplay}
                  </span>
                </div>
              ) : isAscenso ? (
                <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                  <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                    TIPO DE EVALUACIÓN
                  </span>
                  <span className="text-[10px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5 line-clamp-2">
                    Conocimientos Pedagógicos
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* PIE DEL PANEL GRIS - Alineación perfecta del Año y Etiqueta de Concurso */}
        <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2.5 mt-auto flex items-center justify-between w-full gap-2">
          <span className="text-[9.5px] font-extrabold text-gray-600 dark:text-slate-400 uppercase leading-tight tracking-wider max-w-[65%]">
            {isDirectivos ? 'MINEDU' : procesoConcursoLabel}
          </span>
          <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none shrink-0 self-center">
            {evaluacion.anio}
          </span>
        </div>
      </div>

      {/* 2. Panel Principal (Contenido y Botones) */}
      <div className="flex-1 min-w-0 pl-0 sm:pl-3.5 md:pl-4 py-1 pr-1 flex flex-col justify-between bg-white dark:bg-slate-900">
        <div>
          {/* Fila Superior: Badge Único Modalidad - Nivel + Badge Novedad */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold truncate max-w-[220px] sm:max-w-none uppercase border ${
                evaluacion.proceso === 'ASCENSO_ESCALAFON'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  : isDirectivos
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
              }`}>
                {isNivelValido && nivelLimpioDisplay
                  ? `${evaluacion.modalidad} - ${nivelLimpioDisplay.toUpperCase()}`
                  : isDirectivos
                  ? (rawEspClean ? rawEspClean.toUpperCase() : 'ACCESO A CARGOS DIRECTIVOS')
                  : evaluacion.modalidad}
              </span>
            </div>

            {evaluacion.isLatest && !isDirectivos && (
              <span className="bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border border-[#A7F3D0]">
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

            {/* Subtítulo dinámico */}
            <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 line-clamp-2">
              {isDirectivos
                ? 'Evaluación oficial de cargos directivos'
                : isInicial
                ? (isHg ? 'Cuadernillo de Inicial' : 'Cuadernillo de Evaluación')
                : hasEspecialidadDisplay
                ? `Cuadernillo de ${especialidadDisplay}`
                : `Cuadernillo de ${nivelLimpioDisplay || 'Evaluación'}`}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">
              {isDirectivos ? `MINEDU ${evaluacion.anio}` : `Prueba Oficial MINEDU ${evaluacion.anio}`}
            </p>

            {codigoMostrar && (
              <div className="text-[10px] sm:text-[11px] font-mono mt-1 break-all sm:break-normal">
                <span className="text-rose-600 font-bold uppercase">CÓDIGO: </span>
                <span className="text-gray-900 dark:text-slate-100 font-bold">{codigoMostrar}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Botones de Acción Inferiores Renderizados Condicionalmente */}
        <div className="space-y-1.5 sm:space-y-2 w-full mt-3">
          {/* Botón 1: VER CUADERNILLO (Se muestra si existe el cuadernillo) */}
          {tieneCuadernillo && (
            <button
              type="button"
              onClick={(e) => handleAction('CUADERNILLO', e)}
              className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-black cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
                <svg className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
                <span className="truncate">VER CUADERNILLO</span>
              </div>
              {renderSourceBadge(origenCuadernillo)}
            </button>
          )}

          {/* Botón 2: VER RESOLUCIÓN (SOLO SE RENDERIZA SI REALMENTE TIENE ARCHIVO CARGADO) */}
          {tieneResolucion && (
            <button
              type="button"
              onClick={(e) => handleAction('RESOLUCION', e)}
              className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] text-[#047857] text-xs font-black cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
                <svg className="w-3.5 h-3.5 text-[#047857] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="truncate">VER RESOLUCIÓN</span>
              </div>
              {renderSourceBadge(origenResolucion)}
            </button>
          )}

          {/* Botón 3: VER CLAVES (Siempre disponible para abrir claves o mostrar aviso oficial MINEDU) */}
          <button
            type="button"
            onClick={(e) => handleAction('CLAVES', e)}
            className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-[#FFF9ED] hover:bg-[#FEF3C7] border border-[#FDE3A7] text-[#7C3F00] text-xs font-black cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0 pr-1 sm:pr-2">
              <svg className="w-3.5 h-3.5 text-[#D97706] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M15.75 2.25a6 6 0 00-5.918 5.068L2.47 14.682a1.5 1.5 0 00-.47 1.061V18.75a1.5 1.5 0 001.5 1.5H5.25a.75.75 0 00.75-.75V18h1.5a.75.75 0 00.75-.75v-1.5h1.5a.75.75 0 00.53-.22l1.64-1.64a6 6 0 103.83-11.64zm0 2.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm0 2.25a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" clipRule="evenodd" />
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
