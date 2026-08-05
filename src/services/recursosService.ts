// src/services/recursosService.ts
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { MOCK_RECURSOS } from '@/data/mockRecursos';
import { CategoriaRecurso, Recurso } from '@/types/recurso';
import { verifyAdminSession } from '@/services/adminService';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const DEFAULT_SAMPLE_PDF = '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf';

const INITIAL_SEED_RECURSOS = [
  { titulo: 'Nemotecnias Nombramiento Docente 2024', descripcion: 'Estrategias de nemotecnia visual para recordar las casuísticas pedagógicas clave.', categoria: 'CASUISTICA_PEDAGOGICA', colorHeader: 'indigo', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
  { titulo: 'Resumen de Teorías del Aprendizaje', descripcion: 'Síntesis de Piaget, Vygotsky, Ausubel y Bruner orientada al examen MINEDU.', categoria: 'TEORIAS_APRENDIZAJE', colorHeader: 'emerald', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
  { titulo: 'Ficha de Programación Curricular', descripcion: 'Plantilla descargable de unidades didácticas y sesiones de aprendizaje.', categoria: 'PLANIFICACION_CURRICULAR', colorHeader: 'amber', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
  { titulo: 'Rúbricas de Evaluación Formativa', descripcion: 'Criterios de evaluación y escala de progreso pedagógico oficial MINEDU.', categoria: 'CURRICULO_NACIONAL', colorHeader: 'cyan', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
  { titulo: 'Guía Práctica de Gestión Escolar', descripcion: 'Compendio de normas técnicas y funciones de directivos de II.EE.', categoria: 'GESTION_ESCOLAR', colorHeader: 'rose', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
  { titulo: 'Compendio de Casuísticas Resueltas', descripcion: 'Preguntas tipo examen con resolución explicada paso a paso.', categoria: 'CASUISTICA_PEDAGOGICA', colorHeader: 'blue', estado: 'PUBLICADO', urlImagen: null, urlPdf: DEFAULT_SAMPLE_PDF },
];

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
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('pdf')) ext = '.pdf';

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, buffer);

    return `/uploads/${subfolder}/${filename}`;
  } catch {
    console.log('⚡ [VERCEL SERVERLESS] Guardando Data URL en PostgreSQL.');
    return base64Data;
  }
}

export async function getRecursosAction(
  searchQuery: string = '',
  categoria: CategoriaRecurso | 'TODOS' = 'TODOS'
): Promise<ActionResponse<Recurso[]>> {
  try {
    if (prisma && (prisma as any).recurso) {
      try {
        let dbRecursos = await (prisma as any).recurso.findMany({
          orderBy: { createdAt: 'asc' },
        });

        if (!dbRecursos || dbRecursos.length === 0) {
          console.log('🌱 [DISK AUTO-SEED] Sembrando tarjetas iniciales en PostgreSQL...');
          for (const item of INITIAL_SEED_RECURSOS) {
            await (prisma as any).recurso.create({ data: item });
          }

          dbRecursos = await (prisma as any).recurso.findMany({
            orderBy: { createdAt: 'asc' },
          });
        }

        const formatted: Recurso[] = dbRecursos.map((item: any, idx: number) => ({
          id: item.id,
          numero: idx + 1,
          titulo: item.titulo,
          descripcion: item.descripcion || 'Ficha de estudio para evaluaciones docentes.',
          categoria: (item.categoria as CategoriaRecurso) || 'CASUISTICA_PEDAGOGICA',
          categoriaLabel: (item.categoria || 'CASUISTICA_PEDAGOGICA').replace('_', ' '),
          colorTheme: (item.colorHeader as any) || 'blue',
          paginas: 2,
          formato: 'PDF',
          urlPdf: item.urlPdf || item.r2PdfKey || DEFAULT_SAMPLE_PDF,
          urlImagen: item.urlImagen || item.r2ImageKey || undefined,
          tags: ['MINEDU'],
          status: item.estado as 'PUBLICADO' | 'OCULTO',
        }));

        return { success: true, data: formatted };
      } catch (err) {
        console.error('❌ [DISK DB READ ERROR]:', err);
      }
    }

    let result = [...MOCK_RECURSOS];
    if (categoria !== 'TODOS') {
      result = result.filter((item) => item.categoria === categoria);
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.titulo.toLowerCase().includes(query));
    }
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [GET RECURSOS ERROR]:', error);
    return { success: true, data: MOCK_RECURSOS };
  }
}

