// src/services/notificacionesService.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '@/services/adminService';

export interface ReporteRecursoParams {
  evaluacionId?: string;
  tipoRecurso: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES' | 'RECURSO_PDF';
  tituloEvaluacion: string;
  proceso?: string;
  modalidad?: string;
  nivel?: string;
  area?: string;
  anio?: string | number;
  codigo?: string;
  docenteNombre?: string;
  docenteEmail?: string;
}

export async function registrarReporteRecursoFaltanteAction(params: ReporteRecursoParams) {
  try {
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);

    // Anti-Spam / Debounce: evitar duplicar el mismo reporte si fue emitido hace menos de 5 minutos
    const existenteReciente = await prisma.notificacionAdmin.findFirst({
      where: {
        tipoRecurso: params.tipoRecurso,
        evaluacionId: params.evaluacionId || undefined,
        docenteEmail: params.docenteEmail || undefined,
        createdAt: { gte: cincoMinutosAtras },
      },
    });

    if (existenteReciente) {
      return { success: true, message: 'Reporte ya registrado previamente.' };
    }

    const recursoLabel =
      params.tipoRecurso === 'CUADERNILLO'
        ? 'Cuadernillo Principal'
        : params.tipoRecurso === 'RESOLUCION'
        ? 'Solucionario / Resolución'
        : params.tipoRecurso === 'CLAVES'
        ? 'Claves Oficiales'
        : 'Recurso Pedagógico';

    const notificacion = await prisma.notificacionAdmin.create({
      data: {
        tipo: 'RECURSO_FALTANTE',
        titulo: `Material no disponible: ${recursoLabel}`,
        mensaje: `El docente solicitó el ${recursoLabel} de "${params.tituloEvaluacion}".`,
        tipoRecurso: params.tipoRecurso,
        evaluacionId: params.evaluacionId,
        proceso: params.proceso,
        modalidad: params.modalidad,
        nivel: params.nivel,
        area: params.area,
        anio: params.anio ? String(params.anio) : undefined,
        codigo: params.codigo,
        docenteNombre: params.docenteNombre || 'Docente Anónimo',
        docenteEmail: params.docenteEmail || 'No especificado',
        leido: false,
      },
    });

    revalidatePath('/admin');
    return { success: true, data: notificacion };
  } catch (error: any) {
    console.error('❌ [NOTIFICACION REPORTE ERROR]:', error);
    return { success: false, error: error?.message };
  }
}

export async function getNotificacionesAdminAction() {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: 'UNAUTHORIZED', data: { notificaciones: [], unreadCount: 0 } };
    const notificaciones = await prisma.notificacionAdmin.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const unreadCount = await prisma.notificacionAdmin.count({
      where: { leido: false },
    });

    return { success: true, data: { notificaciones, unreadCount } };
  } catch (error: any) {
    return { success: false, error: error?.message, data: { notificaciones: [], unreadCount: 0 } };
  }
}

export async function marcarNotificacionLeidaAction(id: string) {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: 'UNAUTHORIZED' };
    await prisma.notificacionAdmin.update({
      where: { id },
      data: { leido: true },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

export async function marcarTodasNotificacionesLeidasAction() {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: 'UNAUTHORIZED' };
    await prisma.notificacionAdmin.updateMany({
      where: { leido: false },
      data: { leido: true },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}

export async function eliminarNotificacionAction(id: string) {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: 'UNAUTHORIZED' };
    await prisma.notificacionAdmin.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}
