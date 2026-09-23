// src/services/evaluacionesService.ts
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/services/adminService';
import { readAnySession } from '@/lib/serverSession';
import { checkDocenteSpecialtyAccess } from '@/utils/badgeUtils';
import {
  evaluacionesFilterSchema,
  matchesEvaluationFilters,
} from '@/lib/evaluacionFilters';
import {
  Evaluacion,
  EvaluacionesFilterParams,
  ProcesoMinedu,
  ModalidadEducativa,
  NivelEducativo,
  EvaluacionMasivaInput,
  getEvaluacionSignature,
} from '@/types/evaluacion';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const DEFAULT_ANIOS = ['2025', '2024', '2023', '2022', '2021', '2019', '2018', '2017', '2015', '2014'];

function cleanNoAplicaStr(str?: string): string {
  if (!str) return '';
  return str
    .replace(/NO_APLICA\s*[-•]?\s*/gi, '')
    .replace(/No Aplica \/ Cargos Directivos\s*[-•]?\s*/gi, '')
    .replace(/No Aplica\s*[-•]?\s*/gi, '')
    .trim();
}

function getExtensionFromMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('spreadsheetml') || m.includes('excel') || m.includes('sheet')) return '.xlsx';
  if (m.includes('wordprocessingml') || m.includes('msword') || m.includes('document')) return '.docx';
  if (m.includes('presentationml') || m.includes('powerpoint')) return '.pptx';
  if (m.includes('csv')) return '.csv';
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  return '.pdf';
}

function saveBase64ToFile(base64Data: string, subfolder: string, prefix: string): string {
  if (!base64Data || !base64Data.startsWith('data:')) {
    return base64Data;
  }

  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64Data;
  }

  try {
    const mimeType = matches[1];
    const ext = getExtensionFromMime(mimeType);
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, buffer);

    return `/uploads/${subfolder}/${filename}`;
  } catch {
    console.log('⚡ [STORAGE] Guardando Data URL directamente.');
    return base64Data;
  }
}

export async function getAniosAction(
  filters?: EvaluacionesFilterParams
): Promise<ActionResponse<string[]>> {
  try {
    const parsedFilters = evaluacionesFilterSchema.safeParse(filters ?? {});
    if (!parsedFilters.success) {
      return {
        success: false,
        error: { code: 'INVALID_FILTERS', message: 'Los filtros seleccionados no son válidos.' },
      };
    }

    const validFilters: EvaluacionesFilterParams = parsedFilters.data;

    // Si no se envían filtros (ej: Admin para crear examen o vista general), devolver todos los años registrados
    if (!filters || (!validFilters.proceso && !validFilters.modalidad && !validFilters.nivel && !validFilters.especialidad)) {
      const dbAnios = await prisma.anioClasificacion.findMany({
        orderBy: { anio: 'desc' },
      });

      const evalAnios = await prisma.evaluacion.findMany({
        select: { anio: true },
        distinct: ['anio'],
      });

      const setAnios = new Set<string>();
      dbAnios.forEach((a) => {
        if (a.anio) setAnios.add(String(a.anio).trim());
      });
      evalAnios.forEach((e) => {
        if (e.anio) setAnios.add(String(e.anio).trim());
      });

      const list = Array.from(setAnios)
        .filter((y) => y.length > 0 && !isNaN(Number(y)))
        .sort((a, b) => Number(b) - Number(a));

      if (list.length > 0) {
        return { success: true, data: list };
      }
      return { success: true, data: DEFAULT_ANIOS };
    }

    // La lista de años usa el mismo predicado estricto que las tarjetas. De este
    // modo Habilidades Generales nunca incorpora años de otra especialidad.
    const candidates = await prisma.evaluacion.findMany({
      where: {
        estado: 'PUBLICADO',
        AND: [
          { urlCuadernillo: { not: null } },
          { urlCuadernillo: { not: '' } },
          { NOT: { urlCuadernillo: { contains: 'ejemplo.pdf' } } },
        ],
      },
      select: {
        proceso: true,
        modalidad: true,
        nivel: true,
        area: true,
        anio: true,
      },
    });

    const filtersWithoutYear: EvaluacionesFilterParams = {
      ...validFilters,
      anio: '',
      searchQuery: '',
      includeDrafts: false,
    };

    const list = Array.from(new Set(candidates
      .filter((item) => matchesEvaluationFilters(item, filtersWithoutYear))
      .map((e) => String(e.anio).trim())
      .filter((y) => y.length > 0 && !Number.isNaN(Number(y)))))
      .sort((a, b) => Number(b) - Number(a));

    return { success: true, data: list };
  } catch (error) {
    console.error('Error al obtener años dinámicos:', error);
    return { success: true, data: [] };
  }
}

