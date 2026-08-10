// src/services/evaluacionesService.ts
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  Evaluacion,
  EvaluacionesFilterParams,
  ProcesoMinedu,
  ModalidadEducativa,
  NivelEducativo,
} from '@/types/evaluacion';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const DEFAULT_ANIOS = ['2024', '2023', '2022', '2021', '2019', '2018', '2014'];

function cleanNoAplicaStr(str?: string): string {
  if (!str) return '';
  return str
    .replace(/NO_APLICA\s*[-•]?\s*/gi, '')
    .replace(/No Aplica \/ Cargos Directivos\s*[-•]?\s*/gi, '')
    .replace(/No Aplica\s*[-•]?\s*/gi, '')
    .trim();
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
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}.pdf`;
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, buffer);

    return `/uploads/${subfolder}/${filename}`;
  } catch {
    console.log('⚡ [VERCEL SERVERLESS] Guardando Data URL en PostgreSQL.');
    return base64Data;
  }
}

export async function getAniosAction(): Promise<ActionResponse<string[]>> {
  try {
    const dbAnios = await prisma.anioClasificacion.findMany({
      orderBy: { anio: 'desc' },
    });

    if (dbAnios && dbAnios.length > 0) {
      const list = dbAnios.map((a) => a.anio);
      return { success: true, data: list };
    }
    return { success: true, data: DEFAULT_ANIOS };
  } catch {
    return { success: true, data: DEFAULT_ANIOS };
  }
}

export async function createAnioAction(anio: string): Promise<ActionResponse<{ anio: string }>> {
  try {
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

export async function createEvaluacionAction(data: {
  proceso: string;
  modalidad: string;
  nivel: string;
  area: string;
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
  esPremium?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const cuadernilloPath = data.urlCuadernillo ? saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo') : null;
    const resolucionPath = data.urlResolucion ? saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion') : null;
    const clavesPath = data.urlClaves ? saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves') : null;

    const isNivelValido = data.nivel && data.nivel.toUpperCase() !== 'NO_APLICA' && !data.nivel.toLowerCase().includes('no aplica');
    const tituloGenerado = isNivelValido
      ? `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.nivel} ${data.area}`
      : `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.area}`;

    const created = await prisma.evaluacion.create({
      data: {
        titulo: tituloGenerado,
        proceso: data.proceso,
        modalidad: data.modalidad,
        nivel: data.nivel,
        area: data.area,
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
        esPremium: Boolean(data.esPremium),
      },
    });

    invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id: created.id } };
  } catch (error: any) {
    console.error('❌ [CREATE EVALUACION ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: `Error al registrar la evaluación: ${error?.message || error}` } };
  }
}

export async function deleteEvaluacionAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
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

let evaluacionesCache: { timestamp: number; data: Evaluacion[] } | null = null;
const CACHE_TTL_MS = 60000;

export async function invalidateEvaluacionesCache() {
  evaluacionesCache = null;
}

export async function getEvaluacionesAction(
  filters: EvaluacionesFilterParams
): Promise<ActionResponse<Evaluacion[]>> {
  try {
    const now = Date.now();
    let allEvaluaciones: Evaluacion[];

    if (evaluacionesCache && (now - evaluacionesCache.timestamp < CACHE_TTL_MS)) {
      allEvaluaciones = evaluacionesCache.data;
    } else {
      const dbEvaluaciones = await prisma.evaluacion.findMany({
        take: 100,
        select: {
          id: true,
          titulo: true,
          proceso: true,
          modalidad: true,
          nivel: true,
          area: true,
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
          esPremium: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      allEvaluaciones = dbEvaluaciones.map((item) => {
        const isNivelValido = item.nivel && item.nivel.toUpperCase() !== 'NO_APLICA' && !item.nivel.toLowerCase().includes('no aplica');
        const labelLimpia = isNivelValido ? `${item.nivel} - ${item.area}` : item.area;

        return {
          id: item.id,
          mineduCode: `MINEDU-${item.anio}-${cleanNoAplicaStr(item.area)}`,
          titulo: cleanNoAplicaStr(item.titulo) || `Prueba Única Nacional ${item.proceso} ${item.anio} - ${cleanNoAplicaStr(item.area)}`,
          proceso: item.proceso as ProcesoMinedu,
          modalidad: item.modalidad as ModalidadEducativa,
          nivel: item.nivel as NivelEducativo,
          especialidad: item.area,
          especialidadLabel: labelLimpia,
          codigoCuadernillo: item.codigoCuadernillo || undefined,
          codigoResolucion: item.codigoResolucion || undefined,
          codigoClaves: item.codigoClaves || undefined,
          anio: Number(item.anio) || 2024,
          isLatest: true,
          resources: {
            cuadernilloKey: item.urlCuadernillo || '',
            resolucionKey: item.urlResolucion || undefined,
            clavesKey: item.urlClaves || undefined,
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

    if (filters.proceso && filters.proceso !== 'TODOS') {
      filteredList = filteredList.filter((e) => e.proceso === filters.proceso);
    }
    if (filters.modalidad && filters.modalidad !== 'TODOS') {
      filteredList = filteredList.filter((e) => e.modalidad === filters.modalidad);
    }
    if (filters.nivel && filters.nivel !== 'TODOS' && (filters.nivel as string) !== 'NO_APLICA') {
      const reqNivel = filters.nivel as string;
      filteredList = filteredList.filter((e) => {
        if (!e.nivel) return false;
        const eNivStr = String(e.nivel);
        if (eNivStr === reqNivel) return true;
        if (reqNivel === 'EBA_INICIAL_INTERMEDIO') return eNivStr === 'INICIAL' || eNivStr.includes('INICIAL');
        if (reqNivel === 'EBA_AVANZADO') return eNivStr === 'SECUNDARIA' || eNivStr.includes('AVANZADO');
        if (reqNivel === 'CETPRO_TECNICO') return eNivStr === 'SECUNDARIA' || eNivStr.includes('TECNICO');
        return false;
      });
    }
    const areaTarget = filters.especialidad || filters.searchQuery;
    if (areaTarget && areaTarget !== 'TODOS' && areaTarget !== '—' && areaTarget.trim()) {
      const targetLower = areaTarget.trim().toLowerCase();
      filteredList = filteredList.filter((e) => {
        if (!e.especialidad && !e.titulo) return false;
        const espLower = (e.especialidad || '').toLowerCase();
        const titleLower = (e.titulo || '').toLowerCase();

        if (filters.proceso === 'NOMBRAMIENTO_DOCENTE') {
          const isHg =
            espLower.includes('habilidades generales') ||
            espLower.includes('general') ||
            titleLower.includes('habilidades generales') ||
            titleLower.includes('comprensión lectora') ||
            titleLower.includes('razonamiento lógico') ||
            titleLower.includes('subprueba 1') ||
            titleLower.includes('subprueba 2');

          if (isHg) return true;
        }

        return espLower.includes(targetLower) || titleLower.includes(targetLower);
      });
    }
    if (filters.anio && filters.anio !== 'TODOS') {
      filteredList = filteredList.filter((e) => String(e.anio) === String(filters.anio));
    }

    return { success: true, data: filteredList };
  } catch (error) {
    console.error('❌ [GET EVALUACIONES ERROR]:', error);
    return { success: true, data: [] };
  }
}

export async function getResourceSignedUrlAction(
  evaluationId: string,
  resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const item = await prisma.evaluacion.findUnique({
      where: { id: evaluationId },
    });

    if (!item) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Evaluación no encontrada.' } };
    }

    const key =
      resourceType === 'CUADERNILLO'
        ? item.urlCuadernillo
        : resourceType === 'RESOLUCION'
        ? item.urlResolucion
        : item.urlClaves;

    return { success: true, data: { signedUrl: key || '/uploads/cuadernillos/ejemplo.pdf' } };
  } catch (error: any) {
    console.error('❌ [Signed Url Action Error]:', error);
    return {
      success: false,
      error: { code: 'SIGN_URL_FAILED', message: 'Error al solicitar el enlace.' },
    };
  }
}
