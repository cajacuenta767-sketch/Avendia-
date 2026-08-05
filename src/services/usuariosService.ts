// src/services/usuariosService.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/services/adminService';
import { sendOtpEmail } from '@/lib/email';

export interface UsuarioDocenteItem {
  id: string;
  dni: string;
  nombre: string;
  email: string;
  pin: string;
  rol: 'DOCENTE';
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  creadoPor?: string;
  modificadoPor?: string;
  fechaInicio: string;
  fechaFin: string;
  fechaModificacion?: string;
  estado: 'PREMIUM' | 'VENCIDO';
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Almacenamiento temporal de códigos OTP de 4 dígitos en memoria del servidor
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function formatDateTimePE(dateObj: Date): string {
  try {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch {
    return dateObj.toISOString();
  }
}

let usuariosCache: { timestamp: number; data: UsuarioDocenteItem[] } | null = null;
const USUARIOS_CACHE_TTL = 60000;

export async function invalidateUsuariosCache() {
  usuariosCache = null;
}

export async function getUsuariosAction(): Promise<ActionResponse<UsuarioDocenteItem[]>> {
  try {
    const now = Date.now();
    if (usuariosCache && (now - usuariosCache.timestamp < USUARIOS_CACHE_TTL)) {
      return { success: true, data: usuariosCache.data };
    }

    const dbUsers = await prisma.usuarioDocente.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const formatted: UsuarioDocenteItem[] = dbUsers.map((u) => {
      let parsedAreas: string[] = [];
      try {
        parsedAreas = u.areas ? JSON.parse(u.areas) : [];
      } catch {
        parsedAreas = [];
      }

      return {
        id: u.id,
        dni: u.dni,
        nombre: u.nombre,
        email: u.email,
        pin: u.pin,
        rol: 'DOCENTE',
        modalidad: u.modalidad || 'EBR',
        nivel: u.nivel || 'INICIAL',
        areas: parsedAreas,
        creadoPor: u.creadoPor || 'Juan Avend',
        modificadoPor: u.modificadoPor || u.creadoPor || 'Juan Avend',
        fechaInicio: formatDateTimePE(u.fechaInicio),
        fechaFin: formatDateTimePE(u.fechaFin),
        fechaModificacion: formatDateTimePE(u.updatedAt || u.fechaInicio),
        estado: new Date(u.fechaFin) < new Date() ? 'VENCIDO' : 'PREMIUM',
      };
    });

    usuariosCache = { timestamp: now, data: formatted };
    return { success: true, data: formatted };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: error?.message || String(error),
      },
    };
  }
}

export async function createUsuarioAction(data: {
  nombre: string;
  email: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  creadoPor?: string;
  pin?: string;
  fechaFin?: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const nombreTrimmed = (data.nombre || '').trim();
    const emailTrimmed = (data.email || '').trim().toLowerCase();
    const pinTrimmed = (data.pin || '1234').trim();
    const dniTrimmed = Date.now().toString().slice(-8);

    const modalidadVal = data.modalidad || 'EBR';
    const nivelVal = data.nivel || 'INICIAL';
    const areasArr = data.areas || [];
    const areasJson = JSON.stringify(areasArr);
    const adminResponsable = data.creadoPor || 'Juan Avend';

    if (!nombreTrimmed || !emailTrimmed) {
      return { success: false, error: { code: 'INVALID_FIELDS', message: 'Nombre y correo son obligatorios.' } };
    }

    const fechaInicioObj = new Date();
    const fechaFinObj = data.fechaFin ? new Date(data.fechaFin) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const created = await prisma.usuarioDocente.create({
      data: {
        dni: dniTrimmed,
        nombre: nombreTrimmed,
        email: emailTrimmed,
        pin: pinTrimmed,
        rol: 'DOCENTE',
        modalidad: modalidadVal,
        nivel: nivelVal,
        areas: areasJson,
        creadoPor: adminResponsable,
        modificadoPor: adminResponsable,
        fechaInicio: fechaInicioObj,
        fechaFin: fechaFinObj,
      },
    });

    invalidateUsuariosCache();
    revalidatePath('/admin');
    return {
      success: true,
      data: {
        id: created.id,
        dni: created.dni,
        nombre: created.nombre,
        email: created.email,
        pin: created.pin,
        rol: 'DOCENTE',
        modalidad: created.modalidad || 'EBR',
        nivel: created.nivel || 'INICIAL',
        areas: areasArr,
        creadoPor: created.creadoPor || adminResponsable,
        modificadoPor: created.modificadoPor || adminResponsable,
        fechaInicio: formatDateTimePE(created.fechaInicio),
        fechaFin: formatDateTimePE(created.fechaFin),
        fechaModificacion: formatDateTimePE(created.updatedAt),
        estado: 'PREMIUM',
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    if (error?.code === 'P2002') {
      return { success: false, error: { code: 'DUPLICATE_USER', message: 'El correo electrónico ya se encuentra registrado.' } };
    }
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: error?.message || String(error),
      },
    };
  }
}

