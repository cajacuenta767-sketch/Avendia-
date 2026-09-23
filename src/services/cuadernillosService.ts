// src/services/cuadernillosService.ts
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/services/adminService';

export interface CuadernilloItem {
  id: string;
  titulo: string;
  proceso: string;
  modalidad: string;
  nivel: string;
  area: string;
  anio: string;
  urlCuadernillo?: string | null;
  urlResolucion?: string | null;
  urlClaves?: string | null;
  esPremium: boolean;
  createdAt: string;
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface CuadernilloFiltrosParams {
  proceso?: string;
  modalidad?: string;
  nivel?: string;
  area?: string;
  especialidad?: string;
  anio?: string;
  searchQuery?: string;
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

const INITIAL_SEED_CUADERNILLOS = [
  {
    titulo: 'Prueba Única Nacional Nombramiento Docente 2024 - Inicial',
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBR',
    nivel: 'INICIAL',
    area: 'Inicial',
    anio: '2024',
    urlCuadernillo: '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf',
    esPremium: false,
  },
  {
    titulo: 'Prueba Única Nacional Nombramiento Docente 2024 - Primaria General',
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBR',
    nivel: 'PRIMARIA',
    area: 'General',
    anio: '2024',
    urlCuadernillo: '/uploads/cuadernillos/cuadernillo-primaria-2024.pdf',
    esPremium: true,
  },
  {
    titulo: 'Prueba Única Nacional Nombramiento Docente 2024 - Secundaria Matemática',
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBR',
    nivel: 'SECUNDARIA',
    area: 'Matemática',
    anio: '2024',
    urlCuadernillo: '/uploads/cuadernillos/cuadernillo-matematica-2024.pdf',
    esPremium: true,
  },
];

export async function getCuadernillosAction(
  filtros?: CuadernilloFiltrosParams
): Promise<ActionResponse<CuadernilloItem[]>> {
  try {
    const whereClause: any = {};

    if (filtros?.proceso && filtros.proceso !== 'TODOS') {
      whereClause.proceso = filtros.proceso;
    }
    if (filtros?.modalidad && filtros.modalidad !== 'TODOS') {
      whereClause.modalidad = filtros.modalidad;
    }
    if (filtros?.nivel && filtros.nivel !== 'TODOS') {
      whereClause.nivel = filtros.nivel;
    }
    const areaTarget = filtros?.area || filtros?.especialidad;
    if (areaTarget && areaTarget !== 'TODOS') {
      whereClause.area = areaTarget;
    }
    if (filtros?.anio && filtros.anio !== 'TODOS') {
      whereClause.anio = String(filtros.anio);
    }

    let dbItems = await prisma.evaluacion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if ((!dbItems || dbItems.length === 0) && (!filtros || Object.keys(filtros).length === 0)) {
      console.log('🌱 [DB AUTO-SEED CUADERNILLOS] Sembrando cuadernillos iniciales...');
      for (const item of INITIAL_SEED_CUADERNILLOS) {
        await prisma.evaluacion.create({ data: item });
      }
      dbItems = await prisma.evaluacion.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const formatted: CuadernilloItem[] = dbItems.map((item) => ({
      id: item.id,
      titulo: item.titulo || `Prueba ${item.proceso} ${item.anio} - ${item.nivel} ${item.area}`,
      proceso: item.proceso,
      modalidad: item.modalidad,
      nivel: item.nivel,
      area: item.area,
      anio: item.anio,
      urlCuadernillo: item.urlCuadernillo,
      urlResolucion: item.urlResolucion,
      urlClaves: item.urlClaves,
      esPremium: Boolean(item.esPremium),
      createdAt: item.createdAt.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error('❌ [GET CUADERNILLOS ERROR]:', error);
    return {
      success: false,
      error: {
        code: 'GET_CUADERNILLOS_FAILED',
        message: `Error al consultar cuadernillos en PostgreSQL: ${error?.message || error}`,
      },
    };
  }
}

export async function crearCuadernilloAction(data: {
  titulo?: string;
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
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const cuadernilloPath = data.urlCuadernillo ? saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo') : null;
    const resolucionPath = data.urlResolucion ? saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion') : null;
    const clavesPath = data.urlClaves ? saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves') : null;

    const tituloGenerado = data.titulo?.trim() || `Prueba Única Nacional ${data.proceso} ${data.anio} - ${data.nivel} ${data.area}`;

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
    console.error('❌ [CREAR CUADERNILLO ERROR]:', error);
    return {
      success: false,
      error: {
        code: 'CREATE_CUADERNILLO_FAILED',
        message: `Error al crear cuadernillo en PostgreSQL: ${error?.message || error}`,
      },
    };
  }
}

export async function actualizarCuadernilloAction(
  id: string,
  data: {
    titulo?: string;
    proceso?: string;
    modalidad?: string;
    nivel?: string;
    area?: string;
    anio?: string;
    urlCuadernillo?: string;
    urlResolucion?: string;
    urlClaves?: string;
    esPremium?: boolean;
  }
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const payload: any = {};
    if (data.titulo) payload.titulo = data.titulo.trim();
    if (data.proceso) payload.proceso = data.proceso;
    if (data.modalidad) payload.modalidad = data.modalidad;
    if (data.nivel) payload.nivel = data.nivel;
    if (data.area) payload.area = data.area;
    if (data.anio) payload.anio = data.anio;
    if (typeof data.esPremium === 'boolean') payload.esPremium = data.esPremium;

    if (data.urlCuadernillo) {
      payload.urlCuadernillo = saveBase64ToFile(data.urlCuadernillo, 'cuadernillos', 'cuadernillo');
    }
    if (data.urlResolucion) {
      payload.urlResolucion = saveBase64ToFile(data.urlResolucion, 'cuadernillos', 'resolucion');
    }
    if (data.urlClaves) {
      payload.urlClaves = saveBase64ToFile(data.urlClaves, 'cuadernillos', 'claves');
    }

    await prisma.evaluacion.update({
      where: { id },
      data: payload,
    });

    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ [ACTUALIZAR CUADERNILLO ERROR]:', error);
    return {
      success: false,
      error: {
        code: 'UPDATE_CUADERNILLO_FAILED',
        message: `Error al actualizar cuadernillo: ${error?.message || error}`,
      },
    };
  }
}

export async function eliminarCuadernilloAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    await prisma.evaluacion.delete({
      where: { id },
    });

    revalidatePath('/admin');
    revalidatePath('/cuadernillos');
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ [ELIMINAR CUADERNILLO ERROR]:', error);
    return {
      success: false,
      error: {
        code: 'DELETE_CUADERNILLO_FAILED',
        message: `Error al eliminar cuadernillo de PostgreSQL: ${error?.message || error}`,
      },
    };
  }
}
