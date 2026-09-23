// src/data/cascadingData.ts
// AVEND ESCALA - Estructura Jerárquica Oficial de Filtros en Cascada (Minedu Perú)

export type ModalidadKey = 'EBR' | 'EBA' | 'EBE' | 'CETPRO';

export interface NivelOption {
  value: string;
  label: string;
}

export const MODALIDADES_LIST: { value: ModalidadKey; label: string }[] = [
  { value: 'EBR', label: 'EBR' },
  { value: 'EBA', label: 'EBA' },
  { value: 'EBE', label: 'EBE' },
  { value: 'CETPRO', label: 'CETPRO' },
];

export const NIVELES_POR_MODALIDAD: Record<ModalidadKey, NivelOption[]> = {
  EBR: [
    { value: 'INICIAL', label: 'Inicial' },
    { value: 'PRIMARIA', label: 'Primaria' },
    { value: 'SECUNDARIA', label: 'Secundaria' },
  ],
  EBA: [
    { value: 'EBA_INICIAL_INTERMEDIO', label: 'Inicial - Intermedio' },
    { value: 'EBA_AVANZADO', label: 'Avanzado' },
  ],
  EBE: [
    { value: 'NO_APLICA', label: 'EBE' },
  ],
  CETPRO: [
    { value: 'CETPRO_TECNICO', label: 'ETP - Ciclo Técnico y Ciclo Auxiliar Técnico' },
  ],
};

export const AREAS_POR_MODALIDAD_NIVEL: Record<ModalidadKey, Record<string, string[]>> = {
  EBR: {
    INICIAL: [],
    PRIMARIA: [
      'Educación Física',
      'Primaria',
      'Profesor de Innovación Pedagógica',
    ],
    SECUNDARIA: [
      'Comunicación',
      'Matemática',
      'Ciencia y Tecnología',
      'Ciencias Sociales',
      'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
      'Inglés (Idioma Extranjero)',
      'Educación Física',
      'Educación para el Trabajo (EPT)',
      'Arte y Cultura',
      'Educación Religiosa',
      'Profesor de Innovación Pedagógica',
    ],
  },
  EBA: {
    EBA_INICIAL_INTERMEDIO: [
      'Inicial - Intermedio',
    ],
    INICIAL_INTERMEDIO: [
      'Inicial - Intermedio',
    ],
    EBA_AVANZADO: [
      'Arte y Cultura',
      'Ciencia, Tecnología y Salud',
      'Ciencias Sociales',
      'Comunicación',
      'Desarrollo Personal y Ciudadano',
      'Educación Física',
      'Educación para el Trabajo (EPT)',
      'Educación Religiosa',
      'Inglés',
      'Matemática',
    ],
    AVANZADO: [
      'Arte y Cultura',
      'Ciencia, Tecnología y Salud',
      'Ciencias Sociales',
      'Comunicación',
      'Desarrollo Personal y Ciudadano',
      'Educación Física',
      'Educación para el Trabajo (EPT)',
      'Educación Religiosa',
      'Inglés',
      'Matemática',
    ],
  },
  EBE: {
    NO_APLICA: [],
  },
  CETPRO: {
    CETPRO_TECNICO: [],
  },
};

export const TIPOS_CUADERNILLO_NOMBRAMIENTO = [
  'Habilidades Generales',
  'Conocimiento Curriculares y Pedagógicos',
];

// Especialidades Oficiales para Acceso a Cargos Directivos (No Aplica Nivel/Modalidad)
export const ESPECIALIDADES_DIRECTIVOS_LIST = [
  'Acceso a cargos directivos',
  'Director de Institución Educativa',
  'Subdirector de Institución Educativa',
  'Especialista en Educación de UGEL',
  'Especialista en Educación de DRE',
  'Director de Gestión Pedagógica (DGP) de DRE',
  'Jefe de Gestión Pedagógica (JAGP) de UGEL',
  'Director de UGEL',
];

/**
 * Función Helper para obtener las Áreas/Especialidades según Modalidad y Nivel
 */
export function getAreasDisponibles(modalidad?: string, nivel?: string): string[] {
  if (!modalidad || !nivel) return [];
  const modKey = modalidad as ModalidadKey;
  if (!AREAS_POR_MODALIDAD_NIVEL[modKey]) return [];
  return AREAS_POR_MODALIDAD_NIVEL[modKey][nivel] || [];
}

/**
 * Formatea un acceso completo para mostrar en badges y tablas de control SaaS
 * Ejemplo: "EBA - Avanzado - Comunicación" o "EBR - Inicial" (evitando guiones '—' sueltos)
 */
export function formatAccessBadge(modalidad: string, nivelValue: string, areaName?: string): string {
  if (modalidad === 'EBE' || nivelValue === 'NO_APLICA') {
    return 'EBE';
  }

  const modKey = modalidad as ModalidadKey;
  const list = NIVELES_POR_MODALIDAD[modKey] || [];
  const nivelObj = list.find((n) => n.value === nivelValue);
  const nivelLabel = nivelObj ? nivelObj.label : nivelValue;

  if (!areaName || areaName === '—' || areaName.trim() === '' || areaName.toLowerCase() === 'general' || areaName.toLowerCase() === 'inicial') {
    if (nivelValue === 'INICIAL' || nivelLabel.toUpperCase() === 'INICIAL') {
      return `${modalidad} - Inicial`;
    }
    return `${modalidad} - ${nivelLabel}`;
  }

  if (areaName.startsWith(modalidad) || areaName.includes(' - ')) {
    return areaName;
  }

  return `${modalidad} - ${nivelLabel} - ${areaName}`;
}

