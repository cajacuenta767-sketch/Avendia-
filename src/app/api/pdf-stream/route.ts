// src/app/api/pdf-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { readAnySession } from '@/lib/serverSession';
import { checkDocenteSpecialtyAccess } from '@/utils/badgeUtils';

function getStreamMimeType(filePathOrUrl: string): string {
  const clean = filePathOrUrl.split('?')[0].split('#')[0];
  const ext = path.extname(clean).toLowerCase();
  switch (ext) {
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.csv':
      return 'text/csv; charset=utf-8';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.doc':
      return 'application/msword';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.pdf':
    default:
      return 'application/pdf';
  }
}

function renderDocumentPendingHtml(title: string): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento en Proceso - AVEND ESCALA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 select-none">
  <div class="max-w-md w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
    <div class="relative inline-flex items-center justify-center">
      <div class="absolute -inset-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur-lg opacity-35 animate-pulse"></div>
      <div class="relative w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center text-3xl shadow-inner">
        📄
      </div>
    </div>
    
    <div class="space-y-2">
      <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
        DOCUMENTO EN PROCESO DE CARGA
      </span>
      <h2 class="text-base sm:text-lg font-black text-white leading-snug">${safeTitle}</h2>
      <p class="text-xs text-slate-400 leading-relaxed">
        El archivo digital de este recurso aún no ha sido cargado o no se completó la subida física al servidor.
      </p>
    </div>

    <div class="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 text-left flex items-start space-x-3">
      <span class="text-base shrink-0">🔔</span>
      <div class="space-y-0.5">
        <p class="text-xs font-bold text-slate-200">Aviso Automático Enviado</p>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          Se ha enviado una alerta a la campanita del administrador para que suba el archivo correspondiente.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Función auxiliar para servir buffers con soporte de HTTP 206 Partial Content (Range Requests)
