// src/components/cuadernillos/CascadingFilters.tsx
'use client';

import React, { useMemo } from 'react';
import {
  EvaluacionesFilterParams,
  ModalidadEducativa,
  NivelEducativo,
  ProcesoMinedu,
} from '@/types/evaluacion';

interface CascadingFiltersProps {
  filters: EvaluacionesFilterParams;
  onFilterChange: (updatedFilters: EvaluacionesFilterParams) => void;
  onResetFilters: () => void;
  resultsCount?: number;
  activeProceso?: ProcesoMinedu;
  activeSubcategoria?: string;
  onSubcategoriaChange?: (sub: 'TODOS' | 'HABILIDADES_GENERALES' | 'CONOCIMIENTOS_CURRICULARES') => void;
}

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD,
  AREAS_POR_MODALIDAD_NIVEL,
  ESPECIALIDADES_DIRECTIVOS_LIST,
  ModalidadKey,
} from '@/data/cascadingData';

const ANIOS = [
  { value: '2024', label: 'Todos los años' },
  { value: '2023', label: 'Año 2023' },
  { value: '2022', label: 'Año 2022' },
  { value: '2021', label: 'Año 2021' },
  { value: '2019', label: 'Año 2019' },
  { value: '2018', label: 'Año 2018' },
  { value: '2017', label: 'Año 2017' },
  { value: '2015', label: 'Año 2015' },
  { value: '2014', label: 'Año 2014' },
];