export async function createAnioAction(anio: string): Promise<ActionResponse<{ anio: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const trimmed = (anio || '').trim();
    if (!trimmed) {
      return { success: false, error: { code: 'INVALID_ANIO', message: 'Ingresa un año válido.' } };
    }

    const exists = await prisma.anioClasificacion.findUnique({
      where: { anio: trimmed },
    });

    if (exists) {
      return { success: false, error: { code: 'DUPLICATE_ANIO', message: `El año ${trimmed} ya se encuentra registrado.` } };
    }

    await prisma.anioClasificacion.create({
      data: { anio: trimmed },
    });

    revalidatePath('/admin');
    return { success: true, data: { anio: trimmed } };
  } catch (error: any) {
    console.error('❌ [CREATE ANIO ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: 'Error al registrar el año.' } };
  }
}

export async function deleteAnioAction(anio: string): Promise<ActionResponse<{ anio: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const trimmed = (anio || '').trim();
    if (!trimmed) {
      return { success: false, error: { code: 'INVALID_ANIO', message: 'Año no válido.' } };
    }

    await prisma.anioClasificacion.deleteMany({
      where: { anio: trimmed },
    });

    revalidatePath('/admin');
    return { success: true, data: { anio: trimmed } };
  } catch (error: any) {
    console.error('❌ [DELETE ANIO ERROR]:', error);
    return { success: false, error: { code: 'DELETE_FAILED', message: 'Error al eliminar el año.' } };
  }
}

export async function createEvaluacionAction(data: {
  proceso: string;
  modalidad: string;
  nivel: string;
  area: string;
  tipoCuadernillo?: string;
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
}): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const cuadernilloPath = data.urlCuadernillo ? saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo') : null;
    const resolucionPath = data.urlResolucion ? saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion') : null;
    const clavesPath = data.urlClaves ? saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves') : null;

    const isDirectivos = data.proceso === 'ACCESO_CARGOS_DIRECTIVOS';
    const isNivelValido = data.nivel && data.nivel.toUpperCase() !== 'NO_APLICA' && !data.nivel.toLowerCase().includes('no aplica');
    const hasAreaEspecifica = data.area && data.area !== 'NO_APLICA' && data.area !== 'General';
    const tituloGenerado = isDirectivos
      ? `Acceso a Cargos Directivos y Especialistas ${data.anio} - ${data.area || 'Directivos y Especialistas'}`
      : isNivelValido
      ? (hasAreaEspecifica
          ? `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.nivel} ${data.area}`
          : `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.nivel}`)
      : `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.area || data.modalidad}`;

    const existing = await prisma.evaluacion.findFirst({
      where: {
        proceso: data.proceso,
        modalidad: data.modalidad || undefined,
        nivel: data.nivel || undefined,
        area: data.area || undefined,
        anio: data.anio,
        tipoCuadernillo: data.tipoCuadernillo || undefined,
      },
    });

    let targetId: string;
    if (existing) {
      const updated = await prisma.evaluacion.update({
        where: { id: existing.id },
        data: {
          titulo: tituloGenerado,
          urlCuadernillo: cuadernilloPath || existing.urlCuadernillo,
          urlResolucion: resolucionPath || existing.urlResolucion,
          urlClaves: clavesPath || existing.urlClaves,
          origenCuadernillo: data.origenCuadernillo || existing.origenCuadernillo,
          origenResolucion: data.origenResolucion || existing.origenResolucion,
          origenClaves: data.origenClaves || existing.origenClaves,
          codigoCuadernillo: data.codigoCuadernillo || existing.codigoCuadernillo,
          codigoResolucion: data.codigoResolucion || existing.codigoResolucion,
          codigoClaves: data.codigoClaves || existing.codigoClaves,
          estado: data.estado || existing.estado,
          esPremium: Boolean(data.esPremium),
        } as any,
      });
      targetId = updated.id;
    } else {
      const created = await prisma.evaluacion.create({
        data: {
          titulo: tituloGenerado,
          proceso: data.proceso,
          modalidad: data.modalidad,
          nivel: data.nivel,
          area: data.area,
          tipoCuadernillo: data.tipoCuadernillo || null,
          anio: data.anio,
          urlCuadernillo: cuadernilloPath,
          urlResolucion: resolucionPath,
          urlClaves: clavesPath,
          origenCuadernillo: data.origenCuadernillo || 'MINEDU',
          origenResolucion: data.origenResolucion || 'AVEND',
          origenClaves: data.origenClaves || 'MINEDU',
          codigoCuadernillo: data.codigoCuadernillo || null,
          codigoResolucion: data.codigoResolucion || null,
          codigoClaves: data.codigoClaves || null,
          estado: data.estado || 'BORRADOR',
          esPremium: Boolean(data.esPremium),
        } as any,
      });
      targetId = created.id;
    }

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id: targetId } };
  } catch (error: any) {
    console.error('❌ [CREATE EVALUACION ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: `Error al registrar la evaluación: ${error?.message || error}` } };
  }
}