function servePdfBufferWithRanges(
  buffer: Buffer,
  rangeHeader: string | null,
  filePathOrUrl: string = ''
): NextResponse {
  const totalSize = buffer.length;
  const contentType = getStreamMimeType(filePathOrUrl);
  const ext = path.extname(filePathOrUrl.split('?')[0]).toLowerCase() || '.pdf';
  const commonHeaders = {
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="documento${ext}"`,
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  };

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    let end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (end >= totalSize) {
      end = totalSize - 1;
    }

    if (start < totalSize && start <= end) {
      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': String(chunk.length),
          'Cache-Control': 'private, no-store',
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...commonHeaders,
      'Content-Length': String(totalSize),
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get('url') || searchParams.get('file') || searchParams.get('key') || '';
  const rangeHeader = req.headers.get('range');

  try {
    const session = readAnySession();
    if (!session) return new NextResponse('La sesión no está disponible. Cierra y vuelve a iniciar sesión.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    // Reconocer el recurso por su nombre físico impide saltarse la validación
    // pegando directamente la URL del visor.
    const isAdmin = ['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS'].includes(session.role.toUpperCase());
    const comparableUrl = fileUrl.startsWith('data:') ? '' : decodeURIComponent(fileUrl.split('?')[0]);
    const requestedFilename = comparableUrl ? path.basename(comparableUrl) : '';
    if (!isAdmin && requestedFilename) {
      const isHgFile =
        requestedFilename.toLowerCase().includes('habilidades_generales') ||
        requestedFilename.toLowerCase().includes('hg01');

      const evaluations = await prisma.evaluacion.findMany({
        where: {
          OR: [
            { urlCuadernillo: { contains: requestedFilename } },
            { urlResolucion: { contains: requestedFilename } },
            { urlClaves: { contains: requestedFilename } },
          ],
        },
      });

      if (evaluations.length > 0) {
        const docente = await prisma.usuarioDocente.findUnique({ where: { email: session.email } });
        if (!docente || docente.accesoGranted === false || docente.fechaFin <= new Date()) {
          return new NextResponse('Tu suscripción no está activa.', { status: 403 });
        }

        if (!isHgFile) {
          const hasAccessToAny = evaluations.some((ev) => {
            const resolutionFilename = ev.urlResolucion
              ? path.basename(decodeURIComponent(ev.urlResolucion.split('?')[0]))
              : '';
            const isAvendResolution =
              resolutionFilename === requestedFilename &&
              String(ev.origenResolucion || 'AVEND').toUpperCase() !== 'MINEDU' &&
              ev.proceso !== 'ACCESO_CARGOS_DIRECTIVOS';

            // Si no es resolución privada AVEND (es cuadernillo/claves MINEDU o Directivos) -> tiene acceso
            if (!isAvendResolution) return true;

            return checkDocenteSpecialtyAccess(docente, ev).hasAccess;
          });

          if (!hasAccessToAny) {
            return new NextResponse('Este solucionario AVEND no corresponde a tu nivel y especialidad.', { status: 403 });
          }
        }
      }
    }
    // 1. Manejo de URLs Externas (HTTP / HTTPS)
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      if (!fileUrl.includes('.r2.cloudflarestorage.com')) return NextResponse.json({ error: 'Origen de archivo no permitido.' }, { status: 400 });
      try {
        const forwardHeaders: Record<string, string> = {
          'Accept': 'application/pdf,*/*',
        };
        if (rangeHeader) {
          forwardHeaders['Range'] = rangeHeader;
        }

        const externalRes = await fetch(fileUrl, {
          headers: forwardHeaders,
          cache: 'force-cache',
        });

        if (externalRes.ok) {
          const contentType = externalRes.headers.get('content-type') || 'application/pdf';
          const buffer = Buffer.from(await externalRes.arrayBuffer());

          return new NextResponse(new Uint8Array(buffer), {
            status: externalRes.status,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': 'inline',
              'Access-Control-Allow-Origin': '*',
              'Accept-Ranges': 'bytes',
              'Content-Length': String(buffer.length),
              'Cache-Control': 'private, no-store',
            },
          });
        }
      } catch (externalErr) {
        console.warn('⚠️ [PDF Stream] Error fetching external URL:', externalErr);
      }
    }

    // 2. Manejo de Data URLs Base64 (imágenes o documentos embebidos)
    if (fileUrl.startsWith('data:')) {
      try {
        const matches = fileUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          return servePdfBufferWithRanges(buffer, rangeHeader, fileUrl);
        }
      } catch (dataUrlErr) {
        console.warn('⚠️ [PDF Stream] Error decodificando Data URL:', dataUrlErr);
      }
    }

    // 3. Manejo de Archivos Locales en Disco (public/uploads o storage_uploads)
    const cleanLocalPath = fileUrl.replace(/^\/+/, '').replace(/^api\/pdf-stream\?url=/, '');
    const decodedLocalPath = decodeURIComponent(cleanLocalPath);
    const filename = path.basename(decodedLocalPath);

    const cwd = process.cwd();
    const candidatePaths = [
      path.join(cwd, 'storage_uploads', 'cuadernillos', filename),
      path.join(cwd, 'storage_uploads', 'recursos', filename),
      path.join(cwd, 'public', 'uploads', 'cuadernillos', filename),
      path.join(cwd, 'public', 'uploads', 'recursos', filename),
      path.join('/app', 'public', 'uploads', 'cuadernillos', filename),
      path.join('/app', 'public', 'uploads', 'recursos', filename),
      path.join('/var/www/avend-escala', 'storage_uploads', 'cuadernillos', filename),
      path.join('/var/www/avend-escala', 'storage_uploads', 'recursos', filename),
      path.join('/var/www/avend-escala', 'public', 'uploads', 'cuadernillos', filename),
      path.join('/var/www/avend-escala', 'public', 'uploads', 'recursos', filename),
    ];

    for (const testPath of candidatePaths) {
      try {
        if (fs.existsSync(testPath)) {
          const stats = fs.statSync(testPath);
          if (stats.isFile() && stats.size > 0) {
            const fileBuffer = fs.readFileSync(testPath);
            return servePdfBufferWithRanges(fileBuffer, rangeHeader, testPath);
          }
        }
      } catch (err) {
        // Continua buscando
      }
    }

    // 4. Si el archivo no está en disco local, intentar sincronizar desde Producción Remota
    try {
      const prodCandidates = [
        `https://cuadernillos.avend.pe/uploads/cuadernillos/${filename}`,
        `https://cuadernillos.avend.pe/uploads/recursos/${filename}`,
        `https://cuadernillos.avend.pe/${decodedLocalPath}`,
      ];

      for (const prodUrl of prodCandidates) {
        try {
          const prodRes = await fetch(prodUrl, { cache: 'no-store' });
          if (prodRes.ok) {
            const prodBuffer = Buffer.from(await prodRes.arrayBuffer());

            // Guardar localmente en caché para acelerar siguientes peticiones
            try {
              const targetFolder = filename.startsWith('rec-') ? 'recursos' : 'cuadernillos';
              const localCacheDir = path.join(cwd, 'storage_uploads', targetFolder);
              if (!fs.existsSync(localCacheDir)) {
                fs.mkdirSync(localCacheDir, { recursive: true });
              }
              fs.writeFileSync(path.join(localCacheDir, filename), prodBuffer);
            } catch (saveErr) {
              console.warn('⚠️ [PDF Stream] No se pudo guardar caché local:', saveErr);
            }

            return servePdfBufferWithRanges(prodBuffer, rangeHeader, filename);
          }
        } catch (fetchSubErr) {
          // Continua con la siguiente URL candidata
        }
      }
    } catch (remoteFetchErr) {
      console.warn('⚠️ [PDF Stream] Error fetching from remote production:', remoteFetchErr);
    }

    // 5. Registrar notificación en base de datos para la campanita del administrador
    try {
      if (prisma && (prisma as any).notificacionAdmin) {
        const fileCleanName = filename && filename !== '.' && filename !== 'route.ts' ? filename : 'Recurso Pedagógico';
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await (prisma as any).notificacionAdmin.findFirst({
          where: {
            tipoRecurso: 'RECURSO_PDF',
            titulo: { contains: fileCleanName },
            createdAt: { gte: fiveMinAgo },
          },
        });
        if (!existing) {
          await (prisma as any).notificacionAdmin.create({
            data: {
              tipo: 'RECURSO_FALTANTE',
              titulo: `Material no disponible: ${fileCleanName}`,
              mensaje: `Se solicitó el documento "${fileCleanName}" pero aún no ha sido cargado físicamente en el servidor.`,
              tipoRecurso: 'RECURSO_PDF',
              leido: false,
            },
          });
        }
      }
    } catch (notifErr) {
      console.warn('⚠️ [PDF Stream] No se pudo registrar notificación admin:', notifErr);
    }

    // 6. Si no existe físicamente en disco ni en remoto, responder con pantalla HTML estilizada
    const fallbackTitle = filename && filename !== '.' && filename !== 'route.ts' ? filename : 'Recurso Pedagógico';
    return new NextResponse(renderDocumentPendingHtml(fallbackTitle), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error: any) {
    console.error('❌ [PDF Stream API Error]:', error);
    return new NextResponse(renderDocumentPendingHtml('Error al procesar documento'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  }
}
