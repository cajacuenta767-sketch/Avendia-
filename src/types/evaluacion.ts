// src/types/evaluacion.ts
// AVEND ESCALA - Definición estricta de tipos de dominio para Evaluaciones MINEDU

export type ProcesoMinedu = 
  | 'NOMBRAMIENTO_DOCENTE'
  | 'ASCENSO_ESCALAFON'
  | 'ACCESO_CARGOS_DIRECTIVOS'
  | 'INGRESO_CPM'
  | 'REASIGNACION_DOCENTE';

export type ModalidadEducativa = 'EBR' | 'EBA' | 'EBE';

export type NivelEducativo = 
  | 'INICIAL'
  | 'PRIMARIA'
  | 'SECUNDARIA'
  | 'SUPERIOR_TECNICO'
  | 'NO_APLICA';

export type EspecialidadMinedu = 
  | 'MATEMATICA'
  | 'COMUNICACION'
  | 'CIENCIA_Y_TECNOLOGIA'
  | 'CIENCIAS_SOCIALES'
  | 'DESARROLLO_PERSONAL_CIUDADANO'
  | 'EDUCACION_FISICA'
  | 'EDUCACION_POR_EL_TRABAJO'
  | 'INGLES'
  | 'ARTE_Y_CULTURA'
  | 'EDUCACION_RELIGIOSA'
  | 'PRIMARIA_GENERAL'
  | 'INICIAL_GENERAL';

export interface ResourceLinks {
  cuadernilloKey: string;      // Clave de R2 para el PDF del Cuadernillo principal
  resolucionKey?: string;      // Clave de R2 para la Resolución explicada (opcional)
  clavesKey?: string;          // Clave de R2 para la tabla de Claves oficiales (opcional)
}

export interface Evaluacion {
  id: string;
  mineduCode: string;          // Código oficial ej. "MINEDU-2024-SEC-MAT"
  titulo: string;              // Título descriptivo ej. "Prueba Única Nacional Nombramiento Docente 2024"
  proceso: ProcesoMinedu;
  modalidad: ModalidadEducativa;
  nivel: NivelEducativo;
  especialidad: EspecialidadMinedu | string;
  especialidadLabel: string;   // Nombre amigable ej. "Secundaria - Matemática"
  anio: number;
  isLatest?: boolean;          // Badge "Más Reciente"
  resources: ResourceLinks;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluacionesFilterParams {
  proceso?: ProcesoMinedu | 'TODOS';
  modalidad?: ModalidadEducativa | 'TODOS';
  nivel?: NivelEducativo | 'TODOS';
  especialidad?: string | 'TODOS';
  anio?: number | 'TODOS';
  searchQuery?: string;
}

export interface ProcessOption {
  id: ProcesoMinedu;
  label: string;
  description: string;
  badgeCount?: number;
}
