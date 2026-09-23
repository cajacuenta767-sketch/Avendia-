export type MembershipRole = 'PREMIUM' | 'PRUEBA_GRATIS_24H' | 'CLIENTE';

export type ImportMembershipPolicy = 'STRICT_EXPLICIT' | 'LEGACY_ACTIVE_IS_PREMIUM';

export const USER_IMPORT_COLUMN_FIELDS = [
  'ignore',
  'nombre',
  'email',
  'telefono',
  'dni',
  'rol',
  'estado',
  'fechaInicio',
  'fechaFin',
  'tiposAcceso',
  'modalidad',
  'nivel',
  'especialidad',
  'region',
  'institucionEducativa',
  'pin',
] as const;

export type UserImportColumnField = (typeof USER_IMPORT_COLUMN_FIELDS)[number];
export type UserImportColumnMapping = Record<string, UserImportColumnField>;
export type ImportColumnConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BulkDocenteRecord {
  fila?: number;
  dni?: string;
  telefono?: string;
  email: string;
  nombre?: string;
  rol?: string;
  estado?: string;
  region?: string;
  departamento?: string;
  institucionEducativa?: string;
  ie?: string;
  colegio?: string;
  escuela?: string;
  modalidad?: string;
  modalidades?: string;
  nivel?: string;
  niveles?: string;
  especialidad?: string;
  especialidades?: string;
  tiposAcceso?: string;
  fechaInicio?: string;
  fechaFin?: string;
  pin?: string;
}

export interface ImportReportIssue {
  fila: number;
  correo: string;
  motivo: string;
}

export interface ImportReport {
  totalLeidos: number;
  nuevosCreados: number;
  actualizados: number;
  promovidosAPremium: number;
  premiumProtegidos: number;
  noPromovidos: number;
  duplicadosConsolidados: number;
  nombresCorregidos: number;
  telefonosCorregidos: number;
  fechasRenovadas: number;
  ambiguedadesDetectadas: number;
  conflictos: ImportReportIssue[];
  errores: ImportReportIssue[];
}

export interface BulkImportOptions {
  membershipPolicy: ImportMembershipPolicy;
  mappingConfirmed: boolean;
  dateAmbiguitiesResolved: boolean;
  columnMapping: UserImportColumnMapping;
  ambiguousColumns: number;
}

export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

export interface UserImportColumnDetection {
  index: number;
  sourceLabel: string;
  detectedField: UserImportColumnField;
  selectedField: UserImportColumnField;
  confidence: ImportColumnConfidence;
  confidenceScore: number;
  examples: string[];
  reason: string;
  requiresConfirmation: boolean;
}

export interface UserImportPreviewSummary {
  filasConCorreo: number;
  nombresDetectados: number;
  telefonosDetectados: number;
  fechasDetectadas: number;
  premiumDetectados: number;
  sinPromocion: number;
  columnasAmbiguas: number;
  conflictosMapeo: number;
}

export interface ParsedUserImport {
  records: BulkDocenteRecord[];
  headerRowIndex: number;
  columns: UserImportColumnDetection[];
  summary: UserImportPreviewSummary;
  warnings: string[];
  hasEmailColumn: boolean;
  hasUnresolvedDateColumns: boolean;
}

export interface ParseUserImportOptions {
  membershipPolicy?: ImportMembershipPolicy;
  columnMapping?: UserImportColumnMapping;
}
