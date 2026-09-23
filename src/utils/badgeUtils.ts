// src/utils/badgeUtils.ts
// AVEND ESCALA - Normalización Canónica de Insignias y Especialidades Curriculares

import type { AccountAccessState } from '@/lib/whatsapp';

export const getAccountStateFromSession = (session: Record<string, unknown> | null): AccountAccessState => {
  if (!session) return 'EN_ESPERA';
  const explicitState = typeof session?.estado === 'string' ? session.estado.toUpperCase() : '';
  if (['ACTIVA', 'EN_ESPERA', 'PAUSADA', 'VENCIDA', 'PRUEBA_FINALIZADA'].includes(explicitState)) {
    return explicitState as AccountAccessState;
  }

  const role = typeof session?.rol === 'string' ? session.rol.toUpperCase() : '';
  const fechaFin = typeof session?.fechaFin === 'string' ? new Date(session.fechaFin as string) : null;
  const isExpired = Boolean(fechaFin && !Number.isNaN(fechaFin.getTime()) && fechaFin <= new Date());
  const isTrial = role.includes('PRUEBA') || role.includes('24H') || role.includes('TRIAL');

  if (role === 'CLIENTE') return 'EN_ESPERA';
  if (isTrial && isExpired) return 'PRUEBA_FINALIZADA';
  if (session?.accesoGranted === false) return 'PAUSADA';
  if (isExpired) return 'VENCIDA';
  return 'ACTIVA';
};

/**
 * Catálogo Oficial de Especialidades por Modalidad y Nivel
 */