export async function createEvaluacionesMasivasAction(
  data: EvaluacionMasivaInput
): Promise<ActionResponse<{ count: number }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    // 1. Guardar el PDF FÍSICO UNA SOLA VEZ para no duplicar almacenamiento
    const cuadernilloPath = data.urlCuadernillo ? saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo') : null;
    const resolucionPath = data.urlResolucion ? saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion') : null;
    const clavesPath = data.urlClaves ? saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves') : null;

    let createdCount = 0;

    // 2. Iterar y crear/actualizar en PostgreSQL
    for (const cat of data.categorias) {
      const isNivelValido = cat.nivel && cat.nivel.toUpperCase() !== 'NO_APLICA' && !cat.nivel.toLowerCase().includes('no aplica');
      const hasAreaEspecifica = cat.area && cat.area !== 'NO_APLICA' && cat.area !== 'General';
      const tituloGenerado = isNivelValido
        ? (hasAreaEspecifica
            ? `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.tipoCuadernillo} - ${cat.nivel} ${cat.area}`
            : `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.tipoCuadernillo} - ${cat.nivel}`)
        : `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.tipoCuadernillo} - ${cat.area || cat.modalidad}`;

      const existing = await prisma.evaluacion.findFirst({
        where: {
          proceso: data.proceso,
          modalidad: cat.modalidad,
          nivel: cat.nivel,
          area: cat.area,
          anio: data.anio,
          tipoCuadernillo: data.tipoCuadernillo,
        },
      });

      if (existing) {
        await prisma.evaluacion.update({
          where: { id: existing.id },
          data: {
            titulo: tituloGenerado.trim(),
            urlCuadernillo: cuadernilloPath || existing.urlCuadernillo,
            urlResolucion: resolucionPath || existing.urlResolucion,
            urlClaves: clavesPath || existing.urlClaves,
            codigoCuadernillo: data.codigoCuadernillo || existing.codigoCuadernillo,
            codigoResolucion: data.codigoResolucion || existing.codigoResolucion,
            codigoClaves: data.codigoClaves || existing.codigoClaves,
            origenCuadernillo: data.origenCuadernillo || existing.origenCuadernillo,
            origenResolucion: data.origenResolucion || existing.origenResolucion,
            origenClaves: data.origenClaves || existing.origenClaves,
            estado: data.estado || existing.estado,
            esPremium: Boolean(data.esPremium),
          } as any,
        });
      } else {
        await prisma.evaluacion.create({
          data: {
            titulo: tituloGenerado.trim(),
            proceso: data.proceso,
            modalidad: cat.modalidad,
            nivel: cat.nivel,
            area: cat.area,
            tipoCuadernillo: data.tipoCuadernillo,
            anio: data.anio,
            urlCuadernillo: cuadernilloPath,
            urlResolucion: resolucionPath,
            urlClaves: clavesPath,
            codigoCuadernillo: data.codigoCuadernillo || null,
            codigoResolucion: data.codigoResolucion || null,
            codigoClaves: data.codigoClaves || null,
            origenCuadernillo: data.origenCuadernillo || 'MINEDU',
            origenResolucion: data.origenResolucion || 'AVEND',
            origenClaves: data.origenClaves || 'MINEDU',
            estado: data.estado || 'PUBLICADO',
            esPremium: Boolean(data.esPremium),
          } as any,
        });
      }
      createdCount++;
    }

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { count: createdCount } };
  } catch (error: any) {
    console.error('❌ [CREATE EVALUACIONES MASIVAS ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: error?.message || 'Error al guardar asignaciones transversales.' } };
  }
}

