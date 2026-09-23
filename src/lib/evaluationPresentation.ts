const ASCENSO_ESCALAFON_VISIBLE_PATTERN = /\bASCENSO(?:[_\s-]+)(?:DE[_\s-]+)?ESCALAF[OÓ]N\b/giu;

/**
 * Oculta identificadores técnicos en superficies de presentación sin modificar
 * el valor original utilizado por rutas, filtros o persistencia.
 */
export const formatEvaluationTitle = (value: string | null | undefined): string => {
  if (!value) return '';

  return value
    .replace(ASCENSO_ESCALAFON_VISIBLE_PATTERN, 'ASCENSO')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