export const CANONICAL_AREAS_MAP: Record<string, string[]> = {
  EBR_INICIAL: [
    'General',
  ],
  EBR_PRIMARIA: [
    'Educación Física',
    'Primaria',
    'Profesor de Innovación Pedagógica',
  ],
  EBR_SECUNDARIA: [
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
};

/**
 * Limpia y normaliza el texto de una especialidad extraída de archivos Excel/CSV:
 * Elimina sufijos de duración ("- 1 año", "1 año", "12 meses", "1 mes", "jota", "año 1", etc.)
 * y lo mapea con precisión a la lista canónica de especialidades oficiales.
 */
export function cleanAndResolveEspecialidades(
  modalidad: string,
  nivel: string,
  rawEspecialidad?: string
): string[] {
  const modUpper = (modalidad || 'EBR').trim().toUpperCase();
  const nivUpper = (nivel || 'INICIAL').trim().toUpperCase();

  // Nivel Inicial EBR por defecto es 'General'
  if (nivUpper === 'INICIAL') {
    return ['General'];
  }

  // EBE / CETPRO no tienen áreas compuestas
  if (modUpper === 'EBE' || modUpper === 'CETPRO' || nivUpper === 'NO_APLICA') {
    return [];
  }

  // Nivel Primaria EBR
  if (modUpper === 'EBR' && (nivUpper === 'PRIMARIA' || nivUpper.includes('PRIMARIA'))) {
    if (!rawEspecialidad || !rawEspecialidad.trim()) return ['Primaria'];
    const rawLower = rawEspecialidad.toLowerCase();
    const resultPrimaria: string[] = [];
    if (rawLower.includes('física') || rawLower.includes('fisica') || rawLower.includes('educacion fisica') || rawLower.includes('deporte')) {
      resultPrimaria.push('Educación Física');
    }
    if (rawLower.includes('innovación') || rawLower.includes('innovacion') || rawLower.includes('pip') || rawLower.includes('aip') || rawLower.includes('crt')) {
      resultPrimaria.push('Profesor de Innovación Pedagógica');
    }
    if (rawLower.includes('primaria') && !rawLower.includes('educacion fisica') && !rawLower.includes('innovacion') && !rawLower.includes('pip')) {
      resultPrimaria.push('Primaria');
    }
    if (resultPrimaria.length === 0) {
      resultPrimaria.push('Primaria');
    }
    return Array.from(new Set(resultPrimaria)).slice(0, 2);
  }

  // Nivel EBA Inicial - Intermedio
  if (modUpper === 'EBA' && (nivUpper.includes('INICIAL') || nivUpper.includes('INTERMEDIO'))) {
    return [];
  }

  // Nivel Secundaria EBR o EBA Avanzado
  const targetKey = modUpper === 'EBA' ? 'EBA_AVANZADO' : 'EBR_SECUNDARIA';
  const canonicalList = CANONICAL_AREAS_MAP[targetKey] || CANONICAL_AREAS_MAP.EBR_SECUNDARIA;

  if (!rawEspecialidad || !rawEspecialidad.trim()) {
    return ['General'];
  }

  // 1. Limpiar cadenas de duración, texto de planes y ruido
  let clean = rawEspecialidad
    .replace(/\b(1|uno|un|2|dos|3|6|12)\s*(año|años|anio|anios|mes|meses)\b/gi, '')
    .replace(/\b(año|anio)\s*\d+/gi, '')
    .replace(/\b(jota|plan|anual|mensual|acceso)\b/gi, '')
    .replace(/[\(\)\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanLower = clean.toLowerCase();
  if (
    !clean ||
    clean === '-' ||
    clean === '—' ||
    cleanLower === 'general' ||
    cleanLower.includes('todas') ||
    cleanLower.includes('agregar todas')
  ) {
    return ['General'];
  }

  // 2. Comprobar si hay múltiples áreas separadas por coma, punto y coma o ' y '
  const candidateParts = clean.split(/[,;\n]|(?:\s+y\s+)/i).map((p) => p.trim()).filter(Boolean);
  const matchedAreas: string[] = [];

  for (const part of candidateParts) {
    const partLower = part.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Buscar coincidencia exacta o cercana en canonicalList
    const match = canonicalList.find((canon) => {
      const canonLower = canon.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return canonLower === partLower || canonLower.includes(partLower) || partLower.includes(canonLower);
    });

    if (match) {
      if (!matchedAreas.includes(match)) matchedAreas.push(match);
    } else {
      // Reglas específicas de sinonimia curricular
      if (partLower.includes('comunicac')) {
        matchedAreas.push('Comunicación');
      } else if (partLower.includes('matemat')) {
        matchedAreas.push('Matemática');
      } else if (partLower.includes('ciencia') && (partLower.includes('tec') || partLower.includes('amb') || partLower.includes('salud'))) {
        matchedAreas.push(modUpper === 'EBA' ? 'Ciencia, Tecnología y Salud' : 'Ciencia y Tecnología');
      } else if (partLower.includes('social') || partLower.includes('historia') || partLower.includes('geograf')) {
        matchedAreas.push('Ciencias Sociales');
      } else if (partLower.includes('dpcc') || partLower.includes('ciudadan') || partLower.includes('desarrollo personal')) {
        matchedAreas.push(modUpper === 'EBA' ? 'Desarrollo Personal y Ciudadano' : 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)');
      } else if (partLower.includes('ingles') || partLower.includes('extranjero')) {
        matchedAreas.push(modUpper === 'EBA' ? 'Inglés' : 'Inglés (Idioma Extranjero)');
      } else if (partLower.includes('fisica') || partLower.includes('deporte')) {
        matchedAreas.push('Educación Física');
      } else if (partLower.includes('ept') || partLower.includes('trabajo') || partLower.includes('tecnica')) {
        matchedAreas.push('Educación para el Trabajo (EPT)');
      } else if (partLower.includes('arte') || partLower.includes('cultura')) {
        matchedAreas.push('Arte y Cultura');
      } else if (partLower.includes('religio')) {
        matchedAreas.push('Educación Religiosa');
      } else if (partLower.includes('aip') || partLower.includes('crt') || partLower.includes('innovacion') || partLower.includes('pip')) {
        matchedAreas.push('Profesor de Innovación Pedagógica');
      }
    }
  }

  if (matchedAreas.length === 0) {
    return ['General'];
  }

  // Si coincide con todas o casi todas las especialidades, simplificar a 'General'
  if (matchedAreas.length >= 6) {
    return ['General'];
  }

  // Máximo 2 especialidades por nivel
  return Array.from(new Set(matchedAreas)).slice(0, 2);
}

/**
 * Genera la lista de Insignias Oficiales de Acceso para el Docente
 */
export function buildDocenteAccessBadges(
  modalidad: string,
  nivel: string,
  especialidadRaw?: string
): string[] {
  const rawMods = (modalidad || 'EBR')
    .split(/[,;\n]|(?:\s+y\s+)/i)
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);
  const modalities = rawMods.length > 0 ? Array.from(new Set(rawMods)) : ['EBR'];

  const rawNivs = (nivel || 'INICIAL')
    .split(/[,;\n]|(?:\s+y\s+)/i)
    .map((n) => n.trim().toUpperCase())
    .filter(Boolean);
  const levels = rawNivs.length > 0 ? Array.from(new Set(rawNivs)) : ['INICIAL'];

  const allBadges: string[] = [];

  for (const modUpper of modalities) {
    for (const nivUpper of levels) {
      if (modUpper === 'EBE' || nivUpper === 'NO_APLICA') {
        allBadges.push('EBE');
        continue;
      }

      if (modUpper === 'CETPRO') {
        allBadges.push('CETPRO - Ciclo Técnico y Auxiliar');
        continue;
      }

      if (nivUpper === 'INICIAL') {
        allBadges.push(`${modUpper} - Inicial - General`);
        continue;
      }

      if (modUpper === 'EBA' && (nivUpper.includes('INICIAL') || nivUpper.includes('INTERMEDIO'))) {
        allBadges.push('EBA - Inicial - Intermedio');
        continue;
      }

      if (modUpper === 'EBR' && (nivUpper.includes('PRIMARIA') || nivUpper === 'PRIMARIA')) {
        const areas = cleanAndResolveEspecialidades(modUpper, 'PRIMARIA', especialidadRaw);
        for (const a of areas) {
          allBadges.push(`${modUpper} - Primaria - ${a}`);
        }
        continue;
      }

      const nivLabel = modUpper === 'EBA' ? 'Avanzado' : 'Secundaria';
      const targetNiv = modUpper === 'EBA' ? 'AVANZADO' : 'SECUNDARIA';
      const areas = cleanAndResolveEspecialidades(modUpper, targetNiv, especialidadRaw);
      for (const a of areas) {
        allBadges.push(`${modUpper} - ${nivLabel} - ${a}`);
      }
    }
  }

  const unique = Array.from(new Set(allBadges));
  // Si hay más de 2 especialidades registradas, tomar máximo 2 según lo solicitado
  return unique.slice(0, 2);
}

/**
 * Función backward-compatible para obtener la insignia principal
 */
export function buildDocenteAccessBadge(modalidad: string, nivel: string, especialidad?: string): string {
  const badges = buildDocenteAccessBadges(modalidad, nivel, especialidad);
  return badges[0] || `${modalidad} - ${nivel}`;
}

export function condenseAccessBadges(areas: string[]): string[] {
  if (!Array.isArray(areas) || areas.length === 0) return [];

  // 1. Normalizar y limpiar residuos de texto con sanitización de nulos
  const normalizedAreas = areas
    .map((a: any) => {
      if (a === null || a === undefined) return '';
      let clean = String(a).trim();
      if (!clean) return '';
      // Quitar sufijos de duración pegados
      clean = clean
        .replace(/\s*-\s*1\s*(año|anio|mes|meses)/gi, '')
        .replace(/\s*-\s*\d+\s*(año|anio|mes|meses)/gi, '')
        .replace(/\bjota\s*-\s*/gi, '')
        .trim();

      if (clean === 'EBR - Inicial' || clean === 'EBR - Inicial - Inicial') {
        return 'EBR - Inicial - General';
      }
      if (clean === 'EBR - Primaria - General') {
        return 'EBR - Primaria - Primaria';
      }
      return clean;
    })
    .filter(Boolean);

  const cleanAreas = Array.from(new Set(normalizedAreas));
  const generalLevels = new Set<string>();

  // Detectar niveles con insignia GENERAL
  cleanAreas.forEach((area) => {
    const parts = area.split(' - ').map((p) => (p || '').trim());
    if (parts.length === 2) {
      generalLevels.add(`${parts[0].toUpperCase()} - ${parts[1].toUpperCase()}`);
    } else if (parts.length >= 3 && parts[2].toLowerCase() === 'general') {
      generalLevels.add(`${parts[0].toUpperCase()} - ${parts[1].toUpperCase()}`);
    }
  });

  const result: string[] = [];
  const addedGeneralKeys = new Set<string>();

  cleanAreas.forEach((area) => {
    const parts = area.split(' - ').map((p) => (p || '').trim());

    if (parts.length < 2) {
      const hasFormattedVersion = cleanAreas.some(
        (other) =>
          other !== area &&
          other.includes(' - ') &&
          other.toLowerCase().includes(area.toLowerCase())
      );
      if (!hasFormattedVersion && !result.includes(area)) {
        result.push(area);
      }
      return;
    }

    const levelKey = `${parts[0].toUpperCase()} - ${parts[1].toUpperCase()}`;

    if (generalLevels.has(levelKey) && (parts[1].toUpperCase() === 'SECUNDARIA' || parts[1].toUpperCase() === 'AVANZADO')) {
      if (!addedGeneralKeys.has(levelKey)) {
        addedGeneralKeys.add(levelKey);
        result.push(`${parts[0]} - ${parts[1]} - General`);
      }
    } else {
      if (!result.includes(area)) {
        result.push(area);
      }
    }
  });

  // Tomar hasta 2 especialidades máximo
  return result.slice(0, 2);
}

export interface DocenteAccessCheckResult {
  hasAccess: boolean;
  docenteAreas: string[];
  evaluationLabel: string;
}

/**
 * Verifica si un docente tiene acceso autorizado para visualizar o descargar una evaluación según sus especialidades asignadas.
 */
export function checkDocenteSpecialtyAccess(
  docenteSession: any,
  evaluacion: any,
  isAdmin: boolean = false
): DocenteAccessCheckResult {
  // 1. Si es Administrador -> Acceso Total
  if (isAdmin) {
    return { hasAccess: true, docenteAreas: ['Acceso Total Administrador'], evaluationLabel: '' };
  }

  // 2. Si no hay sesión docente -> No tiene acceso
  if (!docenteSession) {
    return { hasAccess: false, docenteAreas: [], evaluationLabel: '' };
  }

  // Si rol es SUPERADMIN o ADMIN en docenteSession -> Acceso Total
  const rol = (docenteSession.rol || '').toUpperCase();
  if (rol === 'SUPERADMIN' || rol === 'ADMINISTRADOR') {
    return { hasAccess: true, docenteAreas: ['Acceso Total'], evaluationLabel: '' };
  }

  // Extraer áreas asignadas al docente con sanitización completa
  let areas: string[] = [];
  if (Array.isArray(docenteSession.areas)) {
    areas = docenteSession.areas
      .map((a: any) => (a !== null && a !== undefined ? String(a).trim() : ''))
      .filter(Boolean);
  } else if (typeof docenteSession.areas === 'string' && docenteSession.areas.trim()) {
    try {
      const parsed = JSON.parse(docenteSession.areas);
      if (Array.isArray(parsed)) {
        areas = parsed
          .map((a: any) => (a !== null && a !== undefined ? String(a).trim() : ''))
          .filter(Boolean);
      } else if (parsed) {
        areas = [String(parsed).trim()].filter(Boolean);
      }
    } catch {
      areas = [docenteSession.areas.trim()].filter(Boolean);
    }
  }

  // Si el docente tiene la insignia de Acceso Total
  if (
    areas.some((a) => {
      const aLower = String(a || '').toLowerCase();
      return aLower.includes('acceso total') || aLower.includes('todas');
    })
  ) {
    return { hasAccess: true, docenteAreas: areas, evaluationLabel: '' };
  }

  // Si el docente no tiene áreas registradas pero tiene modalidad/nivel principal
  if (areas.length === 0 && docenteSession.modalidad && docenteSession.nivel) {
    areas = buildDocenteAccessBadges(String(docenteSession.modalidad || ''), String(docenteSession.nivel || ''));
  }

  if (!evaluacion) {
    return { hasAccess: true, docenteAreas: areas, evaluationLabel: '' };
  }

  const evalMod = String(evaluacion.modalidad || 'EBR').trim().toUpperCase();
  const evalNiv = String(evaluacion.nivel || 'INICIAL').trim().toUpperCase();
  const rawEvalArea = String(evaluacion.especialidad || evaluacion.area || (evaluacion as any).titulo || '').trim();
  const evalAreaNorm = rawEvalArea.toLowerCase();

  // Etiqueta legible de la evaluación objetivo
  const evalAreaClean = rawEvalArea
    .replace(/^AIP\s*\/\s*Aula de Innovaci[oó]n Pedag[oó]gica/gi, 'Profesor de Innovación Pedagógica')
    .replace(/Aula de Innovaci[oó]n Pedag[oó]gica/gi, 'Profesor de Innovación Pedagógica')
    .replace(/^AIP\s*\/\s*/gi, '')
    .replace(/NO_APLICA\s*[-•]?\s*/gi, '')
    .replace(/No Aplica \/ Cargos Directivos\s*[-•]?\s*/gi, '')
    .replace(/No Aplica\s*[-•]?\s*/gi, '')
    .trim();

  const evaluationLabel = `${evalMod} - ${evalNiv}${evalAreaClean && !evalAreaClean.toLowerCase().includes('no aplica') && evalAreaClean.toLowerCase() !== evalNiv.toLowerCase() ? ` - ${evalAreaClean}` : ''}`;

  const evalTitleNorm = String((evaluacion as any).titulo || '').toLowerCase();
  const evalTipoCuadernilloNorm = String((evaluacion as any).tipoCuadernillo || '').toLowerCase();
  const evalCodigoNorm = String((evaluacion as any).codigoCuadernillo || (evaluacion as any).codigo || (evaluacion as any).mineduCode || '').toUpperCase();

  // Subprueba / Examen de Habilidades Generales (Tronco común de Nombramiento Docente)
  const isHabilidadesGenerales =
    evalTipoCuadernilloNorm.includes('habilidades generales') ||
    evalAreaNorm.includes('habilidades generales') ||
    evalTitleNorm.includes('habilidades generales') ||
    evalCodigoNorm.startsWith('HG') ||
    evalCodigoNorm.includes('HG01');

  if (isHabilidadesGenerales) {
    return { hasAccess: true, docenteAreas: areas, evaluationLabel };
  }

  // Comprobar coincidencia con las áreas asignadas al docente
  const hasMatch = areas.some((docArea) => {
    const cleanDocArea = String(docArea || '').trim();
    if (!cleanDocArea) return false;

    const cleanDocAreaUpper = cleanDocArea.toUpperCase();
    const parts = cleanDocArea.split(' - ').map((p) => (p || '').trim());

    if (parts.length < 2) {
      // Coincidencia por texto simple
      return cleanDocAreaUpper.includes(evalMod) && cleanDocAreaUpper.includes(evalNiv);
    }

    const docMod = (parts[0] || '').toUpperCase();
    const docNiv = (parts[1] || '').toUpperCase();
    const docEsp = parts[2] ? parts[2].trim() : '';

    // Misma modalidad requerida
    if (docMod !== evalMod) return false;

    // 1. Nivel Inicial (EBR Inicial, EBE Inicial)
    if (evalNiv === 'INICIAL') {
      return docNiv.includes('INICIAL');
    }

    // 2. Nivel EBA Inicial-Intermedio
    if (evalMod === 'EBA' && (evalNiv.includes('INICIAL') || evalNiv.includes('INTERMEDIO'))) {
      return docNiv.includes('INICIAL') || docNiv.includes('INTERMEDIO');
    }

    // 3. Nivel Primaria (EBR Primaria)
    if (evalMod === 'EBR' && evalNiv === 'PRIMARIA') {
      if (!docNiv.includes('PRIMARIA')) return false;

      // Si el docente tiene "EBR - Primaria" o "EBR - Primaria - General" -> Acceso a todo Primaria
      if (!docEsp || docEsp.toLowerCase() === 'general' || docEsp.toLowerCase() === 'primaria') {
        return true;
      }

      // Habilidades Generales accesible para cualquier docente con acceso a Primaria
      if (evalAreaNorm.includes('habilidades generales') || evalAreaNorm.includes('general')) {
        return true;
      }

      // Especialidades específicas (Educación Física, Innovación Pedagógica, etc.)
      const docEspNorm = docEsp.toLowerCase();
      if (docEspNorm.includes('física') && evalAreaNorm.includes('física')) return true;
      if ((docEspNorm.includes('innovación') || docEspNorm.includes('pip') || docEspNorm.includes('aip')) &&
          (evalAreaNorm.includes('innovación') || evalAreaNorm.includes('pip') || evalAreaNorm.includes('aip'))) return true;

      // Si la especialidad del examen es regular Primaria
      if (docEspNorm === 'primaria' && (evalAreaNorm === 'primaria' || evalAreaNorm.includes('conocimientos curriculares'))) return true;

      return docEspNorm === evalAreaNorm;
    }

    // 4. Nivel Secundaria (EBR Secundaria o EBA Avanzado)
    if (evalMod === 'EBR' && evalNiv === 'SECUNDARIA') {
      if (!docNiv.includes('SECUNDARIA')) return false;

      // Si el docente tiene General Secundaria -> Acceso a todas las áreas de Secundaria
      if (!docEsp || docEsp.toLowerCase() === 'general') {
        return true;
      }

      // Habilidades Generales accesible para cualquier docente con acceso a Secundaria
      if (evalAreaNorm.includes('habilidades generales') || evalAreaNorm.includes('general')) {
        return true;
      }

      // Innovación Pedagógica en Secundaria (AIP / PIP)
      const docEspNorm = docEsp.toLowerCase();
      if ((docEspNorm.includes('innovación') || docEspNorm.includes('pip') || docEspNorm.includes('aip')) &&
          (evalAreaNorm.includes('innovación') || evalAreaNorm.includes('pip') || evalAreaNorm.includes('aip'))) {
        return true;
      }

      // Educación Física en Secundaria
      if (docEspNorm.includes('física') && evalAreaNorm.includes('física')) {
        return true;
      }

      // Mapeo canónico de especialidad en Secundaria
      const docEspResolved = cleanAndResolveEspecialidades('EBR', 'SECUNDARIA', docEsp);
      const evalEspResolved = cleanAndResolveEspecialidades('EBR', 'SECUNDARIA', rawEvalArea);

      return docEspResolved.some((de) => evalEspResolved.includes(de) || evalAreaNorm.includes(de.toLowerCase()));
    }

    // 5. EBA Avanzado
    if (evalMod === 'EBA' && evalNiv === 'AVANZADO') {
      if (!docNiv.includes('AVANZADO')) return false;
      if (!docEsp || docEsp.toLowerCase() === 'general') return true;
      if (evalAreaNorm.includes('habilidades generales') || evalAreaNorm.includes('general')) return true;
      const docEspResolved = cleanAndResolveEspecialidades('EBA', 'AVANZADO', docEsp);
      const evalEspResolved = cleanAndResolveEspecialidades('EBA', 'AVANZADO', rawEvalArea);
      return docEspResolved.some((de) => evalEspResolved.includes(de) || evalAreaNorm.includes(de.toLowerCase()));
    }

    // 6. EBE / CETPRO
    if (evalMod === 'EBE' || evalMod === 'CETPRO') {
      return docMod === evalMod;
    }

    // Coincidencia genérica
    return docMod === evalMod && docNiv === evalNiv;
  });

  return {
    hasAccess: hasMatch,
    docenteAreas: areas,
    evaluationLabel,
  };
}