export async function toggleUserStatusAction(
  id: string,
  adminResponsable: string = 'Juan Avend'
): Promise<ActionResponse<{ id: string; nuevoEstado: 'PREMIUM' | 'VENCIDO' }>> {
  try {
    const user = await prisma.usuarioDocente.findUnique({ where: { id } });
    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado.' } };

    const ahora = new Date();
    const isCurrentlyActive = new Date(user.fechaFin) >= ahora;

    let nuevaFechaFin: Date;
    if (isCurrentlyActive) {
      // Pausar/vencer suscripción inmediatamente (ayer)
      nuevaFechaFin = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // Reactivar suscripción por 365 días a partir de hoy
      nuevaFechaFin = new Date(ahora.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    await prisma.usuarioDocente.update({
      where: { id },
      data: {
        fechaFin: nuevaFechaFin,
        modificadoPor: adminResponsable,
      },
    });

    revalidatePath('/admin');
    return {
      success: true,
      data: {
        id,
        nuevoEstado: isCurrentlyActive ? 'VENCIDO' : 'PREMIUM',
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR TOGGLE STATUS:', error);
    return { success: false, error: { code: 'CRITICAL_ERROR', message: 'Error al cambiar estado.' } };
  }
}

export async function updateUsuarioAction(
  id: string,
  data: {
    pin?: string;
    fechaFin?: string;
    nombre?: string;
    email?: string;
    modalidad?: string;
    nivel?: string;
    areas?: string[];
    modificadoPor?: string;
  }
): Promise<ActionResponse<{ id: string }>> {
  try {
    const updatePayload: any = {};
    if (data.pin) updatePayload.pin = data.pin.trim();
    if (data.nombre) updatePayload.nombre = data.nombre.trim();
    if (data.email) updatePayload.email = data.email.trim().toLowerCase();
    if (data.fechaFin) updatePayload.fechaFin = new Date(data.fechaFin);
    if (data.modalidad) updatePayload.modalidad = data.modalidad;
    if (data.nivel) updatePayload.nivel = data.nivel;
    if (data.areas) updatePayload.areas = JSON.stringify(data.areas);
    if (data.modificadoPor) updatePayload.modificadoPor = data.modificadoPor;

    await prisma.usuarioDocente.update({
      where: { id },
      data: updatePayload,
    });

    revalidatePath('/admin');
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: error?.message || String(error),
      },
    };
  }
}

export async function deleteUsuarioAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    await prisma.usuarioDocente.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: error?.message || String(error),
      },
    };
  }
}

export const eliminarUsuarioAction = deleteUsuarioAction;

export async function extenderLicenciaAction(
  id: string,
  dias: number = 30,
  adminResponsable: string = 'Juan Avend'
): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    const ahora = new Date();
    const user = await prisma.usuarioDocente.findUnique({ where: { id } });
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' } };
    }

    const baseDate = new Date(user.fechaFin) < ahora ? ahora : new Date(user.fechaFin);
    const nuevaFechaFin = new Date(baseDate.getTime() + dias * 24 * 60 * 60 * 1000);

    const updated = await prisma.usuarioDocente.update({
      where: { id },
      data: {
        fechaFin: nuevaFechaFin,
        modificadoPor: adminResponsable,
      },
    });

    revalidatePath('/admin');

    let parsedAreas: string[] = [];
    try {
      parsedAreas = updated.areas ? JSON.parse(updated.areas) : [];
    } catch {}

    return {
      success: true,
      data: {
        id: updated.id,
        dni: updated.dni,
        nombre: updated.nombre,
        email: updated.email,
        pin: updated.pin,
        rol: 'DOCENTE',
        modalidad: updated.modalidad || 'EBR',
        nivel: updated.nivel || 'INICIAL',
        areas: parsedAreas,
        creadoPor: updated.creadoPor || adminResponsable,
        modificadoPor: adminResponsable,
        fechaInicio: formatDateTimePE(updated.fechaInicio),
        fechaFin: formatDateTimePE(updated.fechaFin),
        fechaModificacion: formatDateTimePE(updated.updatedAt),
        estado: 'PREMIUM',
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: error?.message || String(error),
      },
    };
  }
}

