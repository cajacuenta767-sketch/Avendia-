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

const DEFAULT_ANIOS = ['2024', '2023', '2022', '2021', '2019', '2018'];

function saveBase64ToFile(base64Data: string, subfolder: string, prefix: string): string {
  if (!base64Data || !base64Data.startsWith('data:')) {
    return base64Data;
  }

  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64Data;
  }

  const buffer = Buffer.from(matches[2], 'base64');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${prefix}-${Date.now()}.pdf`;
  const fullPath = path.join(uploadsDir, filename);
  fs.writeFileSync(fullPath, buffer);

  return `/uploads/${subfolder}/${filename}`;
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
  esPremium?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const cuadernilloPath = data.urlCuadernillo ? saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo') : null;
    const resolucionPath = data.urlResolucion ? saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion') : null;
    const clavesPath = data.urlClaves ? saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves') : null;

    const tituloGenerado = `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.nivel} ${data.area}`;

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
        esPremium: Boolean(data.esPremium),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id: created.id } };
  } catch (error: any) {
    console.error('❌ [CREATE EVALUACION ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: `Error al registrar la evaluación: ${error?.message || error}` } };
  }
}

export async function getEvaluacionesAction(
  filters: EvaluacionesFilterParams
): Promise<ActionResponse<Evaluacion[]>> {
  try {
    const whereClause: any = {};

    if (filters.proceso && filters.proceso !== 'TODOS') {
      whereClause.proceso = filters.proceso;
    }
    if (filters.modalidad && filters.modalidad !== 'TODOS') {
      whereClause.modalidad = filters.modalidad;
    }
    if (filters.nivel && filters.nivel !== 'TODOS') {
      whereClause.nivel = filters.nivel;
    }
    const areaTarget = filters.especialidad || filters.searchQuery;
    if (areaTarget && areaTarget !== 'TODOS' && areaTarget.trim()) {
      whereClause.area = { contains: areaTarget.trim() };
    }
    if (filters.anio && filters.anio !== 'TODOS') {
      whereClause.anio = String(filters.anio);
    }

    const dbEvaluaciones = await prisma.evaluacion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const formattedList: Evaluacion[] = dbEvaluaciones.map((item) => ({
      id: item.id,
      mineduCode: `MINEDU-${item.anio}-${item.area}`,
      titulo: item.titulo || `Prueba Única Nacional ${item.proceso} ${item.anio} - ${item.nivel} ${item.area}`,
      proceso: item.proceso as ProcesoMinedu,
      modalidad: item.modalidad as ModalidadEducativa,
      nivel: item.nivel as NivelEducativo,
      especialidad: item.area,
      especialidadLabel: `${item.nivel} - ${item.area}`,
      anio: Number(item.anio) || 2024,
      isLatest: true,
      resources: {
        cuadernilloKey: item.urlCuadernillo || '',
        resolucionKey: item.urlResolucion || undefined,
        clavesKey: item.urlClaves || undefined,
      },
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.createdAt.toISOString(),
    }));

    return { success: true, data: formattedList };
  } catch (error: any) {
    console.error('❌ [GET EVALUACIONES ERROR]:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_EVALUATIONS_FAILED',
        message: `Error al consultar evaluaciones en PostgreSQL: ${error?.message || error}`,
      },
    };
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