// Sincronizar exámenes sin Cuadernillo o sin Claves a estado BORRADOR sin borrar ningún registro
export async function regularizarEstadosExamenesAction(): Promise<ActionResponse<{ count: number }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const res = await prisma.evaluacion.updateMany({
      where: {
        OR: [
          { urlCuadernillo: null },
          { urlCuadernillo: '' },
          { urlCuadernillo: { contains: 'ejemplo.pdf' } },
          { urlClaves: null },
          { urlClaves: '' },
        ],
        estado: 'PUBLICADO',
      },
      data: {
        estado: 'BORRADOR',
      },
    });
    if (res.count > 0) {
      invalidateEvaluacionesCache();
      revalidatePath('/admin');
      revalidatePath('/cuadernillos');
    }
    return { success: true, data: { count: res.count } };
  } catch (error: any) {
    console.error('❌ [REGULARIZAR ESTADOS ERROR]:', error);
    return { success: false, error: { code: 'REGULARIZAR_FAILED', message: error?.message || 'Error al regularizar estados.' } };
  }
}

export async function setEvaluacionEstadoAction(id: string, estado: 'PUBLICADO' | 'BORRADOR'): Promise<ActionResponse<{ estado: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    if (estado === 'PUBLICADO') {
      const current = await prisma.evaluacion.findUnique({ where: { id } });
      const hasCuadernillo = Boolean(
        current?.urlCuadernillo &&
        current.urlCuadernillo.trim() &&
        !current.urlCuadernillo.includes('ejemplo.pdf')
      );
      const hasClaves = Boolean(
        current?.urlClaves &&
        current.urlClaves.trim()
      );

      if (!hasCuadernillo) {
        return {
          success: false,
          error: {
            code: 'NO_CUADERNILLO',
            message: '⚠️ Para publicar en el catálogo docente, es obligatorio adjuntar el archivo del Cuadernillo.',
          },
        };
      }
    }

    await prisma.evaluacion.update({
      where: { id },
      data: { estado } as any,
    });

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { estado } };
  } catch (error: any) {
    console.error('❌ [SET ESTADO ERROR]:', error);
    return { success: false, error: { code: 'UPDATE_FAILED', message: error?.message || 'Error al actualizar estado.' } };
  }
}

export async function updateEvaluacionesEstadoMasivoAction(
  ids: string[],
  estado: 'PUBLICADO' | 'BORRADOR'
): Promise<ActionResponse<{ count: number }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    let idsToUpdate = ids;
    if (estado === 'PUBLICADO') {
      const validExams = await prisma.evaluacion.findMany({
        where: {
          id: { in: ids },
          AND: [
            { urlCuadernillo: { not: null } },
            { urlCuadernillo: { not: '' } },
            { NOT: { urlCuadernillo: { contains: 'ejemplo.pdf' } } },
          ],
        },
        select: { id: true },
      });
      idsToUpdate = validExams.map((e) => e.id);
      if (idsToUpdate.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_VALID_EXAMS',
            message: '⚠️ Ninguno de los exámenes seleccionados cuenta con el archivo de Cuadernillo para ser publicado.',
          },
        };
      }
    }

    const res = await prisma.evaluacion.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { estado } as any,
    });

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { count: res.count } };
  } catch (error: any) {
    console.error('❌ [UPDATE ESTADO MASIVO ERROR]:', error);
    return { success: false, error: { code: 'BULK_UPDATE_FAILED', message: error?.message || 'Error al actualizar estados en lote.' } };
  }
}

