// src/types/evaluacion.ts
// AVEND ESCALA - Definición estricta de tipos de dominio para Evaluaciones MINEDU

export type ProcesoMinedu = 
  | 'NOMBRAMIENTO_DOCENTE'
  | 'ASCENSO_ESCALAFON'
  | 'ACCESO_CARGOS_DIRECTIVOS'
  | 'INGRESO_CPM'
  | 'REASIGNACION_DOCENTE';

export type ModalidadEducativa = 'EBR' | 'EBA' | 'EBE' | 'CETPRO';

export type NivelEducativo = 
  | 'INICIAL'
  | 'PRIMARIA'
  | 'SECUNDARIA'
  | 'SUPERIOR_TECNICO'
  | 'EBA_INICIAL_INTERMEDIO'
  | 'EBA_AVANZADO'
  | 'CETPRO_TECNICO'
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

export const AREAS_EBA_AVANZADO = [
  'Comunicación',
  'Matemática',
  'Ciencia, Tecnología y Salud',
  'Ciencias Sociales',
  'Desarrollo Personal y Ciudadano',
  'Educación para el Trabajo (EPT)',
  'Inglés',
  'Educación Física',
  'Educación Religiosa',
  'Arte y Cultura',
];

export interface ResourceLinks {
  cuadernilloKey?: string;     // Ruta o clave del PDF del Cuadernillo principal (opcional si aún no está subido)
  resolucionKey?: string;      // Clave de R2 para la Resolución explicada (opcional)
  clavesKey?: string;          // Clave de R2 para la tabla de Claves oficiales (opcional)
  origenCuadernillo?: 'MINEDU' | 'AVEND' | string;
  origenResolucion?: 'AVEND' | 'MINEDU' | string;
  origenClaves?: 'MINEDU' | 'AVEND' | string;
  codigoCuadernillo?: string;
  codigoResolucion?: string;
  codigoClaves?: string;
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
  tipoCuadernillo?: string;
  codigo?: string;             // Código específico de cuadernillo ingresado por Admin
  codigoCuadernillo?: string;
  codigoResolucion?: string;
  codigoClaves?: string;
  estado?: 'PUBLICADO' | 'BORRADOR' | string;
  anio: number;
  isLatest?: boolean;          // Badge "Más Reciente"
  resources: ResourceLinks;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluacionesFilterParams {
  proceso?: ProcesoMinedu | 'TODOS' | '';
  modalidad?: ModalidadEducativa | 'TODOS' | '';
  nivel?: NivelEducativo | 'TODOS' | '';
  especialidad?: string | 'TODOS' | '';
  anio?: number | 'TODOS' | '';
  searchQuery?: string;
  includeDrafts?: boolean;
}

export interface ProcessOption {
  id: ProcesoMinedu;
  label: string;
  description: string;
  badgeCount?: number;
}

export interface EvaluacionMasivaInput {
  proceso: string;
  tipoCuadernillo: string;
  anio: string;
  urlCuadernillo?: string;
  urlResolucion?: string;
  urlClaves?: string;
  origenCuadernillo?: string;
  origenResolucion?: string;
  origenClaves?: string;
  codigoCuadernillo?: string;
  codigoResolucion?: string;
  codigoClaves?: string;
  estado?: string;
  esPremium?: boolean;
  categorias: Array<{
    modalidad: string;
    nivel: string;
    area: string;
  }>;
}

// Función estricta para generar la firma de comparación (Cero Falsos Positivos)
export function getEvaluacionSignature(item: {
  proceso: string;
  modalidad: string;
  nivel?: string | null;
  area: string;
  anio: string | number;
  tipoCuadernillo?: string | null;
}): string {
  const proc = String(item.proceso || '').trim().toLowerCase();
  const mod = String(item.modalidad || '').trim().toLowerCase();
  const niv = String(item.nivel || 'NONE').trim().toLowerCase();
  const esp = String(item.area || '').trim().toLowerCase();
  const year = String(item.anio || '').trim();
  const tipo = String(item.tipoCuadernillo || 'NONE').trim().toLowerCase();
  return `${proc}__${mod}__${niv}__${esp}__${year}__${tipo}`;
}
