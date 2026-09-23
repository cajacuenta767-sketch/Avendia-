import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { readAnySession } from '@/lib/serverSession';
import { checkDocenteSpecialtyAccess } from '@/utils/badgeUtils';

export const dynamic = 'force-dynamic';

function getMimeType(filePathOrUrl: string): string {
  const clean = filePathOrUrl.split('?')[0].split('#')[0];
  const ext = path.extname(clean).toLowerCase();
  switch (ext) {
    // PowerPoint
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    // Excel / Datos
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.csv':
      return 'text/csv; charset=utf-8';
    // Word / Texto
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.doc':
      return 'application/msword';
    case '.txt':
      return 'text/plain; charset=utf-8';
    // Imágenes
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    // PDF por defecto
    case '.pdf':
    default:
      return 'application/pdf';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || searchParams.get('file') || '';
  const customName = searchParams.get('name') || 'evaluacion_minedu';
  const resourceType = searchParams.get('resourceType') || '';
  const evalId = searchParams.get('evalId') || '';
  const session = readAnySession();
  const userEmail = session?.email || '';
  const isAdmin = Boolean(session && ['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS'].includes(session.role.toUpperCase()));

  const detectedExt = path.extname(rawUrl.split('?')[0]).toLowerCase() || '.pdf';
  const cleanCustomName = customName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/\.(pdf|xlsx|xls|docx|doc|pptx|ppt|csv|png|jpg|jpeg|webp|txt)$/i, '');

  const safeFilename = `${cleanCustomName}${detectedExt}`;
  const contentType = getMimeType(rawUrl);

  try {
    if (!session) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
    const evaluacion = evalId
      ? await prisma.evaluacion.findUnique({ where: { id: evalId } })
      : null;

    let docente = null;
    if (!isAdmin) {
      docente = await prisma.usuarioDocente.findUnique({ where: { email: userEmail } });
      if (!docente || docente.accesoGranted === false || docente.fechaFin <= new Date()) {
        return NextResponse.json({ error: 'Tu suscripción no está activa.' }, { status: 403 });
      }
    }

    // PROTECCIÓN DE DESCARGA: Las resoluciones solo pueden ser descargadas por docentes suscritos a la especialidad
    const isResolucion =
      resourceType === 'RESOLUCION' ||
      rawUrl.toLowerCase().includes('resolucion') ||
      rawUrl.toLowerCase().includes('solucionario') ||
      customName.toLowerCase().includes('resolucion') ||
      customName.toLowerCase().includes('solucionario');

    const isAvendResolution =
      isResolucion &&
      String(evaluacion?.origenResolucion || 'AVEND').toUpperCase() !== 'MINEDU' &&
      evaluacion?.proceso !== 'ACCESO_CARGOS_DIRECTIVOS';
    if (isAvendResolution && !isAdmin) {
      if (!userEmail) {
        return NextResponse.json(
          { error: 'No cuentas con permisos para descargar la resolución de esta especialidad.' },
          { status: 403 }
        );
      }

      // Validar coincidencia con la evaluación si se proporcionó evalId o buscar por archivo
      if (evaluacion && docente) {
        if (!checkDocenteSpecialtyAccess(docente, evaluacion).hasAccess) {
          return NextResponse.json(
            { error: 'No cuentas con permisos para descargar la resolución de esta especialidad.' },
            { status: 403 }
          );
        }
      }
    }
    // 1. URLs Externas (HTTP / HTTPS)
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const allowedExternal = rawUrl.includes('.r2.cloudflarestorage.com');
      if (!allowedExternal) return NextResponse.json({ error: 'Origen de archivo no permitido.' }, { status: 400 });
      const response = await fetch(rawUrl, { redirect: 'error' });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${safeFilename}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 2. Data URLs (Base64)
    if (rawUrl.startsWith('data:')) {
      const matches = rawUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches[2]) {
        const buffer = Buffer.from(matches[2], 'base64');
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${safeFilename}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 3. Archivos Locales en Disco (Standalone Next.js / Docker)
    const cleanPath = path.basename(decodeURIComponent(rawUrl.trim().replace(/^public\//, '')));

    const candidatePaths = [
      path.join(process.cwd(), 'public', 'uploads', 'cuadernillos', cleanPath),
      path.join(process.cwd(), 'public', 'uploads', 'recursos', cleanPath),
      path.join(process.cwd(), 'storage_uploads', 'cuadernillos', cleanPath),
      path.join(process.cwd(), 'storage_uploads', 'recursos', cleanPath),
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const buffer = fs.readFileSync(filePath);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${safeFilename}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // Fallback si no se encuentra el archivo
    return new NextResponse('Archivo no encontrado', { status: 404 });
  } catch (error: any) {
    console.error('❌ [PDF Download Error]:', error);
    return new NextResponse('Error al procesar la descarga', { status: 500 });
  }
}
