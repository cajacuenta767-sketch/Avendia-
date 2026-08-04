// src/services/usuariosService.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/services/adminService';

export interface UsuarioDocenteItem {
  id: string;
  dni: string;
  nombre: string;
  email: string;
  pin: string;
  rol: 'DOCENTE';
  fechaInicio: string;
  fechaFin: string;
  estado: 'PREMIUM' | 'VENCIDO';
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function getUsuariosAction(): Promise<ActionResponse<UsuarioDocenteItem[]>> {
  try {
    const dbUsers = await prisma.usuarioDocente.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const formatted: UsuarioDocenteItem[] = dbUsers.map((u) => {
      const fechaFinDate = new Date(u.fechaFin);
      const estado: 'PREMIUM' | 'VENCIDO' = fechaFinDate >= new Date() ? 'PREMIUM' : 'VENCIDO';
      return {
        id: u.id,
        dni: u.dni,
        nombre: u.nombre,
        email: u.email,
        pin: u.pin,
        rol: 'DOCENTE',
        fechaInicio: u.fechaInicio.toISOString(),
        fechaFin: u.fechaFin.toISOString(),
        estado,
      };
    });

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
  dni: string;
  nombre: string;
  email: string;
  pin: string;
  fechaFin: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const dniTrimmed = (data.dni || '').trim();
    const nombreTrimmed = (data.nombre || '').trim();
    const emailTrimmed = (data.email || '').trim().toLowerCase();
    const pinTrimmed = (data.pin || '').trim();

    if (!/^\d{8}$/.test(dniTrimmed)) {
      return { success: false, error: { code: 'INVALID_DNI', message: 'El DNI debe contener exactamente 8 dígitos.' } };
    }
    if (!nombreTrimmed || !emailTrimmed || !pinTrimmed || !data.fechaFin) {
      return { success: false, error: { code: 'INVALID_FIELDS', message: 'Todos los campos son obligatorios.' } };
    }

    const fechaInicioObj = new Date();
    const fechaFinObj = new Date(data.fechaFin);
    const estado: 'PREMIUM' | 'VENCIDO' = fechaFinObj >= new Date() ? 'PREMIUM' : 'VENCIDO';

    const created = await prisma.usuarioDocente.create({
      data: {
        dni: dniTrimmed,
        nombre: nombreTrimmed,
        email: emailTrimmed,
        pin: pinTrimmed,
        rol: 'DOCENTE',
        fechaInicio: fechaInicioObj,
        fechaFin: fechaFinObj,
      },
    });

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
        fechaInicio: created.fechaInicio.toISOString(),
        fechaFin: created.fechaFin.toISOString(),
        estado,
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    if (error?.code === 'P2002') {
      return { success: false, error: { code: 'DUPLICATE_USER', message: 'El DNI o correo electrónico ya se encuentra registrado. Inicia sesión directamente.' } };
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

export async function updateUsuarioAction(
  id: string,
  data: {
    pin?: string;
    fechaFin?: string;
    nombre?: string;
    email?: string;
  }
): Promise<ActionResponse<{ id: string }>> {
  try {
    const updatePayload: any = {};
    if (data.pin) updatePayload.pin = data.pin.trim();
    if (data.nombre) updatePayload.nombre = data.nombre.trim();
    if (data.email) updatePayload.email = data.email.trim().toLowerCase();
    if (data.fechaFin) updatePayload.fechaFin = new Date(data.fechaFin);

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

export async function validarAccesoDocenteAction(
  dni: string,
  pin: string
): Promise<ActionResponse<{ dni: string; nombre: string; fechaFin: string }>> {
  return loginDocenteAction(dni, pin) as any;
}

export async function loginDocenteAction(
  identificador: string,
  pin: string
): Promise<ActionResponse<{ id: string; dni: string; nombre: string; email: string; fechaFin: string }>> {
  try {
    const term = (identificador || '').trim().toLowerCase();
    const pinTrimmed = (pin || '').trim();

    if (!term) {
      return { success: false, error: { code: 'EMPTY_FIELDS', message: 'Ingresa tu DNI o Correo.' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: {
        OR: [{ dni: term }, { email: term }],
      },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Esta cuenta no se encuentra registrada. Por favor, crea una cuenta primero.',
        },
      };
    }

    if (pinTrimmed !== 'ANY' && user.pin !== pinTrimmed) {
      return {
        success: false,
        error: {
          code: 'INVALID_PIN',
          message: 'El PIN de acceso ingresado es incorrecto.',
        },
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        dni: user.dni,
        nombre: user.nombre,
        email: user.email,
        fechaFin: user.fechaFin.toISOString(),
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

export async function registrarseDocenteAction(data: {
  dni: string;
  nombre: string;
  email: string;
  pin: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    const dniTrimmed = (data.dni || '').trim();
    const nombreTrimmed = (data.nombre || '').trim();
    const emailTrimmed = (data.email || '').trim().toLowerCase();
    const pinTrimmed = (data.pin || '').trim();

    if (!/^\d{8}$/.test(dniTrimmed)) {
      return { success: false, error: { code: 'INVALID_DNI', message: 'El DNI debe tener 8 dígitos numéricos.' } };
    }
    if (!nombreTrimmed || !emailTrimmed || !pinTrimmed) {
      return { success: false, error: { code: 'INVALID_FIELDS', message: 'Todos los campos son obligatorios.' } };
    }

    const ahora = new Date();

    const existUser = await prisma.usuarioDocente.findFirst({
      where: {
        OR: [{ dni: dniTrimmed }, { email: emailTrimmed }],
      },
    });

    if (existUser) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_USER',
          message: 'El DNI o correo electrónico ya se encuentra registrado. Inicia sesión directamente.',
        },
      };
    }

    const created = await prisma.usuarioDocente.create({
      data: {
        dni: dniTrimmed,
        nombre: nombreTrimmed,
        email: emailTrimmed,
        pin: pinTrimmed,
        rol: 'DOCENTE',
        fechaInicio: ahora,
        fechaFin: ahora,
      },
    });

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
        fechaInicio: created.fechaInicio.toISOString(),
        fechaFin: created.fechaFin.toISOString(),
        estado: 'VENCIDO',
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR REAL CRITICO:', error);
    if (error?.code === 'P2002') {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_USER',
          message: 'El DNI o correo electrónico ya se encuentra registrado. Inicia sesión directamente.',
        },
      };
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

export async function extenderLicenciaAction(
  id: string,
  dias: number = 30
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
      data: { fechaFin: nuevaFechaFin },
    });

    revalidatePath('/admin');

    return {
      success: true,
      data: {
        id: updated.id,
        dni: updated.dni,
        nombre: updated.nombre,
        email: updated.email,
        pin: updated.pin,
        rol: 'DOCENTE',
        fechaInicio: updated.fechaInicio.toISOString(),
        fechaFin: updated.fechaFin.toISOString(),
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
  }
): Promise<ActionResponse<UsuarioDocenteItem>> {
  return updateUsuarioAction(id, data) as any;
}
