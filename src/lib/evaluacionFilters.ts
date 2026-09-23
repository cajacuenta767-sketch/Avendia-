import { z } from 'zod';
import type { EvaluacionesFilterParams } from '@/types/evaluacion';

const procesoSchema = z.enum([
  'NOMBRAMIENTO_DOCENTE',
  'ASCENSO_ESCALAFON',
  'ACCESO_CARGOS_DIRECTIVOS',
  'INGRESO_CPM',
  'REASIGNACION_DOCENTE',
]);

const modalidadSchema = z.enum(['EBR', 'EBA', 'EBE', 'CETPRO']);
const nivelSchema = z.enum([
  'INICIAL',
  'PRIMARIA',
  'SECUNDARIA',
  'SUPERIOR_TECNICO',
  'EBA_INICIAL_INTERMEDIO',
  'EBA_AVANZADO',
  'CETPRO_TECNICO',
  'NO_APLICA',
]);

const optionalFilter = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.literal('TODOS'), z.literal('')]).optional();

export const evaluacionesFilterSchema = z.object({
  proceso: optionalFilter(procesoSchema),
  modalidad: optionalFilter(modalidadSchema),
  nivel: optionalFilter(nivelSchema),
  especialidad: z.union([z.string().trim().max(160), z.literal('TODOS')]).optional(),
  anio: z.union([
    z.number().int().min(1900).max(2200),
    z.literal('TODOS'),
    z.literal(''),
  ]).optional(),
  searchQuery: z.string().trim().max(160).optional(),
  includeDrafts: z.boolean().optional(),
}).strict();

export interface FilterableEvaluation {
  proceso?: string | null;
  modalidad?: string | null;
  nivel?: string | null;
  especialidad?: string | null;
  area?: string | null;
  anio?: string | number | null;
}

const PIP_ALIASES = new Set([
  'profesor de innovacion pedagogica',
  'aula de innovacion pedagogica',
  'aip',
  'aip / aula de innovacion pedagogica',
]);

export function normalizeEvaluationFilterText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function canonicalArea(value: unknown): string {
  const normalized = normalizeEvaluationFilterText(value);
  return PIP_ALIASES.has(normalized)
    ? 'profesor de innovacion pedagogica'
    : normalized;
}

function levelMatches(
  modalidad: unknown,
  selectedLevel: unknown,
  actualLevel: unknown
): boolean {
  const selected = normalizeEvaluationFilterText(selectedLevel);
  const actual = normalizeEvaluationFilterText(actualLevel);
  const normalizedModalidad = normalizeEvaluationFilterText(modalidad);

  if (!selected || selected === 'todos') return true;
  if (selected === actual) return true;

  if (normalizedModalidad === 'eba' && selected === 'eba_inicial_intermedio') {
    return new Set(['inicial', 'inicial_intermedio']).has(actual);
  }
  if (normalizedModalidad === 'eba' && selected === 'eba_avanzado') {
    return new Set(['secundaria', 'avanzado']).has(actual);
  }
  if (normalizedModalidad === 'cetpro' && selected === 'cetpro_tecnico') {
    return new Set(['secundaria', 'tecnico']).has(actual);
  }

  return false;
}

function isSingleClassificationLevel(modalidad: unknown, nivel: unknown): boolean {
  const normalizedModalidad = normalizeEvaluationFilterText(modalidad);
  const normalizedNivel = normalizeEvaluationFilterText(nivel);

  return (
    (normalizedModalidad === 'ebr' && normalizedNivel === 'inicial') ||
    (
      normalizedModalidad === 'eba' &&
      new Set(['eba_inicial_intermedio', 'inicial', 'inicial_intermedio']).has(normalizedNivel)
    ) ||
    (normalizedModalidad === 'ebe' && normalizedNivel === 'no_aplica') ||
    (
      normalizedModalidad === 'cetpro' &&
      new Set(['cetpro_tecnico', 'tecnico', 'secundaria']).has(normalizedNivel)
    )
  );
}

export function matchesEvaluationFilters(
  evaluation: FilterableEvaluation,
  filters: EvaluacionesFilterParams
): boolean {
  const selectedProcess = normalizeEvaluationFilterText(filters.proceso);
  if (
    selectedProcess &&
    selectedProcess !== 'todos' &&
    normalizeEvaluationFilterText(evaluation.proceso) !== selectedProcess
  ) {
    return false;
  }

  const isDirectivos = selectedProcess === 'acceso_cargos_directivos';
  if (!isDirectivos) {
    const selectedModalidad = normalizeEvaluationFilterText(filters.modalidad);
    if (
      selectedModalidad &&
      selectedModalidad !== 'todos' &&
      normalizeEvaluationFilterText(evaluation.modalidad) !== selectedModalidad
    ) {
      return false;
    }

    if (!levelMatches(filters.modalidad, filters.nivel, evaluation.nivel)) {
      return false;
    }

    if (!isSingleClassificationLevel(filters.modalidad, filters.nivel)) {
      const selectedArea = canonicalArea(filters.especialidad);
      if (
        selectedArea &&
        selectedArea !== 'todos' &&
        selectedArea !== '-' &&
        canonicalArea(evaluation.especialidad ?? evaluation.area) !== selectedArea
      ) {
        return false;
      }
    }
  }

  if (
    filters.anio &&
    filters.anio !== 'TODOS' &&
    String(evaluation.anio ?? '').trim() !== String(filters.anio)
  ) {
    return false;
  }

  return true;
}
