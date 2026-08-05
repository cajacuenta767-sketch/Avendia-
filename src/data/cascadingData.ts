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
    { value: 'INICIAL', label: 'Inicial' },
    { value: 'PRIMARIA', label: 'Primaria' },
  ],
  CETPRO: [
    { value: 'CETPRO_TECNICO', label: 'ETP - Ciclo Técnico y Ciclo Auxiliar Técnico' },
  ],
};

export const AREAS_POR_MODALIDAD_NIVEL: Record<ModalidadKey, Record<string, string[]>> = {
  EBR: {
    INICIAL: [], // Bloqueado / No disponible (—)
    PRIMARIA: [
      'Primaria',
      'Educación Física',
      'Innovación Pedagógica',
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
      'AIP / Aula de Innovación Pedagógica',
    ],
  },
  EBA: {
    EBA_INICIAL_INTERMEDIO: [], // Bloqueado / No disponible (—)
    EBA_AVANZADO: [
      'Comunicación',
      'Matemática',
      'Ciencia, Tecnología y Salud',
      'Ciencias Sociales',
      'Educación para el Trabajo',
      'Inglés',
      'Educación Religiosa',
    ],
  },
  EBE: {
    INICIAL: [], // Bloqueado / No disponible (—)
    PRIMARIA: [], // Bloqueado / No disponible (—)
  },
  CETPRO: {
    CETPRO_TECNICO: [], // Bloqueado / No disponible (—)
  },
};

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
