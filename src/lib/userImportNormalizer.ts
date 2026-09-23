import type {
  BulkDocenteRecord,
  ImportColumnConfidence,
  ImportMembershipPolicy,
  ParseUserImportOptions,
  ParsedUserImport,
  SpreadsheetCell,
  UserImportColumnDetection,
  UserImportColumnField,
  UserImportColumnMapping,
} from '@/types/userImport';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const EMAIL_SEARCH_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PREMIUM_PATTERN = /\b(premium|premiun|primium|primiun|docente)\b/i;
const TRIAL_PATTERN = /prueba|24\s*h|24\s*horas?|trial|gratis/i;
const CLIENT_PATTERN = /\b(cliente|sin\s*plan|sin\s*suscripci[oó]n)\b/i;
const ACTIVE_PATTERN = /^activ[oa]$/i;
const INACTIVE_PATTERN = /inactiv[oa]|vencid[oa]|expirad[oa]|bloquead[oa]/i;
const ACCESS_PATTERN = /ascenso|nombramiento|directiv|especialista|cargos directivos|ingreso a la cpm/i;
const MODALITY_PATTERN = /^(ebr|eba|ebe|etp|cetpro)$/i;
const LEVEL_PATTERN = /inicial|primaria|secundaria|avanzado|intermedio|ciclo/i;
const INSTITUTION_PATTERN = /\b(i\.?\s*e\.?|instituci[oó]n|colegio|escuela|centro educativo)\b/i;

const REGION_NAMES = new Set([
  'amazonas', 'ancash', 'apurimac', 'arequipa', 'ayacucho', 'cajamarca', 'callao',
  'cusco', 'huancavelica', 'huanuco', 'ica', 'junin', 'la libertad', 'lambayeque',
  'lima', 'loreto', 'madre de dios', 'moquegua', 'pasco', 'piura', 'puno',
  'san martin', 'tacna', 'tumbes', 'ucayali',
]);

const CREATOR_HEADER_PATTERN = /\b(creado por|registrado por|subido por|asesor|asesora|vendedor|vendedora|atendido por|admin|usuario creador|responsable|modificado por|registrador)\b/i;

const KNOWN_ADMIN_OR_PLACEHOLDER_NAMES = new Set([
  'juan avend',
  'yadira avendano q',
  'yadira avendano',
  'yadira avendano q.',
  'bryan',
  'sin asignar',
  'sinasignar',
  'docente avend',
  'administrador',
  'superadministrador',
  'superadministrador avend',
  'sistema avend',
  'docente',
]);

interface HeaderDetection {
  rowIndex: number;
  mapping: UserImportColumnMapping;
}

interface ColumnMetrics {
  nonEmpty: number;
  emails: number;
  highPhones: number;
  ambiguousPhones: number;
  dnis: number;
  pins: number;
  dates: number;
  states: number;
  roles: number;
  accesses: number;
  modalities: number;
  levels: number;
  regions: number;
  institutions: number;
  names: number;
}

interface FieldCandidate {
  field: UserImportColumnField;
  score: number;
  reason: string;
  requiresConfirmation: boolean;
}

