// src/services/recursosService.ts
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CategoriaRecurso, Recurso } from '@/types/recurso';
import { verifyAdminSession } from '@/services/adminService';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

let recursosCache: { timestamp: number; data: Recurso[] } | null = null;
const RECURSOS_CACHE_TTL = 30000;

export async function invalidateRecursosCache() {
  recursosCache = null;
}

export async function getRecursosAction(
  searchQuery: string = '',
  categoria: CategoriaRecurso | 'TODOS' = 'TODOS',
  includeHidden: boolean = false
): Promise<ActionResponse<Recurso[]>> {
  try {
    const now = Date.now();
    let allRecursos: Recurso[] = [];

    if (recursosCache && (now - recursosCache.timestamp < RECURSOS_CACHE_TTL)) {
      allRecursos = recursosCache.data;
    } else {
      let dbRecursos: any[] = [];
      if (prisma && (prisma as any).recurso) {
        try {
          dbRecursos = await (prisma as any).recurso.findMany({
            select: {
              id: true,
              titulo: true,
              descripcion: true,
              categoria: true,
              urlPdf: true,
              urlImagen: true,
              estado: true,
              colorHeader: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          });
        } catch (err) {
          console.error('❌ [DB RECURSOS READ ERROR]:', err);
        }
      }

      allRecursos = dbRecursos.map((item: any, idx: number) => ({
        id: item.id,
        numero: idx + 1,
        titulo: item.titulo,
        descripcion: item.descripcion || 'Ficha de estudio para evaluaciones docentes.',
        categoria: (item.categoria as CategoriaRecurso) || 'CASUISTICA_PEDAGOGICA',
        categoriaLabel: (item.categoria || 'CASUISTICA_PEDAGOGICA').replace(/_/g, ' '),
        colorTheme: (item.colorHeader as any) || 'blue',
        paginas: 2,
        formato: 'PDF',
        urlPdf: item.urlPdf || undefined,
        urlImagen: item.urlImagen || undefined,
        tags: ['MINEDU'],
        status: (item.estado as 'PUBLICADO' | 'OCULTO') || 'PUBLICADO',
      }));

      recursosCache = { timestamp: now, data: allRecursos };
    }

    let filtered = allRecursos;
    if (!includeHidden) {
      filtered = filtered.filter((item) => item.status === 'PUBLICADO');
    }
    if (categoria !== 'TODOS') {
      filtered = filtered.filter((item) => item.categoria === categoria);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => item.titulo.toLowerCase().includes(q));
    }

    return { success: true, data: filtered };
  } catch (error) {
    console.error('❌ [GET RECURSOS ERROR]:', error);
    return { success: true, data: [] };
  }
}

export async function createRecursoAction(data: {
  titulo: string;
  descripcion?: string;
  number: number;
  categoria: CategoriaRecurso;
  colorHeader?: string;
  estado?: 'PUBLICADO' | 'OCULTO';
}): Promise<ActionResponse<Recurso>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const descText = data.descripcion || 'Resumen de nemotecnia y trucos pedagógicos.';
    const estadoInicial = data.estado || 'OCULTO';

    if (prisma && (prisma as any).recurso) {
      const created = await (prisma as any).recurso.create({
        data: {
          titulo: data.titulo,
          descripcion: descText,
          categoria: data.categoria,
          colorHeader: data.colorHeader || 'indigo',
          estado: estadoInicial,
          urlPdf: null,
          urlImagen: null,
        },
      });

      invalidateRecursosCache();
      revalidatePath('/admin');
      revalidatePath('/recursos');

      const newRecurso: Recurso = {
        id: created.id,
        numero: data.number,
        titulo: created.titulo,
        descripcion: created.descripcion || descText,
        categoria: data.categoria,
        categoriaLabel: data.categoria.replace(/_/g, ' '),
        colorTheme: (created.colorHeader as any) || 'blue',
        paginas: 2,
        formato: 'PDF',
        urlPdf: undefined,
        urlImagen: undefined,
        tags: ['MINEDU'],
        status: estadoInicial,
      };
      return { success: true, data: newRecurso };
    }

    return { success: false, error: { code: 'DATABASE_ERROR', message: 'Base de datos no disponible.' } };
  } catch (error) {
    console.error('❌ [CREATE RECURSO ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: 'Error al crear recurso.' } };
  }
}

