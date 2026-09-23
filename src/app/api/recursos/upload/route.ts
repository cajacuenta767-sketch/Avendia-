// src/app/api/recursos/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateRecursosCache } from '@/services/recursosService';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { requireActiveAdminSession } from '@/lib/serverSession';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function authorizationErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'UNAUTHORIZED') {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión como administrador.' } },
      { status: 401 }
    );
  }
  if (error.message === 'FORBIDDEN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Tu cuenta no tiene permiso para gestionar recursos.' } },
      { status: 403 }
    );
  }
  return null;
}

async function saveRecursoFileToDisk(file: File, subfolder: string, prefix: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const cwd = process.cwd();
  const ext = path.extname(file.name).toLowerCase() || (prefix.includes('img') ? '.png' : '.pdf');
  const cleanBaseName = path.basename(file.name, ext).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${prefix}-${cleanBaseName}-${Date.now()}${ext}`;

  // Lista de destinos físicos donde persistir el archivo
  const targetDirs = [
    path.join(cwd, 'public', 'uploads', subfolder),
    path.join(cwd, 'storage_uploads', subfolder),
    path.join('/app', 'public', 'uploads', subfolder),
    path.join('/var/www/avend-escala', 'storage_uploads', subfolder),
    path.join('/var/www/avend-escala', 'public', 'uploads', subfolder),
  ];

  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, filename), buffer);
    } catch {
      // Continuar con los siguientes directorios accesibles
    }
  }

  return `/uploads/${subfolder}/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    try {
      await requireActiveAdminSession('recursos');
    } catch (error: unknown) {
      const response = authorizationErrorResponse(error);
      if (response) return response;
      throw error;
    }
    const formData = await req.formData();
    const id = formData.get('id') as string | null;
    const uploadType = (formData.get('type') as string) || 'pdf'; // 'pdf' | 'image'
    const file = formData.get('file') as File | null;

    const parsedType = z.enum(['pdf', 'image']).safeParse(uploadType);
    if (!parsedType.success) return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Tipo de archivo no permitido.' } }, { status: 400 });

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No se envió ningún archivo válido.' } },
        { status: 400 }
      );
    }

    const prefix = uploadType === 'image' ? `rec-img-${id || 'item'}` : `rec-pdf-${id || 'item'}`;
    const fileUrl = await saveRecursoFileToDisk(file, 'recursos', prefix);

    let updatedRecord: any = null;

    if (id && prisma && (prisma as any).recurso) {
      try {
        const updateData: any = {};
        if (uploadType === 'image') {
          updateData.urlImagen = fileUrl;
          updateData.r2ImageKey = fileUrl;
        } else {
          updateData.urlPdf = fileUrl;
          updateData.r2PdfKey = fileUrl;
        }

        updatedRecord = await (prisma as any).recurso.update({
          where: { id },
          data: updateData,
        });

        invalidateRecursosCache();
        revalidatePath('/admin');
        revalidatePath('/recursos');
      } catch (dbErr) {
        console.error('⚠️ [API RECURSOS UPLOAD] Error updating DB:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: id || updatedRecord?.id,
        url: fileUrl,
        streamUrl: `/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`,
      },
    });
  } catch (error: unknown) {
    console.error('❌ [API RECURSOS UPLOAD ERROR]:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: 'Error al procesar subida.' } },
      { status: 500 }
    );
  }
}