export async function toggleEvaluacionEstadoAction(id: string): Promise<ActionResponse<{ estado: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const current = await prisma.evaluacion.findUnique({ where: { id } });
    if (!current) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Evaluación no encontrada.' } };
    }

    const currentEstado = (current as any).estado || 'BORRADOR';
    const newEstado = currentEstado === 'BORRADOR' ? 'PUBLICADO' : 'BORRADOR';

    if (newEstado === 'PUBLICADO') {
      const hasCuadernillo = Boolean(
        current.urlCuadernillo &&
        current.urlCuadernillo.trim() &&
        !current.urlCuadernillo.includes('ejemplo.pdf')
      );

      if (!hasCuadernillo) {
        return {
          success: false,
          error: {
            code: 'NO_CUADERNILLO',
            message: '⚠️ Para publicar en el catálogo docente, es obligatorio adjuntar el archivo del Cuadernillo.',
          },
        };
      }
    }

    await prisma.evaluacion.update({
      where: { id },
      data: { estado: newEstado } as any,
    });

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { estado: newEstado } };
  } catch (error: any) {
    console.error('❌ [TOGGLE ESTADO ERROR]:', error);
    return { success: false, error: { code: 'UPDATE_FAILED', message: error?.message || 'Error al cambiar estado.' } };
  }
}

export async function deleteEvaluacionAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    await prisma.evaluacion.delete({ where: { id } });
    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ [DELETE EVALUACION ERROR]:', error);
    return { success: false, error: { code: 'DELETE_FAILED', message: error?.message || 'Error al eliminar evaluación.' } };
  }
}

export async function deleteEvaluacionesMasivasAction(
  ids: string[]
): Promise<ActionResponse<{ count: number }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    if (!ids || ids.length === 0) {
      return { success: true, data: { count: 0 } };
    }
    const result = await prisma.evaluacion.deleteMany({
      where: { id: { in: ids } },
    });
    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { count: result.count } };
  } catch (error: any) {
    console.error('❌ [DELETE MASIVO ERROR]:', error);
    return {
      success: false,
      error: { code: 'DELETE_MASIVO_FAILED', message: error?.message || 'Error al eliminar evaluaciones seleccionadas.' },
    };
  }
}

// Server Action para obtener la firma de comparación
export async function getEvaluacionSignatureAction(item: {
  proceso: string;
  modalidad: string;
  nivel?: string | null;
  area: string;
  anio: string | number;
  tipoCuadernillo?: string | null;
}): Promise<string> {
  return getEvaluacionSignature(item);
}

// Limpieza segura de duplicados reales existentes (coincidencia del 100% en los 6 campos clave)
export async function depurarDuplicadosEvaluacionesAction(): Promise<
  ActionResponse<{ gruposAnalizados: number; duplicadosEliminados: number; fusionados: number }>
> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const allRecords = await prisma.evaluacion.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const groups = new Map<string, typeof allRecords>();

    for (const record of allRecords) {
      const sig = getEvaluacionSignature({
        proceso: record.proceso,
        modalidad: record.modalidad,
        nivel: record.nivel,
        area: record.area,
        anio: record.anio,
        tipoCuadernillo: record.tipoCuadernillo,
      });

      if (!groups.has(sig)) {
        groups.set(sig, []);
      }
      groups.get(sig)!.push(record);
    }

    let duplicadosEliminados = 0;
    let fusionados = 0;

    for (const [_, group] of groups.entries()) {
      if (group.length <= 1) continue;

      // Ordenar: el que tenga más archivos físicos válidos va primero como principal
      const score = (r: typeof allRecords[0]) => {
        let count = 0;
        if (r.urlCuadernillo && r.urlCuadernillo.trim() && !r.urlCuadernillo.includes('ejemplo.pdf')) count += 4;
        if (r.urlResolucion && r.urlResolucion.trim() && !r.urlResolucion.includes('ejemplo.pdf')) count += 2;
        if (r.urlClaves && r.urlClaves.trim() && !r.urlClaves.includes('ejemplo.pdf')) count += 2;
        if (r.estado === 'PUBLICADO') count += 1;
        return count;
      };

      group.sort((a, b) => score(b) - score(a));
      const principal = group[0];
      const secundarios = group.slice(1);

      // Fusión no destructiva: si a principal le falta algún documento y secundario lo tiene, heredar
      let urlCuadernilloFinal = principal.urlCuadernillo;
      let urlResolucionFinal = principal.urlResolucion;
      let urlClavesFinal = principal.urlClaves;
      let codigoCuadernilloFinal = principal.codigoCuadernillo;
      let codigoResolucionFinal = principal.codigoResolucion;
      let codigoClavesFinal = principal.codigoClaves;
      let estadoFinal = principal.estado;

      for (const sec of secundarios) {
        if ((!urlCuadernilloFinal || urlCuadernilloFinal.includes('ejemplo.pdf')) && sec.urlCuadernillo && !sec.urlCuadernillo.includes('ejemplo.pdf')) {
          urlCuadernilloFinal = sec.urlCuadernillo;
        }
        if ((!urlResolucionFinal || urlResolucionFinal.includes('ejemplo.pdf')) && sec.urlResolucion && !sec.urlResolucion.includes('ejemplo.pdf')) {
          urlResolucionFinal = sec.urlResolucion;
        }
        if ((!urlClavesFinal || urlClavesFinal.includes('ejemplo.pdf')) && sec.urlClaves && !sec.urlClaves.includes('ejemplo.pdf')) {
          urlClavesFinal = sec.urlClaves;
        }
        if (!codigoCuadernilloFinal && sec.codigoCuadernillo) {
          codigoCuadernilloFinal = sec.codigoCuadernillo;
        }
        if (!codigoResolucionFinal && sec.codigoResolucion) {
          codigoResolucionFinal = sec.codigoResolucion;
        }
        if (!codigoClavesFinal && sec.codigoClaves) {
          codigoClavesFinal = sec.codigoClaves;
        }
        if (estadoFinal !== 'PUBLICADO' && sec.estado === 'PUBLICADO') {
          estadoFinal = 'PUBLICADO';
        }
      }

      await prisma.evaluacion.update({
        where: { id: principal.id },
        data: {
          urlCuadernillo: urlCuadernilloFinal,
          urlResolucion: urlResolucionFinal,
          urlClaves: urlClavesFinal,
          codigoCuadernillo: codigoCuadernilloFinal,
          codigoResolucion: codigoResolucionFinal,
          codigoClaves: codigoClavesFinal,
          estado: estadoFinal,
        } as any,
      });

      const idsToDelete = secundarios.map((s) => s.id);
      if (idsToDelete.length > 0) {
        await prisma.evaluacion.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        duplicadosEliminados += idsToDelete.length;
        fusionados++;
      }
    }

    if (duplicadosEliminados > 0) {
      invalidateEvaluacionesCache();
      revalidatePath('/admin');
      revalidatePath('/cuadernillos');
    }

    return {
      success: true,
      data: {
        gruposAnalizados: groups.size,
        duplicadosEliminados,
        fusionados,
      },
    };
  } catch (error: any) {
    console.error('❌ [DEPURAR DUPLICADOS ERROR]:', error);
    return {
      success: false,
      error: { code: 'DEPURAR_ERROR', message: error?.message || 'Error al depurar duplicados.' },
    };
  }
}

let evaluacionesCache: { timestamp: number; data: Evaluacion[] } | null = null;
const CACHE_TTL_MS = 60000;

export async function invalidateEvaluacionesCache() {
  evaluacionesCache = null;
}

