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
}

const MODALIDADES: { value: ModalidadEducativa; label: string }[] = [
  { value: 'EBR', label: 'EBR' },
  { value: 'EBA', label: 'EBA' },
  { value: 'EBE', label: 'EBE' },
  { value: 'CETPRO', label: 'CETPRO' },
];

const NIVELES_MAESTROS = [
  { value: 'INICIAL', label: 'Inicial' },
  { value: 'PRIMARIA', label: 'Primaria' },
  { value: 'SECUNDARIA', label: 'Secundaria' },
  { value: 'EBA_INICIAL_INTERMEDIO', label: 'Ciclo Inicial e Intermedio (EBA)' },
  { value: 'EBA_AVANZADO', label: 'Ciclo Avanzado (EBA)' },
  { value: 'CETPRO_TECNICO', label: 'Ciclo Técnico Productivo (CETPRO)' },
];

const NIVELES_POR_MODALIDAD: Record<ModalidadEducativa, string[]> = {
  EBR: ['INICIAL', 'PRIMARIA', 'SECUNDARIA'],
  EBA: ['EBA_INICIAL_INTERMEDIO', 'EBA_AVANZADO'],
  EBE: ['INICIAL', 'PRIMARIA'],
  CETPRO: ['CETPRO_TECNICO'],
};

const ESPECIALIDADES_MAESTRAS = [
  { value: 'INICIAL_GENERAL', label: 'Educación Inicial' },
  { value: 'PRIMARIA_GENERAL', label: 'Educación Primaria' },
  { value: 'INNOVACION_PEDAGOGICA', label: 'AIP / Aula de Innovación Pedagógica' },
  { value: 'EBE_GENERAL', label: 'Educación Básica Especial' },
  { value: 'MATEMATICA', label: 'Matemática' },
  { value: 'COMUNICACION', label: 'Comunicación' },
  { value: 'INGLES', label: 'Inglés (Idioma Extranjero)' },
  { value: 'CIENCIA_Y_TECNOLOGIA', label: 'Ciencia y Tecnología' },
  { value: 'CIENCIAS_SOCIALES', label: 'Ciencias Sociales' },
  { value: 'DESARROLLO_PERSONAL_CIUDADANO', label: 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)' },
  { value: 'EDUCACION_FISICA', label: 'Educación Física' },
  { value: 'EDUCACION_POR_EL_TRABAJO', label: 'Educación para el Trabajo (EPT)' },
  { value: 'ARTE_Y_CULTURA', label: 'Arte y Cultura' },
  { value: 'EDUCACION_RELIGIOSA', label: 'Educación Religiosa' },
  { value: 'EBA_CIENCIA_AMBIENTE_SALUD', label: 'Ciencia, Ambiente y Salud' },
  { value: 'EBA_PARA_EL_TRABAJO', label: 'Para el Trabajo' },
  { value: 'EBA_DESARROLLO_PERSONAL', label: 'Desarrollo Personal y Ciudadano' },
  { value: 'CETPRO_FORMACION_LABORAL', label: 'Técnico Productivo / Formación Laboral' },

  // LISTA OFICIAL COMPLETA DE CARGOS DIRECTIVOS Y ESPECIALISTAS MINEDU
  { value: 'ACCESO_DIRECTIVOS', label: 'Acceso a cargos directivos' },
  { value: 'DIRECTOR_IE', label: 'Director de Institución Educativa' },
  { value: 'SUBDIRECTOR_IE', label: 'Subdirector de Institución Educativa' },
  { value: 'ESPECIALISTA_UGEL', label: 'Especialista en Educación de UGEL' },
  { value: 'ESPECIALISTA_DRE', label: 'Especialista en Educación de DRE' },
  { value: 'DGP_DRE', label: 'Director de Gestión Pedagógica (DGP) de DRE' },
  { value: 'JAGP_UGEL', label: 'Jefe de Gestión Pedagógica (JAGP) de UGEL' },
  { value: 'DIRECTOR_UGEL', label: 'Director de UGEL' },
];

const ESPECIALIDADES_DIRECTIVOS_LIST = [
  { value: 'ACCESO_DIRECTIVOS', label: 'Acceso a cargos directivos' },
  { value: 'DIRECTOR_IE', label: 'Director de Institución Educativa' },
  { value: 'SUBDIRECTOR_IE', label: 'Subdirector de Institución Educativa' },
  { value: 'ESPECIALISTA_UGEL', label: 'Especialista en Educación de UGEL' },
  { value: 'ESPECIALISTA_DRE', label: 'Especialista en Educación de DRE' },
  { value: 'DGP_DRE', label: 'Director de Gestión Pedagógica (DGP) de DRE' },
  { value: 'JAGP_UGEL', label: 'Jefe de Gestión Pedagógica (JAGP) de UGEL' },
  { value: 'DIRECTOR_UGEL', label: 'Director de UGEL' },
];