export async function createRecursoAction(data: {
  titulo: string;
  descripcion?: string;
  number: number;
  categoria: CategoriaRecurso;
  colorHeader?: string;
}): Promise<ActionResponse<Recurso>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const descText = data.descripcion || 'Resumen de nemotecnia y trucos pedagógicos.';

    if (prisma && (prisma as any).recurso) {
      try {
        const created = await (prisma as any).recurso.create({
          data: {
            titulo: data.titulo,
            descripcion: descText,
            categoria: data.categoria,
            colorHeader: data.colorHeader || 'indigo',
            estado: 'PUBLICADO',
            urlPdf: DEFAULT_SAMPLE_PDF,
          },
        });

        revalidatePath('/admin');

        const newRecurso: Recurso = {
          id: created.id,
          numero: data.number,
          titulo: created.titulo,
          descripcion: created.descripcion || descText,
          categoria: data.categoria,
          categoriaLabel: data.categoria.replace('_', ' '),
          colorTheme: 'blue',
          paginas: 2,
          formato: 'PDF',
          urlPdf: DEFAULT_SAMPLE_PDF,
          tags: ['MINEDU'],
          status: 'PUBLICADO',
        };
        return { success: true, data: newRecurso };
      } catch (err) {
        console.error('❌ [DISK DB CREATE ERROR]:', err);
      }
    }

    const nuevo: Recurso = {
      id: `rec-${Date.now()}`,
      numero: data.number,
      titulo: data.titulo,
      descripcion: descText,
      categoria: data.categoria,
      categoriaLabel: data.categoria.replace('_', ' '),
      colorTheme: 'blue',
      paginas: 2,
      formato: 'PDF',
      urlPdf: DEFAULT_SAMPLE_PDF,
      tags: ['MINEDU', data.categoria],
      status: 'PUBLICADO',
    };

    MOCK_RECURSOS.push(nuevo);
    return { success: true, data: nuevo };
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
    r2ImageKey?: string;
    r2PdfKey?: string;
    estado?: 'PUBLICADO' | 'OCULTO';
  }
): Promise<ActionResponse<{ id: string; urlImagen?: string; urlPdf?: string }>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const updatePayload: any = { ...data };

    if (data.urlImagen && data.urlImagen.startsWith('data:')) {
      const diskPath = saveBase64ToFile(data.urlImagen, 'recursos', `rec-img-${id}`);
      updatePayload.urlImagen = diskPath;
      updatePayload.r2ImageKey = diskPath;
    }

    if (data.urlPdf && data.urlPdf.startsWith('data:')) {
      const diskPath = saveBase64ToFile(data.urlPdf, 'recursos', `rec-pdf-${id}`);
      updatePayload.urlPdf = diskPath;
      updatePayload.r2PdfKey = diskPath;
    }

    if (prisma && (prisma as any).recurso) {
      try {
        const updated = await (prisma as any).recurso.update({
          where: { id },
          data: updatePayload,
        });

        revalidatePath('/admin');
        return { success: true, data: { id: updated.id, urlImagen: updated.urlImagen, urlPdf: updated.urlPdf } };
      } catch (err) {
        console.error('❌ [DISK DB UPDATE ERROR]:', err);
      }
    }

    const target = MOCK_RECURSOS.find((r) => r.id === id);
    if (target) {
      if (updatePayload.titulo !== undefined) target.titulo = updatePayload.titulo;
      if (updatePayload.descripcion !== undefined) target.descripcion = updatePayload.descripcion;
      if (updatePayload.urlPdf !== undefined) target.urlPdf = updatePayload.urlPdf;
      if (updatePayload.urlImagen !== undefined) target.urlImagen = updatePayload.urlImagen;
      if (updatePayload.estado !== undefined) target.status = updatePayload.estado;
    }

    return { success: true, data: { id, urlImagen: updatePayload.urlImagen, urlPdf: updatePayload.urlPdf } };
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
      try {
        await (prisma as any).recurso.delete({ where: { id } });
        revalidatePath('/admin');
      } catch (err) {
        console.error('❌ [DISK DB DELETE ERROR]:', err);
      }
    }

    const idx = MOCK_RECURSOS.findIndex((r) => r.id === id);
    if (idx !== -1) MOCK_RECURSOS.splice(idx, 1);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('❌ [DELETE RECURSO ERROR]:', error);
    return { success: false, error: { code: 'DELETE_FAILED', message: 'Error al eliminar.' } };
  }
}

export async function getRecursoSignedUrlAction(
  keyOrId: string
): Promise<ActionResponse<{ signedUrl: string }>> {
  if (!keyOrId || keyOrId.trim() === '') {
    return { success: true, data: { signedUrl: DEFAULT_SAMPLE_PDF } };
  }

  let dbUrl = '';
  if (prisma && (prisma as any).recurso) {
    try {
      const dbItem = await (prisma as any).recurso.findUnique({ where: { id: keyOrId } });
      if (dbItem?.urlPdf) dbUrl = dbItem.urlPdf;
    } catch {}
  }

  const target = MOCK_RECURSOS.find((item) => item.id === keyOrId);
  const foundUrl = dbUrl || target?.urlPdf || keyOrId;

  const validUrl = (foundUrl && (foundUrl.startsWith('/') || foundUrl.startsWith('http')))
    ? foundUrl
    : DEFAULT_SAMPLE_PDF;

  return { success: true, data: { signedUrl: validUrl } };
}