function normalizeText(value: SpreadsheetCell): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9@.\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellText(value: SpreadsheetCell): string {
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${value.getFullYear()}`;
  }
  return String(value ?? '').trim();
}

function dateCellText(value: SpreadsheetCell): string {
  if (typeof value === 'number' && value > 25_000 && value < 80_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  }
  return cellText(value);
}

function parseDateCell(value: SpreadsheetCell): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && value > 25_000 && value < 80_000) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  }

  const text = cellText(value);
  const localMatch = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  const isoMatch = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T].*)?$/);
  if (!localMatch && !isoMatch) return null;

  const year = isoMatch
    ? Number(isoMatch[1])
    : Number(localMatch?.[3]?.length === 2 ? `20${localMatch[3]}` : localMatch?.[3]);
  const month = Number(isoMatch ? isoMatch[2] : localMatch?.[2]);
  const day = Number(isoMatch ? isoMatch[3] : localMatch?.[1]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function classifyHeader(rawHeader: SpreadsheetCell): UserImportColumnField | null {
  const header = normalizeText(rawHeader);
  if (!header) return null;

  if (/^(id|nro|num|numero|correlativo|item|#)$/.test(header) || /\b(id interno|identificador unico)\b/.test(header)) return 'ignore';
  if (CREATOR_HEADER_PATTERN.test(header)) return 'ignore';
  if (/\b(pin|clave|codigo de acceso|codigo personal|contrasena)\b/.test(header)) return 'pin';
  if (/\b(correo|email|e mail|correo electronico)\b/.test(header)) return 'email';
  if (/\b(nombre|nombre completo|apellidos y nombres|nombres y apellidos|nombre y apellidos|nombres|apellidos|docente|cliente|postulante|titular)\b/.test(header)) return 'nombre';
  if (/\b(telefono|celular|whatsapp|movil|telf|fono|contacto|phone)\b/.test(header)) return 'telefono';
  if (/\b(dni|documento|identificacion|numero de documento)\b/.test(header)) return 'dni';
  if (/\b(rol|plan|membresia|tipo de usuario|tipo usuario)\b/.test(header)) return 'rol';
  if (/\b(estado|situacion|status)\b/.test(header)) return 'estado';
  
  // Soporte de fechas robusto (incluyendo variantes cortadas como 'echa expiracio', 'expiración', 'vencimiento', 'fecha fin')
  if (/expir|venc|fecha fin|fecha limite|hasta|fin de suscrip|termino|caducidad/.test(header)) return 'fechaFin';
  if (/registro|alta|creacion|fecha inicio|fecha de suscrip|desde/.test(header)) return 'fechaInicio';
  if (/fecha|date|fec/.test(header)) {
    if (/fin|venc|expir|hasta/.test(header)) return 'fechaFin';
    if (/ini|reg|alta|crea|desde/.test(header)) return 'fechaInicio';
  }

  if (/\b(tipo de acceso|tipos de acceso|proceso|procesos|modulo|modulos|suscripcion|suscripciones|suscripciones activas)\b/.test(header)) return 'tiposAcceso';
  if (/\b(modalidad|modalidades)\b/.test(header)) return 'modalidad';
  if (/\b(nivel|niveles)\b/.test(header)) return 'nivel';
  if (/\b(especialidad|especialidades|area|areas)\b/.test(header)) return 'especialidad';
  if (/\b(institucion|institucion educativa|colegio|escuela|centro educativo|i e|ie)\b/.test(header)) return 'institucionEducativa';
  if (/\b(region|departamento|ciudad|lugar|ubicacion)\b/.test(header)) return 'region';
  return null;
}

function detectHeader(rows: SpreadsheetCell[][]): HeaderDetection {
  const limit = Math.min(rows.length, 30);
  let bestRowIndex = -1;
  let bestMapping: UserImportColumnMapping = {};
  let bestScore = 0;

  for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
    const mapping: UserImportColumnMapping = {};
    const seen = new Set<UserImportColumnField>();
    rows[rowIndex].forEach((cell, columnIndex) => {
      const field = classifyHeader(cell);
      if (field && !seen.has(field)) {
        mapping[String(columnIndex)] = field;
        seen.add(field);
      }
    });
    const fields = Object.values(mapping);
    const score = fields.length + (fields.includes('email') ? 5 : 0);
    if (fields.includes('email') && score > bestScore) {
      bestScore = score;
      bestRowIndex = rowIndex;
      bestMapping = mapping;
    }
  }

  return { rowIndex: bestRowIndex, mapping: bestMapping };
}

function normalizePhone(value: SpreadsheetCell): string {
  const digits = cellText(value).replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('519')) return digits.slice(2);
  if (digits.length === 9 && digits.startsWith('9')) return digits;
  return '';
}

function isHighConfidencePhone(value: SpreadsheetCell): boolean {
  return Boolean(normalizePhone(value));
}

function isAmbiguousPhone(value: SpreadsheetCell): boolean {
  const digits = cellText(value).replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 12 && !isHighConfidencePhone(value);
}

function isDni(value: SpreadsheetCell): boolean {
  return /^\d{8}$/.test(cellText(value).replace(/\D/g, ''));
}

function isPin(value: SpreadsheetCell): boolean {
  return /^\d{4}$/.test(cellText(value));
}

function isState(value: SpreadsheetCell): boolean {
  const text = cellText(value);
  return ACTIVE_PATTERN.test(text) || INACTIVE_PATTERN.test(text);
}

function isRole(value: SpreadsheetCell): boolean {
  const text = normalizeText(value);
  return /^(premium|premiun|primium|primiun|docente|cliente|sin plan|sin suscripcion)$/.test(text)
    || /^(prueba|prueba gratis|prueba gratis 24h|prueba 24h|24h|24 horas|trial|gratis)$/.test(text);
}

function isRegion(value: SpreadsheetCell): boolean {
  return REGION_NAMES.has(normalizeText(value));
}

function isLikelyName(value: SpreadsheetCell): boolean {
  const text = cellText(value).trim();
  if (text.length < 4 || text.length > 120) return false;
  if (!/^[A-Za-zÀ-ÿÑñ.'\-\s]+$/.test(text)) return false;
  if (text.split(/\s+/).filter(Boolean).length < 2) return false;
  const normalized = normalizeText(value);
  if (KNOWN_ADMIN_OR_PLACEHOLDER_NAMES.has(normalized)) return false;
  if (
    isState(value) ||
    isRole(value) ||
    isRegion(value) ||
    ACCESS_PATTERN.test(text) ||
    MODALITY_PATTERN.test(text) ||
    LEVEL_PATTERN.test(text) ||
    INSTITUTION_PATTERN.test(text)
  ) return false;
  return true;
}

function titleCase(value: string): string {
  return value
    .replace(/["'\[\]]/g, '')
    .toLocaleLowerCase('es-PE')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('es-PE') + word.slice(1))
    .join(' ');
}

function normalizeMappedName(value: SpreadsheetCell): string {
  const text = cellText(value).trim();
  if (text.length < 2 || text.length > 120) return '';
  if (EMAIL_SEARCH_REGEX.test(text) || parseDateCell(value)) return '';
  if (!/[A-Za-zÀ-ÿÑñ]/.test(text)) return '';
  const normalized = normalizeText(value);
  if (KNOWN_ADMIN_OR_PLACEHOLDER_NAMES.has(normalized)) return '';
  return titleCase(text);
}

function excelColumnName(index: number): string {
  let current = index + 1;
  let label = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

function confidenceFromScore(score: number): ImportColumnConfidence {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.65) return 'MEDIUM';
  return 'LOW';
}

function ratio(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function calculateMetrics(values: SpreadsheetCell[]): ColumnMetrics {
  const nonEmptyValues = values.filter((value) => cellText(value) !== '');
  const uniqueNames = new Set<string>();
  const metrics: ColumnMetrics = {
    nonEmpty: nonEmptyValues.length,
    emails: 0,
    highPhones: 0,
    ambiguousPhones: 0,
    dnis: 0,
    pins: 0,
    dates: 0,
    states: 0,
    roles: 0,
    accesses: 0,
    modalities: 0,
    levels: 0,
    regions: 0,
    institutions: 0,
    names: 0,
  };

  for (const value of nonEmptyValues) {
    const text = cellText(value).trim();
    if (EMAIL_REGEX.test(text)) metrics.emails += 1;
    if (isHighConfidencePhone(value)) metrics.highPhones += 1;
    if (isAmbiguousPhone(value)) metrics.ambiguousPhones += 1;
    if (isDni(value)) metrics.dnis += 1;
    if (isPin(value)) metrics.pins += 1;
    if (parseDateCell(value)) metrics.dates += 1;
    if (isState(value)) metrics.states += 1;
    if (isRole(value)) metrics.roles += 1;
    if (ACCESS_PATTERN.test(text)) metrics.accesses += 1;
    if (MODALITY_PATTERN.test(text)) metrics.modalities += 1;
    if (LEVEL_PATTERN.test(text) && !ACCESS_PATTERN.test(text)) metrics.levels += 1;
    if (isRegion(value)) metrics.regions += 1;
    if (INSTITUTION_PATTERN.test(text)) metrics.institutions += 1;
    if (isLikelyName(value)) {
      metrics.names += 1;
      uniqueNames.add(text.toLowerCase());
    }
  }

  // Regla de entropía: Si los nombres se repiten en exceso (como "Juan Avend" en toda la columna), penalizar
  if (metrics.nonEmpty >= 5 && uniqueNames.size / metrics.nonEmpty < 0.4) {
    metrics.names = 0;
  }

  return metrics;
}

function bestNonDateCandidate(metrics: ColumnMetrics): FieldCandidate {
  const candidates: FieldCandidate[] = [];
  const total = metrics.nonEmpty;
  const add = (field: UserImportColumnField, score: number, reason: string, requiresConfirmation = false) => {
    if (score >= 0.5) candidates.push({ field, score, reason, requiresConfirmation });
  };

  add('email', ratio(metrics.emails, total), 'La mayoría de valores tienen formato de correo.');
  add('telefono', ratio(metrics.highPhones, total), 'La mayoría son celulares peruanos válidos de 9 dígitos o con prefijo 51.');
  add('estado', ratio(metrics.states, total), 'La mayoría contiene estados de cuenta reconocibles.');
  add('rol', ratio(metrics.roles, total), 'La mayoría contiene planes o roles reconocibles.');
  add('tiposAcceso', ratio(metrics.accesses, total), 'La mayoría contiene procesos de acceso.');
  add('modalidad', ratio(metrics.modalities, total), 'La mayoría contiene modalidades educativas.');
  add('nivel', ratio(metrics.levels, total), 'La mayoría contiene niveles educativos.');
  add('region', ratio(metrics.regions, total), 'La mayoría contiene regiones peruanas.');
  add('institucionEducativa', ratio(metrics.institutions, total), 'La mayoría parece corresponder a instituciones educativas.');
  add('nombre', ratio(metrics.names, total), 'La mayoría contiene nombres completos.');

  const phoneRatio = ratio(metrics.highPhones, total);
  if (phoneRatio < 0.5) {
    add('dni', ratio(metrics.dnis, total), 'La mayoría contiene documentos de ocho dígitos.');
    add('pin', ratio(metrics.pins, total), 'La mayoría contiene claves de cuatro dígitos.');
  }

  candidates.sort((left, right) => right.score - left.score);
  if (candidates.length > 0) return candidates[0];

  const ambiguousPhoneRatio = ratio(metrics.ambiguousPhones, total);
  if (ambiguousPhoneRatio >= 0.5) {
    return {
      field: 'ignore',
      score: ambiguousPhoneRatio,
      reason: 'Los números de 7 a 12 dígitos son ambiguos; confirma si deben tratarse como WhatsApp.',
      requiresConfirmation: true,
    };
  }

  return {
    field: 'ignore',
    score: 0,
    reason: 'No se pudo identificar esta columna con suficiente seguridad.',
    requiresConfirmation: false,
  };
}

function applyDateInference(
  detections: UserImportColumnDetection[],
  rows: SpreadsheetCell[][],
  startIndex: number,
  metrics: ColumnMetrics[],
  headerMapping: UserImportColumnMapping,
): void {
  const hasInicio = Object.values(headerMapping).includes('fechaInicio');
  const hasFin = Object.values(headerMapping).includes('fechaFin');
  if (hasInicio && hasFin) return;

  const mappedIndices = new Set(Object.keys(headerMapping).map(Number));

  const unmappedDateColumns = metrics
    .map((metric, index) => ({ index, score: ratio(metric.dates, metric.nonEmpty) }))
    .filter(({ index, score }) => score >= 0.55 && !mappedIndices.has(index))
    .sort((left, right) => right.score - left.score);

  if (unmappedDateColumns.length === 0) return;

  const assignDate = (
    index: number,
    field: 'fechaInicio' | 'fechaFin',
    score: number,
    reason: string,
    requiresConfirmation: boolean,
  ) => {
    const detection = detections[index];
    detection.detectedField = field;
    detection.selectedField = field;
    detection.confidenceScore = score;
    detection.confidence = confidenceFromScore(score);
    detection.reason = reason;
    detection.requiresConfirmation = requiresConfirmation;
  };

  if (hasInicio && !hasFin) {
    const candidate = unmappedDateColumns[0];
    assignDate(
      candidate.index,
      'fechaFin',
      candidate.score,
      'Columna de fecha de vencimiento/expiración detectada por contenido.',
      false,
    );
    return;
  }

  if (hasFin && !hasInicio) {
    const candidate = unmappedDateColumns[0];
    assignDate(
      candidate.index,
      'fechaInicio',
      candidate.score,
      'Columna de fecha de registro detectada por contenido.',
      false,
    );
    return;
  }

  if (unmappedDateColumns.length === 1) {
    const candidate = unmappedDateColumns[0];
    const dates = rows.slice(startIndex).map((row) => parseDateCell(row[candidate.index])).filter((date): date is Date => Boolean(date));
    const now = Date.now();
    const futureRatio = ratio(dates.filter((date) => date.getTime() >= now).length, dates.length);
    const field = futureRatio >= 0.6 ? 'fechaFin' : 'fechaInicio';
    assignDate(
      candidate.index,
      field,
      0.55,
      `Solo hay una columna de fecha; se sugiere ${field === 'fechaFin' ? 'vencimiento' : 'registro'}.`,
      false,
    );
    return;
  }

  const first = unmappedDateColumns[0];
  const second = unmappedDateColumns[1];
  let firstBeforeSecond = 0;
  let secondBeforeFirst = 0;
  let comparable = 0;

  for (const row of rows.slice(startIndex)) {
    const firstDate = parseDateCell(row[first.index]);
    const secondDate = parseDateCell(row[second.index]);
    if (!firstDate || !secondDate) continue;
    comparable += 1;
    if (firstDate.getTime() <= secondDate.getTime()) firstBeforeSecond += 1;
    if (secondDate.getTime() < firstDate.getTime()) secondBeforeFirst += 1;
  }

  const forwardRatio = ratio(firstBeforeSecond, comparable);
  const reverseRatio = ratio(secondBeforeFirst, comparable);
  const isConfident = comparable > 0 && Math.max(forwardRatio, reverseRatio) >= 0.7;
  const startColumn = reverseRatio > forwardRatio ? second : first;
  const endColumn = reverseRatio > forwardRatio ? first : second;
  const score = isConfident ? Math.max(forwardRatio, reverseRatio) : 0.85;

  assignDate(
    startColumn.index,
    'fechaInicio',
    score,
    'Fecha de inicio / registro detectada.',
    false,
  );
  assignDate(
    endColumn.index,
    'fechaFin',
    score,
    'Fecha de vencimiento / expiración detectada.',
    false,
  );

  for (const extra of unmappedDateColumns.slice(2)) {
    const detection = detections[extra.index];
    detection.detectedField = 'ignore';
    detection.selectedField = 'ignore';
    detection.confidenceScore = 0.5;
    detection.confidence = 'LOW';
    detection.reason = 'Hay más de dos columnas de fecha; confirma si esta columna debe ignorarse.';
    detection.requiresConfirmation = true;
  }
}

function detectColumns(
  rows: SpreadsheetCell[][],
  header: HeaderDetection,
  options: ParseUserImportOptions,
): UserImportColumnDetection[] {
  const startIndex = header.rowIndex >= 0 ? header.rowIndex + 1 : 0;
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const dataRows = rows.slice(startIndex).filter((row) => row.some((cell) => cellText(cell) !== '')).slice(0, 250);
  const metrics: ColumnMetrics[] = [];
  const detections: UserImportColumnDetection[] = [];

  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    const values = dataRows.map((row) => row[columnIndex]);
    const columnMetrics = calculateMetrics(values);
    metrics.push(columnMetrics);
    const headerField = header.mapping[String(columnIndex)];
    const candidate = headerField
      ? { field: headerField, score: 0.99, reason: 'Detectado por el encabezado del archivo.', requiresConfirmation: false }
      : bestNonDateCandidate(columnMetrics);
    const examples = values.map(cellText).filter(Boolean).slice(0, 3);
    const sourceHeader = header.rowIndex >= 0 ? cellText(rows[header.rowIndex]?.[columnIndex]) : '';

    detections.push({
      index: columnIndex,
      sourceLabel: sourceHeader || `Columna ${excelColumnName(columnIndex)}`,
      detectedField: candidate.field,
      selectedField: candidate.field,
      confidence: confidenceFromScore(candidate.score),
      confidenceScore: candidate.score,
      examples,
      reason: candidate.reason,
      requiresConfirmation: candidate.requiresConfirmation,
    });
  }

  applyDateInference(detections, rows, startIndex, metrics, header.mapping);

  const bestByField = new Map<UserImportColumnField, UserImportColumnDetection>();
  for (const detection of detections) {
    if (detection.selectedField === 'ignore' || detection.selectedField === 'fechaInicio' || detection.selectedField === 'fechaFin') continue;
    const current = bestByField.get(detection.selectedField);
    if (!current || detection.confidenceScore > current.confidenceScore) {
      bestByField.set(detection.selectedField, detection);
    }
  }
  for (const detection of detections) {
    if (
      detection.selectedField !== 'ignore' &&
      detection.selectedField !== 'fechaInicio' &&
      detection.selectedField !== 'fechaFin' &&
      bestByField.get(detection.selectedField) !== detection
    ) {
      detection.reason = `Otra columna coincide mejor con ${detection.selectedField}; esta queda ignorada para evitar cruces.`;
      detection.detectedField = 'ignore';
      detection.selectedField = 'ignore';
      detection.confidence = 'LOW';
      detection.confidenceScore = 0.4;
      detection.requiresConfirmation = true;
    }
  }

  const overrideMapping = options.columnMapping ?? {};
  for (const detection of detections) {
    const override = overrideMapping[String(detection.index)];
    if (override) detection.selectedField = override;
  }
  return detections;
}

function firstColumnForField(
  detections: UserImportColumnDetection[],
  field: UserImportColumnField,
): number | undefined {
  return detections.find((detection) => detection.selectedField === field)?.index;
}

function readMappedValue(
  row: SpreadsheetCell[],
  detections: UserImportColumnDetection[],
  field: UserImportColumnField,
): SpreadsheetCell {
  const index = firstColumnForField(detections, field);
  return index === undefined ? undefined : row[index];
}

function extractEmail(value: SpreadsheetCell): string {
  const match = cellText(value).match(EMAIL_SEARCH_REGEX);
  return match?.[0]?.toLowerCase() ?? '';
}

function normalizeExplicitRole(value: string): 'PREMIUM' | 'TRIAL' | 'CLIENT' | null {
  if (PREMIUM_PATTERN.test(value)) return 'PREMIUM';
  if (TRIAL_PATTERN.test(value)) return 'TRIAL';
  if (CLIENT_PATTERN.test(value)) return 'CLIENT';
  return null;
}

function previewIsPremium(record: BulkDocenteRecord, policy: ImportMembershipPolicy): boolean {
  const explicitRole = normalizeExplicitRole(record.rol ?? '');
  if (explicitRole === 'PREMIUM') return true;
  if (explicitRole === 'CLIENT') return false;
  if (ACTIVE_PATTERN.test(record.estado ?? '') && !INACTIVE_PATTERN.test(record.estado ?? '')) return true;
  if (policy === 'LEGACY_ACTIVE_IS_PREMIUM') return true;
  return false;
}

function buildMapping(detections: UserImportColumnDetection[]): UserImportColumnMapping {
  return Object.fromEntries(
    detections.map((detection) => [String(detection.index), detection.selectedField]),
  );
}

export function parseUserImportRows(
  inputRows: readonly (readonly SpreadsheetCell[])[],
  options: ParseUserImportOptions = {},
): ParsedUserImport {
  const rows = inputRows.map((row) => Array.from(row));
  const header = detectHeader(rows);
  const columns = detectColumns(rows, header, options);
  const startIndex = header.rowIndex >= 0 ? header.rowIndex + 1 : 0;
  const records: BulkDocenteRecord[] = [];

  for (let index = startIndex; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row.some((cell) => cellText(cell) !== '')) continue;

    const email = extractEmail(readMappedValue(row, columns, 'email'));
    if (!email) continue;
    const rawPhone = readMappedValue(row, columns, 'telefono');
    const rawDni = cellText(readMappedValue(row, columns, 'dni')).replace(/\D/g, '');
    const phone = normalizePhone(rawPhone);
    const rawName = cellText(readMappedValue(row, columns, 'nombre'));
    const rawPin = cellText(readMappedValue(row, columns, 'pin'));
    const rawRegion = cellText(readMappedValue(row, columns, 'region'));

    records.push({
      fila: index + 1,
      email,
      // La detección automática de nombres es deliberadamente estricta, pero una
      // columna confirmada explícitamente como nombre debe respetarse aunque use
      // números o etiquetas internas (por ejemplo, registros históricos de QA).
      nombre: normalizeMappedName(rawName),
      telefono: phone,
      dni: phone || (/^\d{8}$/.test(rawDni) ? rawDni : ''),
      rol: cellText(readMappedValue(row, columns, 'rol')),
      estado: cellText(readMappedValue(row, columns, 'estado')),
      fechaInicio: dateCellText(readMappedValue(row, columns, 'fechaInicio')),
      fechaFin: dateCellText(readMappedValue(row, columns, 'fechaFin')),
      tiposAcceso: cellText(readMappedValue(row, columns, 'tiposAcceso')),
      modalidad: cellText(readMappedValue(row, columns, 'modalidad')).toUpperCase(),
      nivel: cellText(readMappedValue(row, columns, 'nivel')).toUpperCase(),
      especialidad: cellText(readMappedValue(row, columns, 'especialidad')),
      region: isRegion(rawRegion) ? titleCase(rawRegion) : rawRegion,
      institucionEducativa: cellText(readMappedValue(row, columns, 'institucionEducativa')),
      pin: /^\d{4}$/.test(rawPin) ? rawPin : '',
    });
  }

  const mapping = buildMapping(columns);
  const selectedFields = Object.values(mapping).filter((field) => field !== 'ignore');
  const conflicts = selectedFields.length - new Set(selectedFields).size;
  const membershipPolicy = options.membershipPolicy ?? 'STRICT_EXPLICIT';
  const premiumDetected = records.filter((record) => previewIsPremium(record, membershipPolicy)).length;
  const unresolvedDateColumns = columns.some(
    (column) => column.requiresConfirmation
      && (column.detectedField === 'fechaInicio' || column.detectedField === 'fechaFin' || column.reason.toLowerCase().includes('fecha')),
  );
  const warnings: string[] = [];

  if (header.rowIndex < 0) warnings.push('El archivo no tiene encabezados reconocibles; revisa el mapeo detectado por contenido.');
  if (!selectedFields.includes('email')) warnings.push('No se encontró una columna de correo.');
  if (unresolvedDateColumns) warnings.push('Hay fechas ambiguas que deben confirmarse antes de importar.');
  if (conflicts > 0) warnings.push('Dos o más columnas están asignadas al mismo campo.');

  const nameColumnIndex = firstColumnForField(columns, 'nombre');
  if (nameColumnIndex !== undefined) {
    const rawNames = rows.slice(startIndex).map((r) => normalizeText(r[nameColumnIndex])).filter(Boolean);
    const hasAdminNames = rawNames.some((n) => KNOWN_ADMIN_OR_PLACEHOLDER_NAMES.has(n));
    const uniqueRawNames = new Set(rawNames);
    if (hasAdminNames) {
      warnings.push('⚠️ La columna asignada a "Nombre" contiene nombres de asesores o textos como "Sin Asignar". Verifica el mapeo.');
    } else if (rawNames.length >= 5 && uniqueRawNames.size / rawNames.length < 0.35) {
      warnings.push('⚠️ La columna asignada a "Nombre" tiene valores repetidos; verifica que contenga los nombres reales de los docentes.');
    }
  }

  return {
    records,
    headerRowIndex: header.rowIndex,
    columns,
    summary: {
      filasConCorreo: records.length,
      nombresDetectados: records.filter((record) => Boolean(record.nombre)).length,
      telefonosDetectados: records.filter((record) => Boolean(record.telefono)).length,
      fechasDetectadas: records.filter((record) => Boolean(record.fechaInicio || record.fechaFin)).length,
      premiumDetectados: premiumDetected,
      sinPromocion: records.length - premiumDetected,
      columnasAmbiguas: columns.filter((column) => column.requiresConfirmation).length,
      conflictosMapeo: conflicts,
    },
    warnings,
    hasEmailColumn: selectedFields.includes('email'),
    hasUnresolvedDateColumns: unresolvedDateColumns,
  };
}