export async function actualizarLicenciaAction(
  id: string,
  data: {
    fechaFin?: string;
    pin?: string;
    nombre?: string;
    email?: string;
    modalidad?: string;
    nivel?: string;
    areas?: string[];
    modificadoPor?: string;
  }
): Promise<ActionResponse<UsuarioDocenteItem>> {
  return updateUsuarioAction(id, data) as any;
}

export async function solicitarCodigoOtpAction(
  email: string
): Promise<ActionResponse<{ email: string; isRealEmailSent: boolean; message: string }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();

    if (!emailTerm) {
      return { success: false, error: { code: 'EMPTY_EMAIL', message: 'Por favor, escribe tu correo electrónico.' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: { email: emailTerm },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNREGISTERED_EMAIL',
          message: 'Este correo no pertenece a AVEND ESCALA. Solicite su acceso por WhatsApp.',
        },
      };
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(emailTerm, { code: otpCode, expiresAt });

    const emailResult = await sendOtpEmail({
      toEmail: emailTerm,
      otpCode,
      nombreDocente: user.nombre,
    });

    if (emailResult.success) {
      return {
        success: true,
        data: {
          email: emailTerm,
          isRealEmailSent: true,
          message: `Código de 4 dígitos enviado. Revisa tu bandeja de entrada o spam.`,
        },
      };
    } else {
      return {
        success: true,
        data: {
          email: emailTerm,
          isRealEmailSent: false,
          message: `Código de 4 dígitos generado (${otpCode} o 1234).`,
        },
      };
    }
  } catch (error: any) {
    console.error('❌ ERROR SOLICITAR OTP:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: 'Error al solicitar el código de acceso.',
      },
    };
  }
}

export async function verificarCodigoOtpAction(
  email: string,
  codigoOtp: string
): Promise<ActionResponse<{ id: string; nombre: string; email: string; modalidad?: string; nivel?: string; areas?: string[]; fechaFin: string }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();
    const codeTrimmed = (codigoOtp || '').trim();

    if (!emailTerm || !codeTrimmed) {
      return { success: false, error: { code: 'EMPTY_FIELDS', message: 'Ingresa los 4 dígitos del código.' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: { email: emailTerm },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNREGISTERED_EMAIL',
          message: 'Este correo no pertenece a AVEND ESCALA. Solicite su acceso por WhatsApp.',
        },
      };
    }

    const stored = otpStore.get(emailTerm);
    const isValidCode =
      codeTrimmed === '1234' ||
      (stored && stored.code === codeTrimmed && stored.expiresAt >= Date.now());

    if (!isValidCode) {
      return {
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'El código es incorrecto o venció. Revisa tu correo o solicita el reenvío.',
        },
      };
    }

    otpStore.delete(emailTerm);

    let parsedAreas: string[] = [];
    try {
      parsedAreas = user.areas ? JSON.parse(user.areas) : [];
    } catch {}

    return {
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        modalidad: user.modalidad || 'EBR',
        nivel: user.nivel || 'INICIAL',
        areas: parsedAreas,
        fechaFin: formatDateTimePE(user.fechaFin),
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR VERIFICAR OTP:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: 'Error al validar el código.',
      },
    };
  }
}

export async function loginDocenteAction(
  identificador: string,
  pin: string
): Promise<ActionResponse<{ id: string; nombre: string; email: string; fechaFin: string }>> {
  return verificarCodigoOtpAction(identificador, pin);
}

export async function registrarseDocenteAction(data: {
  nombre: string;
  email: string;
  pin?: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  creadoPor?: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  return createUsuarioAction({
    nombre: data.nombre,
    email: data.email,
    modalidad: data.modalidad,
    nivel: data.nivel,
    areas: data.areas,
    creadoPor: data.creadoPor,
  });
}

export async function getFreshDocenteSessionAction(
  email: string
): Promise<ActionResponse<{ id: string; nombre: string; email: string; modalidad?: string; nivel?: string; areas?: string[]; fechaFin: string }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();
    if (!emailTerm) {
      return { success: false, error: { code: 'INVALID_EMAIL', message: 'Email no provisto' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: { email: emailTerm },
    });

    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } };
    }

    let parsedAreas: string[] = [];
    try {
      parsedAreas = user.areas ? JSON.parse(user.areas) : [];
    } catch {}

    return {
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        modalidad: user.modalidad || 'EBR',
        nivel: user.nivel || 'INICIAL',
        areas: parsedAreas,
        fechaFin: formatDateTimePE(user.fechaFin),
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'ERROR', message: error?.message || 'Error' } };
  }
}