const PROCESO_THEMES: Record<ProcesoMinedu, {
  numBg: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  iconColor: string;
}> = {
  NOMBRAMIENTO_DOCENTE: {
    numBg: 'bg-purple-600',
    infoBg: 'bg-purple-50/70 dark:bg-purple-950/30',
    infoBorder: 'border-purple-200/80',
    infoText: 'text-purple-700 dark:text-purple-300',
    iconColor: 'text-purple-600',
  },
  ASCENSO_ESCALAFON: {
    numBg: 'bg-blue-600',
    infoBg: 'bg-blue-50/70 dark:bg-blue-950/30',
    infoBorder: 'border-blue-200/80',
    infoText: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    numBg: 'bg-emerald-600',
    infoBg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    infoBorder: 'border-emerald-200/80',
    infoText: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-600',
  },
  INGRESO_CPM: {
    numBg: 'bg-purple-600',
    infoBg: 'bg-purple-50',
    infoBorder: 'border-purple-200',
    infoText: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
  REASIGNACION_DOCENTE: {
    numBg: 'bg-purple-600',
    infoBg: 'bg-purple-50',
    infoBorder: 'border-purple-200',
    infoText: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
};

export const CascadingFilters: React.FC<CascadingFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  resultsCount,
  activeProceso = 'NOMBRAMIENTO_DOCENTE',
  activeSubcategoria = 'TODOS',
  onSubcategoriaChange,
}) => {
  const isDirectivos = activeProceso === 'ACCESO_CARGOS_DIRECTIVOS';

  const currentModalidad = (filters.modalidad && filters.modalidad !== 'TODOS') ? filters.modalidad : '';

  const nivelesDisponibles = useMemo(() => {
    if (isDirectivos) return [];
    const targetModalidad = (currentModalidad as ModalidadKey) || 'EBR';
    return NIVELES_POR_MODALIDAD[targetModalidad] || NIVELES_POR_MODALIDAD.EBR;
  }, [currentModalidad, isDirectivos]);

  const currentNivel = useMemo(() => {
    if (isDirectivos) return 'NO_APLICA';
    if (filters.nivel && filters.nivel !== 'TODOS') {
      return filters.nivel;
    }
    return '';
  }, [filters.nivel, isDirectivos]);

  const especialidadesDisponibles = useMemo(() => {
    if (isDirectivos) return ESPECIALIDADES_DIRECTIVOS_LIST;
    if (!currentModalidad || !currentNivel) return [];
    const modKey = currentModalidad as ModalidadKey;
    const areasObj = AREAS_POR_MODALIDAD_NIVEL[modKey];
    if (!areasObj) return [];
    return areasObj[currentNivel] || [];
  }, [currentModalidad, currentNivel, isDirectivos]);

  const currentEspecialidad = useMemo(() => {
    if (isDirectivos) {
      if (filters.especialidad && filters.especialidad !== 'TODOS') {
        return filters.especialidad;
      }
      return '';
    }
    if (filters.especialidad && filters.especialidad !== 'TODOS') {
      return filters.especialidad;
    }
    return '';
  }, [filters.especialidad, isDirectivos]);

  const currentAnio = (filters.anio && filters.anio !== 'TODOS') ? String(filters.anio) : '';

  const theme = PROCESO_THEMES[activeProceso] || PROCESO_THEMES.NOMBRAMIENTO_DOCENTE;

  const handleModalidadChange = (nuevaModalidadStr: string) => {
    const nuevaModalidad = nuevaModalidadStr as ModalidadEducativa;
    onFilterChange({
      ...filters,
      modalidad: nuevaModalidad,
      nivel: isDirectivos ? ('NO_APLICA' as NivelEducativo) : ('' as any),
      especialidad: '',
    });
  };

  const handleNivelChange = (nuevoNivel: string) => {
    onFilterChange({
      ...filters,
      modalidad: currentModalidad as ModalidadEducativa,
      nivel: nuevoNivel as NivelEducativo,
      especialidad: '',
    });
  };

  const handleEspecialidadChange = (nuevaEspecialidad: string) => {
    onFilterChange({
      ...filters,
      modalidad: currentModalidad as ModalidadEducativa,
      nivel: currentNivel as NivelEducativo,
      especialidad: nuevaEspecialidad,
    });
  };

  const handleAnioChange = (nuevoAnioStr: string) => {
    onFilterChange({
      ...filters,
      modalidad: currentModalidad as ModalidadEducativa,
      nivel: currentNivel as NivelEducativo,
      especialidad: currentEspecialidad,
      anio: nuevoAnioStr ? Number(nuevoAnioStr) : ('' as any),
    });
  };

  const procesoNombre = activeProceso === 'ASCENSO_ESCALAFON'
    ? 'Ascenso'
    : activeProceso === 'ACCESO_CARGOS_DIRECTIVOS'
    ? 'Directivos'
    : 'Nombramiento';

  const nivelTextoLabel = nivelesDisponibles.find((n) => n.value === currentNivel)?.label;

  const isEspecialidadComplete = useMemo(() => {
    if (!currentModalidad) return false;
    if (isDirectivos) return !!currentEspecialidad;
    if (!currentNivel) return false;
    if (filters.modalidad === 'EBE' || (currentNivel && especialidadesDisponibles.length === 0)) {
      return true;
    }
    return !!currentEspecialidad;
  }, [currentModalidad, currentNivel, currentEspecialidad, isDirectivos, filters.modalidad, especialidadesDisponibles]);

  const showSubpruebasFilter = useMemo(() => {
    if (activeProceso !== 'NOMBRAMIENTO_DOCENTE') return false;
    if (!currentModalidad) return false;

    // 1. Nombramiento EBR Primaria -> Primaria
    if (currentModalidad === 'EBR' && currentNivel === 'PRIMARIA' && currentEspecialidad.toLowerCase().trim() === 'primaria') {
      return true;
    }

    // 2. Niveles sin especialidad diferenciada (Ej. EBR Inicial, EBE, o niveles con lista vacia)
    if (currentModalidad === 'EBR' && currentNivel === 'INICIAL') {
      return true;
    }

    if (filters.modalidad === 'EBE' || (currentNivel && especialidadesDisponibles.length === 0)) {
      return true;
    }

    return false;
  }, [activeProceso, currentModalidad, currentNivel, currentEspecialidad, filters.modalidad, especialidadesDisponibles]);

  return (
    <section className="w-full space-y-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
      {/* Encabezado del Paso 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white font-extrabold text-xs shadow-2xs transition-colors duration-300 ${theme.numBg}`}>
            2
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
              Completa los datos
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              Las opciones se desbloquean en orden secuencial según cada selección.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Restablecer</span>
        </button>
      </div>

      {/* Grid Adaptable de Selectores en Cascada */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isDirectivos ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3 pt-1`}>
        {/* Paso 1: Modalidad */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            Modalidad
          </label>
          <select
            value={filters.modalidad && filters.modalidad !== 'TODOS' ? filters.modalidad : ''}
            onChange={(e) => handleModalidadChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
          >
            <option value="" disabled hidden className="text-gray-400">
              Selecciona tu modalidad
            </option>
            {MODALIDADES_LIST.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Paso 2: Nivel Educativo */}
        {!isDirectivos && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
              Nivel
            </label>
            <select
              value={filters.modalidad === 'EBE' ? '—' : currentNivel}
              onChange={(e) => handleNivelChange(e.target.value)}
              disabled={!currentModalidad || filters.modalidad === 'EBE'}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {!currentModalidad ? (
                <option value="" disabled hidden className="text-gray-400">
                  🔒 Primero selecciona modalidad
                </option>
              ) : filters.modalidad === 'EBE' ? (
                <option value="—">No requiere nivel (EBE)</option>
              ) : (
                <>
                  <option value="" disabled hidden className="text-gray-400">
                    Selecciona tu nivel
                  </option>
                  {nivelesDisponibles.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}

        {/* Paso 3: Cargo o Especialidad */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            {isDirectivos ? 'Cargo a Postular (MINEDU)' : 'Área o especialidad'}
          </label>
          <select
            value={
              filters.modalidad === 'EBE' || (!isDirectivos && currentNivel && especialidadesDisponibles.length === 0)
                ? '—'
                : currentEspecialidad
            }
            onChange={(e) => handleEspecialidadChange(e.target.value)}
            disabled={
              !currentModalidad ||
              (!isDirectivos && !currentNivel) ||
              filters.modalidad === 'EBE' ||
              (!isDirectivos && !!currentNivel && especialidadesDisponibles.length === 0)
            }
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {!currentModalidad ? (
              <option value="" disabled hidden className="text-gray-400">
                🔒 Primero selecciona modalidad
              </option>
            ) : !isDirectivos && !currentNivel ? (
              <option value="" disabled hidden className="text-gray-400">
                🔒 Primero selecciona nivel
              </option>
            ) : filters.modalidad === 'EBE' || (!isDirectivos && currentNivel && especialidadesDisponibles.length === 0) ? (
              <option value="—">No requiere especialidad (General)</option>
            ) : (
              <>
                <option value="" disabled hidden className="text-gray-400">
                  {isDirectivos ? 'Selecciona tu cargo' : 'Selecciona una especialidad'}
                </option>
                {especialidadesDisponibles.map((opt) => {
                  const itemVal = typeof opt === 'string' ? opt : (opt as any).label || (opt as any).value;
                  return (
                    <option key={itemVal} value={itemVal}>
                      {itemVal}
                    </option>
                  );
                })}
              </>
            )}
          </select>
        </div>

        {/* Paso 4: Año de Evaluación */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            Año
          </label>
          <select
            value={filters.anio && filters.anio !== 'TODOS' ? String(filters.anio) : ''}
            onChange={(e) => handleAnioChange(e.target.value)}
            disabled={!isEspecialidadComplete}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {!currentModalidad ? (
              <option value="" disabled hidden className="text-gray-400">
                🔒 Primero selecciona modalidad
              </option>
            ) : !isDirectivos && !currentNivel ? (
              <option value="" disabled hidden className="text-gray-400">
                🔒 Primero selecciona nivel
              </option>
            ) : !isEspecialidadComplete ? (
              <option value="" disabled hidden className="text-gray-400">
                🔒 Primero selecciona área o especialidad
              </option>
            ) : (
              <>
                <option value="" disabled hidden className="text-gray-400">
                  Selecciona el año
                </option>
                {ANIOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Banner Informativo Dinámico de Selección Activa */}
      <div className={`mt-3 p-3 rounded-xl ${theme.infoBg} border ${theme.infoBorder} flex items-center space-x-2.5 text-xs ${theme.infoText} transition-colors duration-300`}>
        <div className={`w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0`}>
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="leading-tight text-[11px] sm:text-xs">
          <span>Seleccionaste </span>
          <span className="font-bold">
            {procesoNombre} - {currentModalidad}
            {!isDirectivos && nivelTextoLabel ? ` - ${nivelTextoLabel}` : ''}
            {currentEspecialidad && currentEspecialidad !== '—' ? ` - ${currentEspecialidad}` : ''}
          </span>
          <span>. Revisa los cuadernillos disponibles.</span>
        </div>
      </div>

      {/* Bloque de Filtrado Condicional Reutilizado (Nombramiento -> Niveles Generales o Especiales) */}
      {showSubpruebasFilter && (
        <div className="mt-3 p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 space-y-2.5 animate-in fade-in duration-300 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-xs font-black uppercase text-purple-900 dark:text-purple-300 tracking-wider">
              Filtro Específico de Subpruebas ({procesoNombre} {nivelTextoLabel || currentModalidad})
            </span>
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400">
            Selecciona la categoría evaluativa para segmentar los cuadernillos disponibles:
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSubcategoriaChange?.('HABILIDADES_GENERALES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
                activeSubcategoria === 'HABILIDADES_GENERALES'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/40'
              }`}
            >
              <span className="text-sm">🧠</span>
              <span>Habilidades Generales</span>
            </button>
            <button
              type="button"
              onClick={() => onSubcategoriaChange?.('CONOCIMIENTOS_CURRICULARES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
                activeSubcategoria === 'CONOCIMIENTOS_CURRICULARES' || activeSubcategoria === 'TODOS'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/40'
              }`}
            >
              <span className="text-sm">📚</span>
              <span>Conocimiento Curriculares y Pedagógicos</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