export interface CategoriaNombramiento {
  id: string;
  modalidad: ModalidadKey;
  nivel: string;
  area: string;
  label: string;
  grupo: 'EBR Inicial' | 'EBR Primaria' | 'EBR Secundaria' | 'EBA' | 'EBE' | 'CETPRO';
}

export const CATEGORIAS_NOMBRAMIENTO_DOCENTE: CategoriaNombramiento[] = [
  // EBR Inicial
  { id: 'EBR-INICIAL-General', modalidad: 'EBR', nivel: 'INICIAL', area: 'Inicial', label: 'EBR Inicial', grupo: 'EBR Inicial' },

  // EBR Primaria
  { id: 'EBR-PRIMARIA-Primaria', modalidad: 'EBR', nivel: 'PRIMARIA', area: 'Primaria', label: 'EBR Primaria General', grupo: 'EBR Primaria' },
  { id: 'EBR-PRIMARIA-EdFisica', modalidad: 'EBR', nivel: 'PRIMARIA', area: 'Educación Física', label: 'EBR Primaria - Educación Física', grupo: 'EBR Primaria' },
  { id: 'EBR-PRIMARIA-AIP', modalidad: 'EBR', nivel: 'PRIMARIA', area: 'Profesor de Innovación Pedagógica', label: 'EBR Primaria - Innovación Pedagógica', grupo: 'EBR Primaria' },

  // EBR Secundaria
  { id: 'EBR-SEC-Comunicacion', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Comunicación', label: 'EBR Secundaria - Comunicación', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-Matematica', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Matemática', label: 'EBR Secundaria - Matemática', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-CienciaTec', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Ciencia y Tecnología', label: 'EBR Secundaria - Ciencia y Tecnología', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-CienciasSoc', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Ciencias Sociales', label: 'EBR Secundaria - Ciencias Sociales', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-DPCC', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)', label: 'EBR Secundaria - DPCC', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-Ingles', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Inglés (Idioma Extranjero)', label: 'EBR Secundaria - Inglés', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-EdFisica', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Educación Física', label: 'EBR Secundaria - Educación Física', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-EPT', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Educación para el Trabajo (EPT)', label: 'EBR Secundaria - EPT', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-Arte', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Arte y Cultura', label: 'EBR Secundaria - Arte y Cultura', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-Religion', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Educación Religiosa', label: 'EBR Secundaria - Educación Religiosa', grupo: 'EBR Secundaria' },
  { id: 'EBR-SEC-AIP', modalidad: 'EBR', nivel: 'SECUNDARIA', area: 'Profesor de Innovación Pedagógica', label: 'EBR Secundaria - Innovación Pedagógica', grupo: 'EBR Secundaria' },

  // EBA
  { id: 'EBA-INI-Intermedio', modalidad: 'EBA', nivel: 'EBA_INICIAL_INTERMEDIO', area: 'Inicial - Intermedio', label: 'EBA Inicial - Intermedio', grupo: 'EBA' },
  { id: 'EBA-AV-Com', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Comunicación', label: 'EBA Avanzado - Comunicación', grupo: 'EBA' },
  { id: 'EBA-AV-Mat', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Matemática', label: 'EBA Avanzado - Matemática', grupo: 'EBA' },
  { id: 'EBA-AV-CTS', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Ciencia, Tecnología y Salud', label: 'EBA Avanzado - Ciencia, Tecnología y Salud', grupo: 'EBA' },
  { id: 'EBA-AV-CCSS', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Ciencias Sociales', label: 'EBA Avanzado - Ciencias Sociales', grupo: 'EBA' },
  { id: 'EBA-AV-DPC', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Desarrollo Personal y Ciudadano', label: 'EBA Avanzado - Desarrollo Personal y Ciudadano', grupo: 'EBA' },
  { id: 'EBA-AV-Arte', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Arte y Cultura', label: 'EBA Avanzado - Arte y Cultura', grupo: 'EBA' },
  { id: 'EBA-AV-EdFis', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Educación Física', label: 'EBA Avanzado - Educación Física', grupo: 'EBA' },
  { id: 'EBA-AV-EPT', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Educación para el Trabajo (EPT)', label: 'EBA Avanzado - EPT', grupo: 'EBA' },
  { id: 'EBA-AV-Rel', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Educación Religiosa', label: 'EBA Avanzado - Educación Religiosa', grupo: 'EBA' },
  { id: 'EBA-AV-Ing', modalidad: 'EBA', nivel: 'EBA_AVANZADO', area: 'Inglés', label: 'EBA Avanzado - Inglés', grupo: 'EBA' },

  // EBE
  { id: 'EBE-General', modalidad: 'EBE', nivel: 'NO_APLICA', area: 'Educación Básica Especial', label: 'Educación Básica Especial (EBE)', grupo: 'EBE' },

  // CETPRO
  { id: 'CETPRO-Tecnico', modalidad: 'CETPRO', nivel: 'CETPRO_TECNICO', area: 'ETP - Ciclo Técnico y Auxiliar Técnico', label: 'CETPRO / Técnico Productivo', grupo: 'CETPRO' },
];
