// src/app/api/evaluaciones/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateEvaluacionesCache } from '@/services/evaluacionesService';
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
      { success: false, error: { code: 'FORBIDDEN', message: 'Tu cuenta no tiene permiso para gestionar cuadernillos.' } },
      { status: 403 }
    );
  }
  return null;
}

async function saveUploadedFileToDisk(file: File, prefix: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'cuadernillos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Extraer extensión real (.pdf, .xlsx, .docx, etc.)
  const ext = path.extname(file.name).toLowerCase() || '.pdf';
  const cleanBaseName = path.basename(file.name, ext).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${prefix}-${cleanBaseName}-${Date.now()}${ext}`;
  const fullPath = path.join(uploadsDir, filename);

  fs.writeFileSync(fullPath, buffer);
  return `/uploads/cuadernillos/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    try {
      await requireActiveAdminSession('cuadernillos');
    } catch (error: unknown) {
      const response = authorizationErrorResponse(error);
      if (response) return response;
      throw error;
    }
    const formData = await req.formData();

    const proceso = formData.get('proceso') as string;
    const modalidad = formData.get('modalidad') as string;
    const nivel = formData.get('nivel') as string;
    const area = formData.get('area') as string;
    const tipoCuadernillo = formData.get('tipoCuadernillo') as string | null;
    const anio = formData.get('anio') as string;
    const estado = (formData.get('estado') as string) || 'BORRADOR';
    const codigoCuadernillo = formData.get('codigoCuadernillo') as string | null;
    const codigoResolucion = formData.get('codigoResolucion') as string | null;
    const codigoClaves = formData.get('codigoClaves') as string | null;
    const origenCuadernillo = (formData.get('origenCuadernillo') as string) || 'MINEDU';
    const origenResolucion = (formData.get('origenResolucion') as string) || 'AVEND';
    const origenClaves = (formData.get('origenClaves') as string) || 'MINEDU';

    const fileCuadernillo = formData.get('fileCuadernillo') as File | null;
    const fileResolucion = formData.get('fileResolucion') as File | null;
    const fileClaves = formData.get('fileClaves') as File | null;

    const rawUrlCuadernillo = formData.get('urlCuadernillo') as string | null;
    const rawUrlResolucion = formData.get('urlResolucion') as string | null;
    const rawUrlClaves = formData.get('urlClaves') as string | null;

    const fields = z.object({
      proceso: z.string().trim().min(1),
      modalidad: z.string().trim().min(1),
      nivel: z.string().trim().min(1),
      area: z.string().trim().min(1),
      anio: z.string().trim().regex(/^\d{4}$/),
      estado: z.enum(['BORRADOR', 'PUBLICADO']),
    }).safeParse({ proceso, modalidad, nivel, area, anio, estado });
    if (!fields.success) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Datos de evaluación inválidos.' } }, { status: 400 });

    let uploadedUrlCuadernillo: string | null = null;
    let uploadedUrlResolucion: string | null = null;
    let uploadedUrlClaves: string | null = null;

    if (fileCuadernillo && fileCuadernillo.size > 0) {
      if (!(fileCuadernillo instanceof File)) throw new Error('INVALID_FILE');
      uploadedUrlCuadernillo = await saveUploadedFileToDisk(fileCuadernillo, 'cuadernillo');
    } else if (rawUrlCuadernillo && rawUrlCuadernillo.trim() && !rawUrlCuadernillo.startsWith('blob:')) {
      uploadedUrlCuadernillo = rawUrlCuadernillo.trim();
    }

    if (fileResolucion && fileResolucion.size > 0) {
      if (!(fileResolucion instanceof File)) throw new Error('INVALID_FILE');
      uploadedUrlResolucion = await saveUploadedFileToDisk(fileResolucion, 'resolucion');
    } else if (rawUrlResolucion && rawUrlResolucion.trim() && !rawUrlResolucion.startsWith('blob:')) {
      uploadedUrlResolucion = rawUrlResolucion.trim();
    }

    if (fileClaves && fileClaves.size > 0) {
      if (!(fileClaves instanceof File)) throw new Error('INVALID_FILE');
      uploadedUrlClaves = await saveUploadedFileToDisk(fileClaves, 'claves');
    } else if (rawUrlClaves && rawUrlClaves.trim() && !rawUrlClaves.startsWith('blob:')) {
      uploadedUrlClaves = rawUrlClaves.trim();
    }

    const isNivelValido = nivel && nivel.toUpperCase() !== 'NO_APLICA' && !nivel.toLowerCase().includes('no aplica');
    const hasAreaEspecifica = area && area !== 'NO_APLICA' && area !== 'General';
    const tituloGenerado = isNivelValido
      ? (hasAreaEspecifica
          ? `Prueba Única Nacional ${proceso} ${anio} - ${nivel} ${area}`
          : `Prueba Única Nacional ${proceso} ${anio} - ${nivel}`)
      : `Prueba Única Nacional ${proceso} ${anio} - ${area || modalidad}`;

    const targetEvaluationId = formData.get('id') as string | null;
    const customTitulo = formData.get('titulo') as string | null;
    const tituloFinal = customTitulo || tituloGenerado;

    const categoriasRaw = formData.get('categorias') as string | null;
    let categorias: Array<{ modalidad: string; nivel: string; area: string }> = [];
    if (categoriasRaw) {
      try {
        categorias = JSON.parse(categoriasRaw);
      } catch (e) {
        console.warn('⚠️ [API UPLOAD] No se pudo parsear categorias:', e);
      }
    }

    // Si viene asignación múltiple de categorías (ej. Habilidades Generales)
    if (Array.isArray(categorias) && categorias.length > 0) {
      if (estado === 'PUBLICADO' && !uploadedUrlCuadernillo) {
        return NextResponse.json(
          { success: false, error: 'Para publicar en el catálogo docente, es obligatorio adjuntar el Cuadernillo.' },
          { status: 400 }
        );
      }

      let createdCount = 0;
      for (const cat of categorias) {
        const isNivelVal = cat.nivel && cat.nivel.toUpperCase() !== 'NO_APLICA' && !cat.nivel.toLowerCase().includes('no aplica');
        const hasAreaEsp = cat.area && cat.area !== 'NO_APLICA' && cat.area !== 'General';
        const tituloMasivo = isNivelVal
          ? (hasAreaEsp
              ? `Prueba Única Nacional ${proceso} ${anio} - ${tipoCuadernillo || 'Habilidades Generales'} - ${cat.nivel} ${cat.area}`
              : `Prueba Única Nacional ${proceso} ${anio} - ${tipoCuadernillo || 'Habilidades Generales'} - ${cat.nivel}`)
          : `Prueba Única Nacional ${proceso} ${anio} - ${tipoCuadernillo || 'Habilidades Generales'} - ${cat.area || cat.modalidad}`;

        const existingMasivo = await prisma.evaluacion.findFirst({
          where: {
            proceso,
            modalidad: cat.modalidad,
            nivel: cat.nivel,
            area: cat.area,
            anio,
            tipoCuadernillo: tipoCuadernillo || undefined,
          },
        });

        const targetCuadernillo = uploadedUrlCuadernillo || (existingMasivo ? existingMasivo.urlCuadernillo : null);
        const hasValidPdf = Boolean(targetCuadernillo && targetCuadernillo.trim() && !targetCuadernillo.includes('ejemplo.pdf'));
        const estadoFinal = hasValidPdf ? estado : 'BORRADOR';

        if (existingMasivo) {
          await prisma.evaluacion.update({
            where: { id: existingMasivo.id },
            data: {
              titulo: tituloMasivo.trim(),
              urlCuadernillo: uploadedUrlCuadernillo || existingMasivo.urlCuadernillo,
              urlResolucion: uploadedUrlResolucion || existingMasivo.urlResolucion,
              urlClaves: uploadedUrlClaves || existingMasivo.urlClaves,
              origenCuadernillo: origenCuadernillo || existingMasivo.origenCuadernillo,
              origenResolucion: origenResolucion || existingMasivo.origenResolucion,
              origenClaves: origenClaves || existingMasivo.origenClaves,
              codigoCuadernillo: codigoCuadernillo || existingMasivo.codigoCuadernillo,
              codigoResolucion: codigoResolucion || existingMasivo.codigoResolucion,
              codigoClaves: codigoClaves || existingMasivo.codigoClaves,
              estado: estadoFinal,
            } as any,
          });
        } else {
          await prisma.evaluacion.create({
            data: {
              titulo: tituloMasivo.trim(),
              proceso,
              modalidad: cat.modalidad,
              nivel: cat.nivel,
              area: cat.area,
              tipoCuadernillo: tipoCuadernillo || 'Habilidades Generales',
              anio,
              urlCuadernillo: uploadedUrlCuadernillo,
              urlResolucion: uploadedUrlResolucion,
              urlClaves: uploadedUrlClaves,
              codigoCuadernillo: codigoCuadernillo || null,
              codigoResolucion: codigoResolucion || null,
              codigoClaves: codigoClaves || null,
              origenCuadernillo,
              origenResolucion,
              origenClaves,
              estado: estadoFinal,
              esPremium: false,
            } as any,
          });
        }
        createdCount++;
      }

      await invalidateEvaluacionesCache();
      revalidatePath('/admin');
      revalidatePath('/cuadernillos');

      return NextResponse.json({
        success: true,
        data: { count: createdCount },
      });
    }

    const aniosRaw = formData.get('anios') as string | null;
    let aniosList: string[] = [];
    if (aniosRaw) {
      try {
        const parsed = JSON.parse(aniosRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          aniosList = parsed.map((y) => String(y).trim()).filter(Boolean);
        }
      } catch (e) {
        console.warn('⚠️ [API UPLOAD] No se pudo parsear anios:', e);
      }
    }

    // Si viene selección de años (exclusivo para Directivos o guardado en bloque)
    if (aniosList.length > 0 && (!categorias || categorias.length === 0)) {
      if (estado === 'PUBLICADO' && !uploadedUrlCuadernillo) {
        return NextResponse.json(
          { success: false, error: 'Para publicar en el catálogo docente, es obligatorio adjuntar el Cuadernillo.' },
          { status: 400 }
        );
      }

      let countDone = 0;
      for (const yearItem of aniosList) {
        const isDirectivos = proceso === 'ACCESO_CARGOS_DIRECTIVOS';
        const isNivelValidoYear = nivel && nivel.toUpperCase() !== 'NO_APLICA' && !nivel.toLowerCase().includes('no aplica');
        const hasAreaEspYear = area && area !== 'NO_APLICA' && area !== 'General';
        
        const customTitulo = formData.get('titulo') as string | null;
        const tituloYear = customTitulo
          ? customTitulo.replace(/\b(20\d{2})\b/g, yearItem)
          : isDirectivos
          ? `Acceso a Cargos Directivos y Especialistas ${yearItem} - ${area || 'Directivos y Especialistas'}`
          : isNivelValidoYear
          ? (hasAreaEspYear ? `Prueba Única Nacional ${proceso} ${yearItem} - ${nivel} ${area}` : `Prueba Única Nacional ${proceso} ${yearItem} - ${nivel}`)
          : `Prueba Única Nacional ${proceso} ${yearItem} - ${area || modalidad}`;

        const existingYear = await prisma.evaluacion.findFirst({
          where: {
            proceso,
            area: area || undefined,
            anio: String(yearItem),
          },
        });

        const finalUrlCuad = uploadedUrlCuadernillo || existingYear?.urlCuadernillo || null;
        const finalUrlRes = uploadedUrlResolucion || existingYear?.urlResolucion || null;
        const finalUrlClav = uploadedUrlClaves || existingYear?.urlClaves || null;
        const hasValidPdfYear = Boolean(finalUrlCuad && finalUrlCuad.trim() && !finalUrlCuad.includes('ejemplo.pdf'));
        const estadoFinalYear = (estado === 'PUBLICADO' && hasValidPdfYear) ? 'PUBLICADO' : 'BORRADOR';

        if (existingYear) {
          await prisma.evaluacion.update({
            where: { id: existingYear.id },
            data: {
              titulo: tituloYear.trim(),
              urlCuadernillo: finalUrlCuad,
              urlResolucion: finalUrlRes,
              urlClaves: finalUrlClav,
              origenCuadernillo: origenCuadernillo || existingYear.origenCuadernillo,
              origenResolucion: origenResolucion || existingYear.origenResolucion,
              origenClaves: origenClaves || existingYear.origenClaves,
              codigoCuadernillo: codigoCuadernillo || existingYear.codigoCuadernillo,
              codigoResolucion: codigoResolucion || existingYear.codigoResolucion,
              codigoClaves: codigoClaves || existingYear.codigoClaves,
              estado: estadoFinalYear,
            } as any,
          });
        } else {
          await prisma.evaluacion.create({
            data: {
              titulo: tituloYear.trim(),
              proceso,
              modalidad: modalidad || 'EBR',
              nivel: nivel || 'NO_APLICA',
              area: area || 'General',
              tipoCuadernillo: tipoCuadernillo || null,
              anio: String(yearItem),
              urlCuadernillo: finalUrlCuad,
              urlResolucion: finalUrlRes,
              urlClaves: finalUrlClav,
              codigoCuadernillo: codigoCuadernillo || null,
              codigoResolucion: codigoResolucion || null,
              codigoClaves: codigoClaves || null,
              origenCuadernillo,
              origenResolucion,
              origenClaves,
              estado: estadoFinalYear,
              esPremium: false,
            } as any,
          });
        }
        countDone++;
      }

      await invalidateEvaluacionesCache();
      revalidatePath('/admin');
      revalidatePath('/cuadernillos');

      return NextResponse.json({
        success: true,
        data: { count: countDone, anios: aniosList },
      });
    }

    // Detección de Registro Existente por ID (Prioritario) o por Filtros Jerárquicos
    let existing = targetEvaluationId
      ? await prisma.evaluacion.findUnique({ where: { id: targetEvaluationId } })
      : await prisma.evaluacion.findFirst({
          where: {
            proceso,
            modalidad: modalidad || undefined,
            nivel: nivel || undefined,
            area: area || undefined,
            anio,
            tipoCuadernillo: tipoCuadernillo || undefined,
          },
        });

    // VALIDACIÓN ESTRICTA: Solo obligatorios al PUBLICAR al catálogo docente. En BORRADOR se permite guardar avances incompletos.
    const finalUrlCuadernillo = uploadedUrlCuadernillo || existing?.urlCuadernillo || null;
    const finalUrlResolucion = uploadedUrlResolucion || existing?.urlResolucion || null;
    const finalUrlClaves = uploadedUrlClaves || existing?.urlClaves || null;

    if (estado === 'PUBLICADO' && !finalUrlCuadernillo) {
      return NextResponse.json(
        { success: false, error: 'Para publicar en el catálogo docente, es obligatorio adjuntar el Cuadernillo.' },
        { status: 400 }
      );
    }

    let targetId: string;
    const hasValidCuadernillo = Boolean(finalUrlCuadernillo && finalUrlCuadernillo.trim() && !finalUrlCuadernillo.includes('ejemplo.pdf'));
    const canBePublished = hasValidCuadernillo;
    const estadoFinal = (estado === 'PUBLICADO' && canBePublished) ? 'PUBLICADO' : 'BORRADOR';

    if (existing) {
      const updated = await prisma.evaluacion.update({
        where: { id: existing.id },
        data: {
          titulo: tituloFinal,
          proceso: proceso || existing.proceso,
          modalidad: modalidad || existing.modalidad,
          nivel: nivel || existing.nivel,
          area: area || existing.area,
          tipoCuadernillo: tipoCuadernillo !== null && tipoCuadernillo !== undefined ? tipoCuadernillo : existing.tipoCuadernillo,
          anio: anio || existing.anio,
          urlCuadernillo: finalUrlCuadernillo,
          urlResolucion: finalUrlResolucion,
          urlClaves: finalUrlClaves,
          origenCuadernillo: origenCuadernillo || existing.origenCuadernillo,
          origenResolucion: origenResolucion || existing.origenResolucion,
          origenClaves: origenClaves || existing.origenClaves,
          codigoCuadernillo: codigoCuadernillo !== null && codigoCuadernillo !== undefined ? codigoCuadernillo : existing.codigoCuadernillo,
          codigoResolucion: codigoResolucion !== null && codigoResolucion !== undefined ? codigoResolucion : existing.codigoResolucion,
          codigoClaves: codigoClaves !== null && codigoClaves !== undefined ? codigoClaves : existing.codigoClaves,
          estado: estadoFinal,
        } as any,
      });
      targetId = updated.id;
    } else {
      const created = await prisma.evaluacion.create({
        data: {
          titulo: tituloGenerado,
          proceso,
          modalidad,
          nivel,
          area,
          tipoCuadernillo: tipoCuadernillo || null,
          anio,
          urlCuadernillo: finalUrlCuadernillo,
          urlResolucion: finalUrlResolucion || null,
          urlClaves: finalUrlClaves || null,
          origenCuadernillo,
          origenResolucion,
          origenClaves,
          codigoCuadernillo: codigoCuadernillo || null,
          codigoResolucion: codigoResolucion || null,
          codigoClaves: codigoClaves || null,
          estado: estadoFinal,
          esPremium: false,
        } as any,
      });
      targetId = created.id;
    }

    await invalidateEvaluacionesCache();
    revalidatePath('/admin');
    revalidatePath('/cuadernillos');

    return NextResponse.json({
      success: true,
      data: { id: targetId, urlCuadernillo: finalUrlCuadernillo, urlResolucion: finalUrlResolucion, urlClaves: finalUrlClaves, updated: Boolean(existing) },
    });
  } catch (error: unknown) {
    console.error('❌ [API UPLOAD EVALUACION ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UPLOAD_FAILED', message: 'Error al guardar archivo en hosting.' },
      },
      { status: 500 }
    );
  }
}