const ESPECIALIDADES_POR_NIVEL: Record<string, string[]> = {
  INICIAL: ['INICIAL_GENERAL'],
  PRIMARIA: ['PRIMARIA_GENERAL', 'EDUCACION_FISICA', 'INNOVACION_PEDAGOGICA'],
  SECUNDARIA: [
    'MATEMATICA',
    'COMUNICACION',
    'INGLES',
    'CIENCIA_Y_TECNOLOGIA',
    'CIENCIAS_SOCIALES',
    'DESARROLLO_PERSONAL_CIUDADANO',
    'EDUCACION_FISICA',
    'EDUCACION_POR_EL_TRABAJO',
    'ARTE_Y_CULTURA',
    'EDUCACION_RELIGIOSA',
    'INNOVACION_PEDAGOGICA',
  ],
  EBA_INICIAL_INTERMEDIO: ['PRIMARIA_GENERAL', 'COMUNICACION', 'MATEMATICA'],
  EBA_AVANZADO: [
    'COMUNICACION',
    'MATEMATICA',
    'EBA_CIENCIA_AMBIENTE_SALUD',
    'EBA_PARA_EL_TRABAJO',
    'EBA_DESARROLLO_PERSONAL',
    'INGLES',
  ],
  CETPRO_TECNICO: ['CETPRO_FORMACION_LABORAL', 'EDUCACION_POR_EL_TRABAJO'],
};

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
    numBg: 'bg-[#B45309]',
    infoBg: 'bg-[#FFF8F0] dark:bg-amber-950/30',
    infoBorder: 'border-[#B45309]/30',
    infoText: 'text-[#B45309] dark:text-amber-200',
    iconColor: 'text-[#B45309]',
  },
  ASCENSO_ESCALAFON: {
    numBg: 'bg-[#5B46F6]',
    infoBg: 'bg-[#F3F0FF] dark:bg-indigo-950/30',
    infoBorder: 'border-[#5B46F6]/30',
    infoText: 'text-[#5B46F6] dark:text-indigo-200',
    iconColor: 'text-[#5B46F6]',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    numBg: 'bg-[#0D9488]',
    infoBg: 'bg-[#F0FAF8] dark:bg-teal-950/30',
    infoBorder: 'border-[#0D9488]/30',
    infoText: 'text-[#0D9488] dark:text-teal-200',
    iconColor: 'text-[#0D9488]',
  },
  INGRESO_CPM: {
    numBg: 'bg-[#B45309]',
    infoBg: 'bg-[#FFF8F0]',
    infoBorder: 'border-[#B45309]/30',
    infoText: 'text-[#B45309]',
    iconColor: 'text-[#B45309]',
  },
  REASIGNACION_DOCENTE: {
    numBg: 'bg-[#B45309]',
    infoBg: 'bg-[#FFF8F0]',
    infoBorder: 'border-[#B45309]/30',
    infoText: 'text-[#B45309]',
    iconColor: 'text-[#B45309]',
  },
};