export async function updateRecursoAction(
  id: string,
  data: {
    titulo?: string;
    descripcion?: string;
    urlImagen?: string;
    urlPdf?: string;
    estado?: 'PUBLICADO' | 'OCULTO';
  }
): Promise<ActionResponse<{ id: string; urlImagen?: string; urlPdf?: string }>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    if (prisma && (prisma as any).recurso) {
      const updated = await (prisma as any).recurso.update({
        where: { id },
        data: {
          ...(data.titulo !== undefined && { titulo: data.titulo }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.urlImagen !== undefined && { urlImagen: data.urlImagen, r2ImageKey: data.urlImagen }),
          ...(data.urlPdf !== undefined && { urlPdf: data.urlPdf, r2PdfKey: data.urlPdf }),
          ...(data.estado !== undefined && { estado: data.estado }),
        },
      });

      invalidateRecursosCache();
      revalidatePath('/admin');
      revalidatePath('/recursos');
      return { success: true, data: { id: updated.id, urlImagen: updated.urlImagen || undefined, urlPdf: updated.urlPdf || undefined } };
    }

    return { success: false, error: { code: 'DATABASE_ERROR', message: 'Base de datos no disponible.' } };
  } catch (error) {
    console.error('❌ [UPDATE RECURSO ERROR]:', error);
    return { success: false, error: { code: 'UPDATE_FAILED', message: 'Error al actualizar.' } };
  }
}

export async function toggleRecursoVisibilityAction(
  id: string,
  nuevoEstado: 'PUBLICADO' | 'OCULTO'
): Promise<ActionResponse<{ id: string; estado: 'PUBLICADO' | 'OCULTO' }>> {
  return updateRecursoAction(id, { estado: nuevoEstado }) as any;
}

export async function deleteRecursoAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    if (prisma && (prisma as any).recurso) {
      // 1. Obtener registro antes de borrar para limpiar archivos en disco
      const existing = await (prisma as any).recurso.findUnique({ where: { id } });
      if (existing) {
        const filesToDelete: string[] = [];
        if (existing.urlPdf && existing.urlPdf.startsWith('/uploads/')) {
          filesToDelete.push(existing.urlPdf.replace(/^\//, ''));
        }
        if (existing.urlImagen && existing.urlImagen.startsWith('/uploads/')) {
          filesToDelete.push(existing.urlImagen.replace(/^\//, ''));
        }

        const cwd = process.cwd();
        for (const relPath of filesToDelete) {
          const possiblePaths = [
            path.join(cwd, 'public', relPath),
            path.join(cwd, 'storage_uploads', relPath.replace(/^uploads\//, '')),
            path.join('/app', 'public', relPath),
            path.join('/var/www/avend-escala', 'storage_uploads', relPath.replace(/^uploads\//, '')),
            path.join('/var/www/avend-escala', 'public', relPath),
          ];
          for (const p of possiblePaths) {
            try {
              if (fs.existsSync(p)) {
                fs.unlinkSync(p);
              }
            } catch {}
          }
        }

        // 2. Eliminar físicamente de la base de datos
        await (prisma as any).recurso.delete({ where: { id } });
      }

      invalidateRecursosCache();
      revalidatePath('/admin');
      revalidatePath('/recursos');
      return { success: true, data: { id } };
    }

    return { success: false, error: { code: 'DATABASE_ERROR', message: 'Base de datos no disponible.' } };
  } catch (error) {
    console.error('❌ [DELETE RECURSO ERROR]:', error);
    return { success: false, error: { code: 'DELETE_FAILED', message: 'Error al eliminar de base de datos.' } };
  }
}

export async function getRecursoSignedUrlAction(
  keyOrId: string
): Promise<ActionResponse<{ signedUrl: string }>> {
  if (!keyOrId || keyOrId.trim() === '') {
    return { success: false, error: { code: 'NO_PDF', message: 'No se especificó un recurso válido.' } };
  }

  let dbUrl = '';
  if (prisma && (prisma as any).recurso) {
    try {
      const dbItem = await (prisma as any).recurso.findUnique({ where: { id: keyOrId } });
      if (dbItem?.urlPdf) dbUrl = dbItem.urlPdf;
    } catch {}
  }

  const foundUrl = dbUrl || (keyOrId.startsWith('/') || keyOrId.startsWith('http') ? keyOrId : '');

  if (!foundUrl) {
    return { success: false, error: { code: 'NO_PDF', message: 'Este recurso no tiene un archivo PDF cargado.' } };
  }

  const streamUrl = foundUrl.startsWith('/api/pdf-stream')
    ? foundUrl
    : `/api/pdf-stream?url=${encodeURIComponent(foundUrl)}`;

  return { success: true, data: { signedUrl: streamUrl } };
}