export async function getEvaluacionesAction(
  inputFilters: EvaluacionesFilterParams
): Promise<ActionResponse<Evaluacion[]>> {
  try {
    const parsedFilters = evaluacionesFilterSchema.safeParse(inputFilters);
    if (!parsedFilters.success) {
      return {
        success: false,
        error: { code: 'INVALID_FILTERS', message: 'Los filtros seleccionados no son válidos.' },
      };
    }

    const filters: EvaluacionesFilterParams = parsedFilters.data;
    if (filters.includeDrafts && !(await verifyAdminSession())) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' },
      };
    }

    const now = Date.now();
    let allEvaluaciones: Evaluacion[];

    // Si la consulta viene del panel admin (includeDrafts = true), omitir cache para obtener datos frescos al instante
    const shouldBypassCache = Boolean(filters.includeDrafts);

    if (!shouldBypassCache && evaluacionesCache && (now - evaluacionesCache.timestamp < CACHE_TTL_MS)) {
      allEvaluaciones = evaluacionesCache.data;
    } else {
      const dbEvaluaciones = await prisma.evaluacion.findMany({
        select: {
          id: true,
          titulo: true,
          proceso: true,
          modalidad: true,
          nivel: true,
          area: true,
          tipoCuadernillo: true,
          anio: true,
          urlCuadernillo: true,
          urlResolucion: true,
          urlClaves: true,
          origenCuadernillo: true,
          origenResolucion: true,
          origenClaves: true,
          codigoCuadernillo: true,
          codigoResolucion: true,
          codigoClaves: true,
          estado: true,
          esPremium: true,
          createdAt: true,
        },
        orderBy: [
          { anio: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      allEvaluaciones = dbEvaluaciones.map((item) => {
        const rawArea = item.area || '';
        const isAipOrInnovacion = rawArea.toLowerCase().includes('innovaci') || rawArea.toLowerCase().includes('aip') || rawArea.toLowerCase().includes('aula de innovaci');
        const canonicalArea = isAipOrInnovacion ? 'Profesor de Innovación Pedagógica' : rawArea;

        const isNivelValido = item.nivel && item.nivel.toUpperCase() !== 'NO_APLICA' && !item.nivel.toLowerCase().includes('no aplica');
        const labelLimpia = isNivelValido ? `${item.nivel} - ${canonicalArea}` : canonicalArea;

        const procesoRegistrado = item.proceso as ProcesoMinedu;

        const customCodigo = item.codigoCuadernillo?.trim() || '';

        return {
          id: item.id,
          mineduCode: customCodigo,
          codigo: customCodigo,
          titulo: cleanNoAplicaStr(item.titulo) || (procesoRegistrado === 'ACCESO_CARGOS_DIRECTIVOS' ? `Acceso a Cargos Directivos y Especialistas ${item.anio} - ${cleanNoAplicaStr(canonicalArea) || 'Directivos y Especialistas'}` : `Prueba Única Nacional ${procesoRegistrado} ${item.anio} - ${cleanNoAplicaStr(canonicalArea)}`),
          proceso: procesoRegistrado,
          modalidad: item.modalidad as ModalidadEducativa,
          nivel: item.nivel as NivelEducativo,
          especialidad: canonicalArea,
          especialidadLabel: labelLimpia,
          tipoCuadernillo: item.tipoCuadernillo || undefined,
          codigoCuadernillo: item.codigoCuadernillo || undefined,
          codigoResolucion: item.codigoResolucion || undefined,
          codigoClaves: item.codigoClaves || undefined,
          estado: (item as any).estado || 'BORRADOR',
          anio: Number(item.anio) || 2024,
          isLatest: true,
          resources: {
            cuadernilloKey: sanitizeDocKey(item.urlCuadernillo),
            resolucionKey: sanitizeDocKey(item.urlResolucion),
            clavesKey: sanitizeDocKey(item.urlClaves),
            origenCuadernillo: item.origenCuadernillo || 'MINEDU',
            origenResolucion: item.origenResolucion || 'AVEND',
            origenClaves: item.origenClaves || 'MINEDU',
            codigoCuadernillo: item.codigoCuadernillo || undefined,
            codigoResolucion: item.codigoResolucion || undefined,
            codigoClaves: item.codigoClaves || undefined,
          },
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.createdAt.toISOString(),
        };
      });

      evaluacionesCache = { timestamp: now, data: allEvaluaciones };
    }

    // Filtrado ultrarrápido en memoria (<1ms)
    let filteredList = allEvaluaciones;

    // Filtrado para catálogo docente: solo exámenes PUBLICADOS que tengan su Cuadernillo PDF disponible
    if (!filters.includeDrafts) {
      filteredList = filteredList.filter((e) => {
        const isPublicado = (e as any).estado === 'PUBLICADO';
        const tieneCuadernillo = Boolean(
          (e.resources?.cuadernilloKey && e.resources.cuadernilloKey.trim()) ||
          ((e as any).urlCuadernillo && String((e as any).urlCuadernillo).trim())
        );
        return isPublicado && tieneCuadernillo;
      });
    }

    // Todos los criterios principales son acumulativos. El tipo de cuadernillo
    // (incluido Habilidades Generales) nunca puede omitir la especialidad.
    filteredList = filteredList.filter((evaluation) =>
      matchesEvaluationFilters(evaluation, filters)
    );

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const queryLower = filters.searchQuery.trim().toLowerCase();
      filteredList = filteredList.filter((e) => {
        const espLower = (e.especialidad || '').toLowerCase();
        const titleLower = (e.titulo || '').toLowerCase();
        const codeLower = (e.codigoCuadernillo || e.mineduCode || '').toLowerCase();
        return espLower.includes(queryLower) || titleLower.includes(queryLower) || codeLower.includes(queryLower);
      });
    }

    // Ordenamiento por defecto (Descending Order):
    // Garantizar que los exámenes de los años más recientes (ej: 2025, 2024, 2023...) aparezcan siempre en las primeras posiciones.
    filteredList = [...filteredList].sort((a, b) => {
      const anioA = Number(a.anio) || 0;
      const anioB = Number(b.anio) || 0;
      if (anioB !== anioA) {
        return anioB - anioA;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return { success: true, data: filteredList };
  } catch (error) {
    console.error('❌ [GET EVALUACIONES ERROR]:', error);
    return { success: true, data: [] };
  }
}

// Función interna para validar que una clave de recurso sea un archivo real y no un placeholder
function sanitizeDocKey(key?: string | null): string | undefined {
  if (!key || !key.trim()) return undefined;
  const clean = key.trim().toLowerCase();
  if (clean.includes('ejemplo.pdf') || clean === 'null' || clean === 'undefined' || clean === 'none') {
    return undefined;
  }
  return key.trim();
}

export async function getResourceSignedUrlAction(
  evaluationId: string,
  resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const session = readAnySession();
    if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida.' } };
    const item = await prisma.evaluacion.findUnique({
      where: { id: evaluationId },
    });

    if (!item) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Evaluación no encontrada.' } };
    }

    const isAdmin = ['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS'].includes(session.role.toUpperCase());
    if (!isAdmin) {
      const docente = await prisma.usuarioDocente.findUnique({ where: { email: session.email } });
      if (!docente || docente.accesoGranted === false || docente.fechaFin <= new Date()) {
        return { success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Tu suscripción no está activa.' } };
      }

      const isAvendResolution =
        resourceType === 'RESOLUCION' &&
        String(item.origenResolucion || 'AVEND').toUpperCase() !== 'MINEDU' &&
        item.proceso !== 'ACCESO_CARGOS_DIRECTIVOS';
      if (isAvendResolution && !checkDocenteSpecialtyAccess(docente, item).hasAccess) {
        return {
          success: false,
          error: { code: 'SPECIALTY_FORBIDDEN', message: 'Este solucionario AVEND no corresponde a tu nivel y especialidad.' },
        };
      }
    }

    const rawKey =
      resourceType === 'CUADERNILLO'
        ? item.urlCuadernillo
        : resourceType === 'RESOLUCION'
        ? item.urlResolucion
        : item.urlClaves;

    const validKey = sanitizeDocKey(rawKey);

    if (!validKey) {
      return {
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'No hay archivo PDF subido para este documento.' },
      };
    }

    return { success: true, data: { signedUrl: validKey } };
  } catch (error: any) {
    console.error('❌ [Signed Url Action Error]:', error);
    return {
      success: false,
      error: { code: 'SIGN_URL_FAILED', message: 'Error al solicitar el enlace.' },
    };
  }
}