export const CascadingFilters: React.FC<CascadingFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  resultsCount,
  activeProceso = 'NOMBRAMIENTO_DOCENTE',
}) => {
  const isDirectivos = activeProceso === 'ACCESO_CARGOS_DIRECTIVOS';

  const currentModalidad: ModalidadEducativa = 
    filters.modalidad && filters.modalidad !== 'TODOS' ? (filters.modalidad as ModalidadEducativa) : 'EBR';

  const nivelesDisponibles = useMemo(() => {
    if (isDirectivos) return [];
    const permitidos = NIVELES_POR_MODALIDAD[currentModalidad] || NIVELES_POR_MODALIDAD.EBR;
    return NIVELES_MAESTROS.filter((n) => permitidos.includes(n.value));
  }, [currentModalidad, isDirectivos]);

  const currentNivel = useMemo(() => {
    if (isDirectivos) return 'NO_APLICA';
    if (filters.nivel && filters.nivel !== 'TODOS' && nivelesDisponibles.some(n => n.value === filters.nivel)) {
      return filters.nivel;
    }
    return nivelesDisponibles[0]?.value || 'INICIAL';
  }, [filters.nivel, nivelesDisponibles, isDirectivos]);

  const especialidadesDisponibles = useMemo(() => {
    if (isDirectivos) return ESPECIALIDADES_DIRECTIVOS_LIST;
    const permitidos = ESPECIALIDADES_POR_NIVEL[currentNivel] || ESPECIALIDADES_POR_NIVEL.INICIAL;
    return ESPECIALIDADES_MAESTRAS.filter((e) => permitidos.includes(e.value));
  }, [currentNivel, isDirectivos]);

  const currentEspecialidad = useMemo(() => {
    if (isDirectivos) {
      if (filters.especialidad && filters.especialidad !== 'TODOS' && especialidadesDisponibles.some(e => e.value === filters.especialidad || e.label === filters.especialidad)) {
        return filters.especialidad;
      }
      return 'ACCESO_DIRECTIVOS';
    }
    if (filters.especialidad && filters.especialidad !== 'TODOS' && especialidadesDisponibles.some(e => e.value === filters.especialidad)) {
      return filters.especialidad;
    }
    return especialidadesDisponibles[0]?.value || 'INICIAL_GENERAL';
  }, [filters.especialidad, especialidadesDisponibles, isDirectivos]);

  const currentAnio = filters.anio && filters.anio !== 'TODOS' ? Number(filters.anio) : 2024;

  const theme = PROCESO_THEMES[activeProceso] || PROCESO_THEMES.NOMBRAMIENTO_DOCENTE;

  const handleModalidadChange = (nuevaModalidadStr: string) => {
    const nuevaModalidad = nuevaModalidadStr as ModalidadEducativa;
    if (isDirectivos) {
      onFilterChange({
        ...filters,
        modalidad: nuevaModalidad,
        nivel: 'NO_APLICA' as NivelEducativo,
        especialidad: currentEspecialidad,
        anio: currentAnio,
      });
      return;
    }
    const niveles = NIVELES_POR_MODALIDAD[nuevaModalidad] || NIVELES_POR_MODALIDAD.EBR;
    const primerNivel = niveles[0] || 'INICIAL';
    const especialidades = ESPECIALIDADES_POR_NIVEL[primerNivel] || ESPECIALIDADES_POR_NIVEL.INICIAL;
    const primeraEspecialidad = especialidades[0] || 'INICIAL_GENERAL';

    onFilterChange({
      ...filters,
      modalidad: nuevaModalidad,
      nivel: primerNivel as NivelEducativo,
      especialidad: primeraEspecialidad,
      anio: currentAnio,
    });
  };

  const handleNivelChange = (nuevoNivel: string) => {
    const especialidades = ESPECIALIDADES_POR_NIVEL[nuevoNivel] || ESPECIALIDADES_POR_NIVEL.INICIAL;
    const primeraEspecialidad = especialidades[0] || 'INICIAL_GENERAL';

    onFilterChange({
      ...filters,
      modalidad: currentModalidad,
      nivel: nuevoNivel as NivelEducativo,
      especialidad: primeraEspecialidad,
      anio: currentAnio,
    });
  };

  const handleEspecialidadChange = (nuevaEspecialidad: string) => {
    onFilterChange({
      ...filters,
      modalidad: currentModalidad,
      nivel: currentNivel as NivelEducativo,
      especialidad: nuevaEspecialidad,
      anio: currentAnio,
    });
  };

  const handleAnioChange = (nuevoAnioStr: string) => {
    onFilterChange({
      ...filters,
      modalidad: currentModalidad,
      nivel: currentNivel as NivelEducativo,
      especialidad: currentEspecialidad,
      anio: Number(nuevoAnioStr),
    });
  };

  const procesoNombre = activeProceso === 'ASCENSO_ESCALAFON'
    ? 'Ascenso'
    : activeProceso === 'ACCESO_CARGOS_DIRECTIVOS'
    ? 'Directivos'
    : 'Nombramiento';

  const nivelTextoLabel = NIVELES_MAESTROS.find((n) => n.value === currentNivel)?.label;

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
              Las opciones cambian según cada selección.
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
        {/* Cuadro 1: Modalidad */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            Modalidad
          </label>
          <select
            value={currentModalidad}
            onChange={(e) => handleModalidadChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
          >
            {MODALIDADES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cuadro 2: Nivel Educativo */}
        {!isDirectivos && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
              Nivel
            </label>
            <select
              value={currentNivel}
              onChange={(e) => handleNivelChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
            >
              {nivelesDisponibles.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cuadro 3: Cargo o Especialidad */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            {isDirectivos ? 'Cargo a Postular (MINEDU)' : 'Área o especialidad'}
          </label>
          <select
            value={currentEspecialidad}
            onChange={(e) => handleEspecialidadChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
          >
            {especialidadesDisponibles.map((opt) => (
              <option key={opt.value} value={opt.label || opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cuadro 4: Año de Evaluación */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">
            Año
          </label>
          <select
            value={String(currentAnio)}
            onChange={(e) => handleAnioChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
          >
            {ANIOS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
          </span>
          <span>. Revisa los cuadernillos disponibles.</span>
        </div>
      </div>
    </section>
  );
};
