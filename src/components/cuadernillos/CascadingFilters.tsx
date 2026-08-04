// src/components/cuadernillos/CascadingFilters.tsx
'use client';

import React from 'react';
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
}

const MODALIDADES: { value: ModalidadEducativa | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todas las modalidades' },
  { value: 'EBR', label: 'EBR (Básica Regular)' },
  { value: 'EBA', label: 'EBA (Básica Alternativa)' },
  { value: 'EBE', label: 'EBE (Básica Especial)' },
];

const NIVELES: { value: NivelEducativo | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los niveles' },
  { value: 'INICIAL', label: 'Inicial' },
  { value: 'PRIMARIA', label: 'Primaria' },
  { value: 'SECUNDARIA', label: 'Secundaria' },
  { value: 'SUPERIOR_TECNICO', label: 'Superior / Directivos' },
];

const ESPECIALIDADES = [
  { value: 'TODOS', label: 'Todas las áreas/especialidades' },
  { value: 'MATEMATICA', label: 'Matemática' },
  { value: 'COMUNICACION', label: 'Comunicación' },
  { value: 'CIENCIA_Y_TECNOLOGIA', label: 'Ciencia y Tecnología' },
  { value: 'CIENCIAS_SOCIALES', label: 'Ciencias Sociales' },
  { value: 'DESARROLLO_PERSONAL_CIUDADANO', label: 'Desarrollo Personal / Directivos' },
  { value: 'PRIMARIA_GENERAL', label: 'Primaria General' },
  { value: 'INICIAL_GENERAL', label: 'Inicial General' },
];

const ANIOS = [
  { value: 'TODOS', label: 'Todos los años' },
  { value: '2024', label: 'Año 2024' },
  { value: '2022', label: 'Año 2022' },
  { value: '2018', label: 'Año 2018' },
  { value: '2014', label: 'Año 2014' },
];

const PROCESO_LABELS: Record<ProcesoMinedu, string> = {
  NOMBRAMIENTO_DOCENTE: 'Nombramiento Docente',
  ASCENSO_ESCALAFON: 'Ascenso de Escala',
  ACCESO_CARGOS_DIRECTIVOS: 'Acceso a Cargos Directivos',
  INGRESO_CPM: 'Ingreso a la CPM',
  REASIGNACION_DOCENTE: 'Reasignación Docente',
};

export const CascadingFilters: React.FC<CascadingFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const procesoActual = filters.proceso && filters.proceso !== 'TODOS'
    ? PROCESO_LABELS[filters.proceso]
    : 'Nombramiento Docente';

  const modalidadActual = filters.modalidad && filters.modalidad !== 'TODOS'
    ? filters.modalidad
    : 'EBR';

  const handleSelectChange = (key: keyof EvaluacionesFilterParams, value: string) => {
    const parsedValue = value === 'TODOS' ? 'TODOS' : value;
    onFilterChange({
      ...filters,
      [key]: parsedValue,
    });
  };

  return (
    <section className="w-full space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Encabezado del Paso 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm">
            2
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Completa los datos de búsqueda
          </h2>
        </div>

        {/* Botón de Limpiar Filtros */}
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Restablecer filtros</span>
        </button>
      </div>

      {/* Grid de Desplegables / Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* Dropdown 1: Modalidad */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Modalidad
          </label>
          <select
            value={filters.modalidad || 'TODOS'}
            onChange={(e) => handleSelectChange('modalidad', e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            {MODALIDADES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Nivel */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Nivel Educativo
          </label>
          <select
            value={filters.nivel || 'TODOS'}
            onChange={(e) => handleSelectChange('nivel', e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            {NIVELES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 3: Especialidad / Área */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Área / Especialidad
          </label>
          <select
            value={filters.especialidad || 'TODOS'}
            onChange={(e) => handleSelectChange('especialidad', e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            {ESPECIALIDADES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 4: Año */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Año de Evaluación
          </label>
          <select
            value={filters.anio ? String(filters.anio) : 'TODOS'}
            onChange={(e) => handleSelectChange('anio', e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            {ANIOS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Banner Informativo de Selección */}
      <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/50 flex items-start space-x-3 text-xs text-blue-900 dark:text-blue-200">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <span className="font-bold">Selección activa:</span> Has seleccionado{' '}
          <span className="font-semibold underline decoration-blue-400">{procesoActual}</span> · Modalidad{' '}
          <span className="font-semibold">{modalidadActual}</span>. Los cuadernillos y resoluciones a continuación corresponden a esta búsqueda.
        </div>
      </div>
    </section>
  );
};
