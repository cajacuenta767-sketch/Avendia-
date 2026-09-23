// src/services/usuariosService.ts
'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/services/adminService';
import { sendOtpEmail } from '@/lib/email';
import { buildDocenteAccessBadge, buildDocenteAccessBadges, condenseAccessBadges } from '@/utils/badgeUtils';
import { setServerSession } from '@/lib/serverSession';
import { z } from 'zod';
import { generateDocentePin, normalizeDocentePin } from '@/lib/docentePin';
import { USER_IMPORT_COLUMN_FIELDS } from '@/types/userImport';
import type {
  BulkDocenteRecord,
  BulkImportOptions,
  ImportMembershipPolicy,
  ImportReport,
  MembershipRole,
} from '@/types/userImport';
import type { Prisma } from '@prisma/client';
import type { AccountAccessState } from '@/lib/whatsapp';

export type { BulkDocenteRecord, BulkImportOptions, ImportReport } from '@/types/userImport';

const INVALID_DOCENTE_NAMES_SET = new Set([
  'JUAN AVEND',
  'YADIRA AVENDAÑO Q.',
  'YADIRA AVENDAÑO Q',
  'YADIRA AVENDAÑO',
  'SIN ASIGNAR',
  'SINASIGNAR',
  'DOCENTE AVEND',
  'ADMINISTRADOR',
  'SUPERADMINISTRADOR AVEND',
  'SUPERADMINISTRADOR',
  'SISTEMA AVEND',
  'DOCENTE',
  '-',
  '—',
  'N/A',
  'NULL',
  'UNDEFINED'
]);

function resolveAccountAccessState(user: {
  rol: string;
  fechaFin: Date;
  accesoGranted: boolean | null;
}): AccountAccessState {
  const normalizedRole = (user.rol || '').trim().toUpperCase();
  const isExpired = user.fechaFin.getTime() <= Date.now();
  const isTrial = normalizedRole.includes('PRUEBA') || normalizedRole.includes('24H') || normalizedRole.includes('TRIAL');

  if (normalizedRole === 'CLIENTE') return 'EN_ESPERA';
  if (isTrial && isExpired) return 'PRUEBA_FINALIZADA';
  if (user.accesoGranted === false) return 'PAUSADA';
  if (isExpired) return 'VENCIDA';
  return 'ACTIVA';
}

export interface UsuarioDocenteItem {
  id: string;
  createdAt?: string;
  dni: string;
  telefono?: string;
  nombre: string;
  email: string;
  pin: string;
  rol: 'DOCENTE' | 'PRUEBA_GRATIS_24H' | string;
  modalidad?: string;
  nivel?: string;
  region?: string;
  institucionEducativa?: string;
  areas?: string[];
  tiposAcceso?: string[];
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

export async function generateRandomPin(): Promise<string> {
  return generateDocentePin();
}

const fourDigitCodeSchema = z.string().trim().regex(/^\d{4}$/);

const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}, 'Fecha inválida');

const updateUsuarioSchema = z.object({
  pin: z.union([z.literal(''), fourDigitCodeSchema]).optional(),
  telefono: z.string().trim().max(30).optional(),
  fechaInicio: isoDateSchema.optional(),
  fechaFin: isoDateSchema.optional(),
  nombre: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().optional(),
  region: z.string().trim().max(100).optional(),
  institucionEducativa: z.string().trim().max(200).optional(),
  modalidad: z.string().trim().max(50).optional(),
  nivel: z.string().trim().max(80).optional(),
  areas: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  tiposAcceso: z.array(z.enum(['Ascenso', 'Nombramiento', 'Directivo'])).max(3).optional(),
  renewSubscription: z.boolean().optional(),
  modificadoPor: z.string().trim().max(160).optional(),
}).strict();

function parseSpecificTiposAcceso(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const text = String(raw).trim();
  if (!text) return [];

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const up = text.toUpperCase();
  const result: string[] = [];

  if (up.includes('ASCENSO') || up.includes('ESCALA')) {
    result.push('Ascenso');
  }
  if (up.includes('NOMBRAMIENTO') || up.includes('PUN') || up.includes('INGRESO A LA CPM')) {
    result.push('Nombramiento');
  }
  if (up.includes('DIRECTIV') || up.includes('CARGOS DIRECTIVOS') || up.includes('DIRECTOR') || up.includes('SUBDIRECTOR') || up.includes('ESPECIALISTAS')) {
    result.push('Directivo');
  }

  if (up.includes('TODO') || up.includes('FULL') || up.includes('COMPLETO') || up.includes('GLOBAL')) {
    return ['Ascenso', 'Nombramiento', 'Directivo'];
  }

  return result;
}

function parseValidDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const invalidDate = new Date(0);
  const parsed = parseToDateObj(value, invalidDate);
  return parsed.getTime() === invalidDate.getTime() ? null : parsed;
}

// Resuelve Rol, Estados, Vigencia y Accesos Individuales
function resolveUserAccessAndRole(
  rawRol?: string,
  rawEstado?: string,
  explicitFechaFin?: any,
  rawTiposAcceso?: any
): {
  rolFinal: 'PREMIUM' | 'PRUEBA_GRATIS_24H' | 'CLIENTE';
  fechaInicio: Date;
  fechaFin: Date;
  tiposAcceso: string[];
  isActivo: boolean;
} {
  const ahora = new Date();
  const rolUpper = (rawRol || '').toUpperCase().trim();
  const estadoUpper = (rawEstado || '').toUpperCase().trim();

  const isExplicitInactivo = estadoUpper === 'INACTIVO' || estadoUpper === 'VENCIDO' || estadoUpper === 'BLOQUEADO';

  // 1. Identificar Rol
  let rolFinal: 'PREMIUM' | 'PRUEBA_GRATIS_24H' | 'CLIENTE' = 'CLIENTE';

  if (rolUpper.includes('PREMIUM') || rolUpper === 'DOCENTE') {
    rolFinal = 'PREMIUM';
  } else if (rolUpper.includes('PRUEBA') || rolUpper.includes('24H') || rolUpper.includes('TRIAL') || rolUpper.includes('GRATIS')) {
    rolFinal = 'PRUEBA_GRATIS_24H';
  } else {
    rolFinal = 'CLIENTE';
  }

  // Determinar Accesos Individuales según la columna o datos del docente
  const parsedIndividual = parseSpecificTiposAcceso(rawTiposAcceso);

  // 2. Premium/DOCENTE tiene prioridad sobre un estado histórico vencido o inactivo.
  // Esto permite que un nuevo Excel promocione una prueba o cuenta vencida a Premium.
  if (rolFinal === 'PREMIUM') {
    // 🌟 SOLO PREMIUM TIENE 1 AÑO COMPLETO EN AUTOMÁTICO
    const fechaFin = parseValidDate(explicitFechaFin)
      ?? new Date(ahora.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Asigna los 3 tipos de acceso por defecto si no se indica otro
    const accesosFinales = parsedIndividual.length > 0 ? parsedIndividual : ['Ascenso', 'Nombramiento', 'Directivo'];

    return {
      rolFinal: 'PREMIUM',
      fechaInicio: ahora,
      fechaFin,
      tiposAcceso: accesosFinales,
      isActivo: true,
    };
  }

  // 3. Un estado explícitamente inactivo solo se aplica a planes no Premium.
  if (isExplicitInactivo) {
    return {
      rolFinal,
      fechaInicio: ahora,
      fechaFin: new Date(ahora.getTime() - 24 * 60 * 60 * 1000), // Ayer (Vencido)
      tiposAcceso: [],
      isActivo: false,
    };
  }

  if (rolFinal === 'PRUEBA_GRATIS_24H') {
    // ⏳ SOLO 24 HORAS EXACTAS
    const accesosFinales = parsedIndividual.length > 0 ? parsedIndividual : ['Ascenso', 'Nombramiento', 'Directivo'];
    return {
      rolFinal: 'PRUEBA_GRATIS_24H',
      fechaInicio: ahora,
      fechaFin: new Date(ahora.getTime() + 24 * 60 * 60 * 1000),
      tiposAcceso: accesosFinales,
      isActivo: true,
    };
  }

  // 👤 ROL CLIENTE: REGISTRADO EN BD PERO SIN ACCESO HASTA HABILITACIÓN MANUAL
  return {
    rolFinal: 'CLIENTE',
    fechaInicio: ahora,
    fechaFin: new Date(ahora.getTime() - 24 * 60 * 60 * 1000), // Inactivo por defecto
    tiposAcceso: [],
    isActivo: false,
  };
}

// Función para calcular fechaFin garantizando 1 año para Premium y 24h para Prueba Gratis
function calculateExpirationDate(rol?: string, explicitFechaFin?: any, tiposAcceso?: any): Date {
  const resolved = resolveUserAccessAndRole(rol, undefined, explicitFechaFin, tiposAcceso);
  return resolved.fechaFin;
}

// Almacenamiento temporal de códigos OTP de 4 dígitos en memoria del servidor
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const otpAttempts = new Map<string, { count: number; resetAt: number }>();

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
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const now = Date.now();
    if (usuariosCache && (now - usuariosCache.timestamp < USUARIOS_CACHE_TTL)) {
      return { success: true, data: usuariosCache.data };
    }

    const dbUsers = await prisma.usuarioDocente.findMany({
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    const formatted: UsuarioDocenteItem[] = dbUsers.map((u) => {
      let parsedAreas: string[] = [];
      try {
        parsedAreas = u.areas ? JSON.parse(u.areas) : [];
      } catch {
        parsedAreas = [];
      }

      let parsedTiposAcceso: string[] = [];
      try {
        if (u.tiposAcceso) {
          const parsed = JSON.parse(u.tiposAcceso);
          if (Array.isArray(parsed)) {
            parsedTiposAcceso = parsed;
          }
        }
      } catch {
        parsedTiposAcceso = [];
      }

      // Si u.observacion o u.dni contienen dígitos de teléfono (mínimo 6 dígitos)
      const obsDigits = (u.observacion || '').replace(/[^0-9+]/g, '');
      const dniDigits = (u.dni && !u.dni.startsWith('USR-') ? u.dni : '').replace(/[^0-9+]/g, '');
      const phoneCandidate = obsDigits.length >= 6 ? obsDigits : (dniDigits.length >= 6 ? dniDigits : '');

      return {
        id: u.id,
        createdAt: u.createdAt.toISOString(),
        dni: u.dni || '',
        telefono: phoneCandidate || '',
        nombre: u.nombre,
        email: u.email,
        pin: normalizeDocentePin(u.pin) || '',
        rol: (u.rol as any) || 'DOCENTE',
        modalidad: u.modalidad || 'EBR',
        nivel: u.nivel || 'INICIAL',
        region: (u as any).region || 'Lima',
        institucionEducativa: (u as any).institucionEducativa || '',
        areas: parsedAreas,
        tiposAcceso: parsedTiposAcceso,
        creadoPor: u.creadoPor || 'Administrador',
        modificadoPor: u.modificadoPor || u.creadoPor || 'Administrador',
        fechaInicio: formatDateTimePE(u.fechaInicio),
        fechaFin: formatDateTimePE(u.fechaFin),
        fechaModificacion: formatDateTimePE(u.updatedAt || u.fechaInicio),
        estado: new Date(u.fechaFin) < new Date() ? 'VENCIDO' : 'PREMIUM',
      };
    });

    usuariosCache = { timestamp: now, data: formatted };
    return { success: true, data: formatted };
  } catch (error: any) {
    console.error('❌ ERROR GET USUARIOS:', error);
    return { success: false, error: { code: 'CRITICAL_ERROR', message: 'Error al obtener usuarios' } };
  }
}

function parseToDateObj(dateStr?: string | Date | null, fallback: Date = new Date()): Date {
  if (!dateStr) return fallback;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? fallback : dateStr;

  try {
    const trimmed = String(dateStr).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const localMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    const match = isoMatch || localMatch;

    if (match) {
      const year = Number(isoMatch ? match[1] : match[3].length === 2 ? `20${match[3]}` : match[3]);
      const month = Number(isoMatch ? match[2] : match[2]);
      const day = Number(isoMatch ? match[3] : match[1]);
      const parsed = new Date(year, month - 1, day, 12, 0, 0);

      if (
        !isNaN(parsed.getTime()) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }
    }

    const standardParsed = new Date(dateStr);
    if (!isNaN(standardParsed.getTime())) return standardParsed;
  } catch {}
  return fallback;
}

export async function createUsuarioAction(data: {
  nombre: string;
  email: string;
  telefono?: string;
  rol?: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  tiposAcceso?: string[];
  creadoPor?: string;
  pin?: string;
  fechaInicio?: string;
  fechaFin?: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };

    const nombreTrimmed = (data.nombre || '').trim();
    const emailTrimmed = (data.email || '').trim().toLowerCase();
    const requestedPinRaw = data.pin?.trim() || '';
    const requestedPin = normalizeDocentePin(requestedPinRaw);
    const telefonoTrimmed = (data.telefono || '').trim();
    const dniTrimmed = telefonoTrimmed ? telefonoTrimmed.replace(/[^0-9+]/g, '') : 'USR-' + Date.now().toString().slice(-6);

    const modalidadVal = data.modalidad || 'EBR';
    const nivelVal = data.nivel || 'INICIAL';
    const areasArr = data.areas || [];
    const areasJson = JSON.stringify(areasArr);
    const tiposAccesoArr = data.tiposAcceso && data.tiposAcceso.length > 0 ? data.tiposAcceso : ['Ascenso', 'Nombramiento', 'Directivo'];
    const tiposAccesoJson = JSON.stringify(tiposAccesoArr);
    const adminResponsable = data.creadoPor || 'Administrador';

    let finalNombre = (data.nombre || '').trim();
    const isNameInvalid = !finalNombre || INVALID_DOCENTE_NAMES_SET.has(finalNombre.toUpperCase());
    if (isNameInvalid) {
      const emailLocal = emailTrimmed.split('@')[0] || 'docente';
      finalNombre = emailLocal
        .replace(/[._-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    if (!emailTrimmed) {
      return { success: false, error: { code: 'INVALID_FIELDS', message: 'El correo electrónico es obligatorio.' } };
    }

    if (requestedPinRaw && !requestedPin) {
      return { success: false, error: { code: 'INVALID_PIN', message: 'El PIN debe contener exactamente 4 dígitos.' } };
    }

    const persistentPin = requestedPin || '';

    const isPrueba = (data.rol || '').toUpperCase().includes('PRUEBA') || (data.rol || '').toUpperCase().includes('24H') || (data.rol || '').toUpperCase().includes('TRIAL');
    const rolFinal = isPrueba ? 'PRUEBA_GRATIS_24H' : 'DOCENTE';

    const fechaInicioObj = parseToDateObj(data.fechaInicio, new Date());
    const fechaFinObj = calculateExpirationDate(rolFinal, data.fechaFin);

    const created = await prisma.usuarioDocente.create({
      data: {
        dni: dniTrimmed,
        nombre: finalNombre,
        email: emailTrimmed,
        pin: persistentPin,
        rol: rolFinal,
        modalidad: modalidadVal,
        nivel: nivelVal,
        areas: areasJson,
        tiposAcceso: tiposAccesoJson,
        observacion: telefonoTrimmed || null,
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
        dni: created.dni || '',
        nombre: created.nombre,
        email: created.email,
        pin: normalizeDocentePin(created.pin) || '',
        rol: created.rol as any,
        modalidad: created.modalidad || 'EBR',
        nivel: created.nivel || 'INICIAL',
        areas: areasArr,
        tiposAcceso: tiposAccesoArr,
        creadoPor: created.creadoPor || adminResponsable,
        modificadoPor: created.modificadoPor || adminResponsable,
        fechaInicio: formatDateTimePE(created.fechaInicio),
        fechaFin: formatDateTimePE(created.fechaFin),
        fechaModificacion: formatDateTimePE(created.updatedAt),
        estado: new Date(created.fechaFin) < new Date() ? 'VENCIDO' : 'PREMIUM',
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

function addMonthsExact(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

export async function toggleUserStatusAction(
  id: string,
  adminResponsable: string = 'Administrador'
): Promise<ActionResponse<{ id: string; nuevoEstado: 'PREMIUM' | 'VENCIDO' }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const user = await prisma.usuarioDocente.findUnique({ where: { id } });
    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado.' } };

    const ahora = new Date();
    const isCurrentlyActive = new Date(user.fechaFin) >= ahora;

    let nuevaFechaFin: Date;
    let currentAcc: string[] = [];
    if (user.tiposAcceso) {
      try {
        currentAcc = JSON.parse(user.tiposAcceso);
      } catch {
        currentAcc = [];
      }
    }

    if (isCurrentlyActive) {
      // Pausar / suspender suscripción inmediatamente (ayer)
      nuevaFechaFin = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
      currentAcc = []; // Deshabilitar accesos 1-clic al pausar
    } else {
      // Reactivar suscripción por exactamente 1 AÑO (12 meses) a partir de hoy
      nuevaFechaFin = addMonthsExact(ahora, 12);
      currentAcc = ['Ascenso', 'Nombramiento', 'Directivo']; // Habilitar accesos 1-clic al reactivar
    }

    await prisma.usuarioDocente.update({
      where: { id },
      data: {
        rol: isCurrentlyActive ? user.rol : 'DOCENTE',
        accesoGranted: !isCurrentlyActive,
        fechaInicio: isCurrentlyActive ? user.fechaInicio : ahora,
        fechaFin: nuevaFechaFin,
        tiposAcceso: JSON.stringify(currentAcc),
        modificadoPor: adminResponsable,
      },
    });

    invalidateUsuariosCache();
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
    telefono?: string;
    fechaInicio?: string;
    fechaFin?: string;
    nombre?: string;
    email?: string;
    region?: string;
    institucionEducativa?: string;
    modalidad?: string;
    nivel?: string;
    areas?: string[];
    tiposAcceso?: string[];
    renewSubscription?: boolean;
    modificadoPor?: string;
  }
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    const idResult = z.string().trim().min(1).safeParse(id);
    const dataResult = updateUsuarioSchema.safeParse(data);
    if (!idResult.success || !dataResult.success) {
      return { success: false, error: { code: 'INVALID_UPDATE_DATA', message: 'Revisa los datos ingresados antes de guardar.' } };
    }

    const validId = idResult.data;
    const validData = dataResult.data;
    const updatePayload: Prisma.UsuarioDocenteUpdateInput = {};
    const requestedPin = validData.pin?.trim();
    if (requestedPin) {
      const pinResult = fourDigitCodeSchema.safeParse(requestedPin);
      if (!pinResult.success) {
        return { success: false, error: { code: 'INVALID_PIN', message: 'El PIN debe contener exactamente 4 dígitos.' } };
      }
      updatePayload.pin = pinResult.data;
    }
    if (validData.nombre !== undefined) updatePayload.nombre = validData.nombre;
    if (validData.email !== undefined) updatePayload.email = validData.email.toLowerCase();
    if (validData.telefono !== undefined) {
      const telClean = validData.telefono;
      updatePayload.observacion = telClean || null;
      if (telClean && telClean.replace(/[^0-9]/g, '').length >= 8) {
        updatePayload.dni = telClean.replace(/[^0-9]/g, '');
      } else {
        updatePayload.dni = `USR-${validId}`;
      }
    }
    if (validData.region) updatePayload.region = validData.region;
    if (validData.institucionEducativa) updatePayload.institucionEducativa = validData.institucionEducativa;
    const parsedFechaInicio = validData.fechaInicio ? parseToDateObj(validData.fechaInicio, new Date()) : undefined;
    const parsedFechaFin = validData.fechaFin
      ? parseToDateObj(validData.fechaFin, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      : undefined;

    if (parsedFechaInicio && parsedFechaFin && parsedFechaFin < parsedFechaInicio) {
      return {
        success: false,
        error: { code: 'INVALID_SUBSCRIPTION_DATES', message: 'La fecha de vencimiento no puede ser anterior a la fecha de inicio.' },
      };
    }

    if (parsedFechaInicio) updatePayload.fechaInicio = parsedFechaInicio;
    if (parsedFechaFin) updatePayload.fechaFin = parsedFechaFin;
    if (validData.modalidad) updatePayload.modalidad = validData.modalidad;
    if (validData.nivel) updatePayload.nivel = validData.nivel;
    if (validData.areas) updatePayload.areas = JSON.stringify(validData.areas);
    if (validData.tiposAcceso !== undefined) updatePayload.tiposAcceso = JSON.stringify(validData.tiposAcceso);
    if (validData.modificadoPor) updatePayload.modificadoPor = validData.modificadoPor;

    // Solo una modificación explícita de vigencia reactiva o expira la membresía.
    if (validData.renewSubscription && parsedFechaFin) {
      const isActive = parsedFechaFin > new Date();
      updatePayload.accesoGranted = isActive;
      if (isActive) {
        updatePayload.rol = 'DOCENTE';
      }
    }

    await prisma.usuarioDocente.update({
      where: { id: validId },
      data: updatePayload,
    });

    invalidateUsuariosCache();
    revalidatePath('/admin');
    return { success: true, data: { id: validId } };
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

export async function regenerateDocentePinAction(
  id: string
): Promise<ActionResponse<{ id: string; pin: string }>> {
  try {
    if (!(await verifyAdminSession())) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    }

    const idResult = z.string().trim().min(1).safeParse(id);
    if (!idResult.success) {
      return { success: false, error: { code: 'INVALID_USER_ID', message: 'Usuario inválido.' } };
    }

    const updated = await prisma.usuarioDocente.update({
      where: { id: idResult.data },
      data: { pin: generateDocentePin() },
      select: { id: true, pin: true },
    });

    invalidateUsuariosCache();
    revalidatePath('/admin');
    return { success: true, data: { id: updated.id, pin: updated.pin } };
  } catch (error: unknown) {
    console.error('ERROR REGENERAR PIN DOCENTE:', error);
    return { success: false, error: { code: 'PIN_REGENERATION_FAILED', message: 'No se pudo regenerar el PIN persistente.' } };
  }
}

export const regenerateDocenteDailyPinAction = regenerateDocentePinAction;

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
  adminResponsable: string = 'Administrador'
): Promise<ActionResponse<UsuarioDocenteItem>> {
  try {
    if (!(await verifyAdminSession())) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
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
        rol: 'DOCENTE',
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
        dni: updated.dni || '',
        nombre: updated.nombre,
        email: updated.email,
        pin: normalizeDocentePin(updated.pin) || '',
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

import { OFFICIAL_ADMIN_ACCOUNTS } from '@/data/adminAccounts';

export async function solicitarCodigoOtpAction(
  email: string
): Promise<ActionResponse<{ email: string; isRealEmailSent: boolean; message: string; hasPin?: boolean }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();

    if (!emailTerm) {
      return { success: false, error: { code: 'EMPTY_EMAIL', message: 'Por favor, escribe tu correo electrónico.' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: { email: emailTerm },
    });

    const adminUser = await prisma.adminUser.findFirst({
      where: { OR: [{ email: emailTerm }, { usuario: emailTerm }], estado: 'ACTIVO' },
    });

    const officialAdmin = OFFICIAL_ADMIN_ACCOUNTS.find(
      (acc) => acc.userOrEmail.map((u) => u.toLowerCase()).includes(emailTerm)
    );

    const isAdmin = Boolean(adminUser || officialAdmin);
    const nombreUsuario = adminUser?.nombre || officialAdmin?.name || user?.nombre;
    const hasPin = Boolean(user);

    if (!user && !isAdmin) {
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
      nombreDocente: nombreUsuario || 'Usuario',
    });

    const successMsg = hasPin
      ? 'Código enviado. Revisa tu correo o digita el PIN persistente proporcionado por el Administrador.'
      : 'Código enviado. Revisa tu buzón principal (o spam/promociones si es tu primer acceso).';

    if (emailResult.success) {
      return {
        success: true,
        data: {
          email: emailTerm,
          isRealEmailSent: true,
          hasPin,
          message: successMsg,
        },
      };
    } else {
      return {
        success: true,
        data: {
          email: emailTerm,
          isRealEmailSent: false,
          hasPin,
            message: hasPin
            ? 'Ingresa tu PIN persistente o solicita un nuevo código.'
            : 'No fue posible enviar el código por correo. Solicita asistencia por WhatsApp.',
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
): Promise<ActionResponse<{ id: string; nombre: string; email: string; rol?: string; estado?: AccountAccessState; accesoGranted?: boolean; region?: string; institucionEducativa?: string; modalidad?: string; nivel?: string; areas?: string[]; tiposAcceso?: string[]; fechaFin: string; isAdmin?: boolean; token?: string; role?: string; permisoUsuarios?: boolean; permisoCuadernillos?: boolean; permisoRecursos?: boolean; permisoMetricas?: boolean }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();
    const codeResult = fourDigitCodeSchema.safeParse(codigoOtp);
    const codeTrimmed = codeResult.success ? codeResult.data : '';

    if (!emailTerm || !codeTrimmed) {
      return { success: false, error: { code: 'EMPTY_FIELDS', message: 'Ingresa los 4 dígitos del código.' } };
    }

    const attemptState = otpAttempts.get(emailTerm);
    if (attemptState && attemptState.resetAt > Date.now() && attemptState.count >= 5) {
      return { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos. Solicita un nuevo código más tarde.' } };
    }

    const user = await prisma.usuarioDocente.findFirst({
      where: { email: emailTerm },
    });

    const adminUser = await prisma.adminUser.findFirst({
      where: { OR: [{ email: emailTerm }, { usuario: emailTerm }], estado: 'ACTIVO' },
    });

    const officialAdmin = OFFICIAL_ADMIN_ACCOUNTS.find(
      (acc) => acc.userOrEmail.map((u) => u.toLowerCase()).includes(emailTerm)
    );

    const isAdmin = Boolean(adminUser || officialAdmin);

    if (!user && !isAdmin) {
      return {
        success: false,
        error: {
          code: 'UNREGISTERED_EMAIL',
          message: 'Este correo no pertenece a AVEND ESCALA. Solicite su acceso por WhatsApp.',
        },
      };
    }

    const stored = otpStore.get(emailTerm);
    const docentePin = user ? normalizeDocentePin(user.pin) : null;

    const isValidCode =
      (docentePin && codeTrimmed === docentePin) ||
      (stored && stored.code === codeTrimmed && stored.expiresAt >= Date.now());

    if (!isValidCode) {
      const next = attemptState && attemptState.resetAt > Date.now() ? attemptState.count + 1 : 1;
      otpAttempts.set(emailTerm, { count: next, resetAt: Date.now() + 10 * 60 * 1000 });
      return {
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'El código es incorrecto o venció. Revisa tu correo o solicita el reenvío.',
        },
      };
    }

    otpStore.delete(emailTerm);
    otpAttempts.delete(emailTerm);

    if (isAdmin) {
      const name = adminUser?.nombre || officialAdmin?.name || 'Administrador';
      const role = adminUser?.rol || officialAdmin?.role || 'ADMINISTRADOR';
      const token = `admin_session_${Date.now()}_${name.replace(/\s+/g, '_').toLowerCase()}`;
      return {
        success: true,
        data: {
          id: adminUser?.id || 'admin_id',
          nombre: name,
          email: emailTerm,
          isAdmin: true,
          token,
          role,
          permisoUsuarios: adminUser ? adminUser.permisoUsuarios : true,
          permisoCuadernillos: adminUser ? adminUser.permisoCuadernillos : true,
          permisoRecursos: adminUser ? adminUser.permisoRecursos : true,
          permisoMetricas: adminUser ? adminUser.permisoMetricas : true,
          fechaFin: 'Acceso Total Admin',
        },
      };
    }

    let parsedAreas: string[] = [];
    try {
      parsedAreas = user!.areas ? JSON.parse(user!.areas) : [];
    } catch {}

    let parsedTiposAcceso: string[] = ['Ascenso', 'Nombramiento', 'Directivo'];
    try {
      if (user!.tiposAcceso) {
        const p = JSON.parse(user!.tiposAcceso);
        if (Array.isArray(p) && p.length > 0) parsedTiposAcceso = p;
      }
    } catch {}

    setServerSession({ sub: user!.id, email: user!.email, role: user!.rol, permissions: { cuadernillos: true, recursos: true } });
    return {
      success: true,
      data: {
        id: user!.id,
        nombre: user!.nombre,
        email: user!.email,
        rol: user!.rol,
        estado: resolveAccountAccessState(user!),
        accesoGranted: user!.accesoGranted !== false,
        region: (user! as any).region || 'Lima',
        institucionEducativa: (user! as any).institucionEducativa || '',
        modalidad: user!.modalidad || 'EBR',
        nivel: user!.nivel || 'INICIAL',
        areas: parsedAreas,
        tiposAcceso: parsedTiposAcceso,
        fechaFin: user!.fechaFin ? user!.fechaFin.toISOString() : formatDateTimePE(user!.fechaFin),
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

export async function loginDirectoPorCorreoAction(
  email: string
): Promise<ActionResponse<{
  id: string;
  nombre: string;
  email: string;
  rol?: string;
  estado?: AccountAccessState;
  accesoGranted?: boolean;
  region?: string;
  institucionEducativa?: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  tiposAcceso?: string[];
  fechaFin: string;
  isAdmin?: boolean;
}>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();
    if (!emailTerm || !emailTerm.includes('@')) {
      return {
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Por favor, escribe un correo electrónico válido.' },
      };
    }

    // 1. Blindaje de Seguridad para Administradores (Bryan y equipo admin)
    const adminUser = await prisma.adminUser.findFirst({
      where: { OR: [{ email: emailTerm }, { usuario: emailTerm }], estado: 'ACTIVO' },
    });
    const officialAdmin = OFFICIAL_ADMIN_ACCOUNTS.find(
      (acc) => acc.userOrEmail.map((u) => u.toLowerCase()).includes(emailTerm)
    );

    if (adminUser || officialAdmin) {
      // El administrador NUNCA accede con solo correo; requiere su PIN de Administrador
      return {
        success: true,
        data: {
          id: adminUser?.id || 'admin_id',
          nombre: adminUser?.nombre || officialAdmin?.name || 'Administrador',
          email: emailTerm,
          isAdmin: true,
          fechaFin: 'Acceso Total Admin',
        },
      };
    }

    // 2. Verificar docente en la base de datos
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

    // 3. Verificar estado de acceso del docente
    const estado = resolveAccountAccessState(user);
    if (user.accesoGranted === false) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_PAUSED',
          message: 'Su cuenta se encuentra pausada temporalmente. Contacte a soporte por WhatsApp.',
        },
      };
    }

    let parsedAreas: string[] = [];
    try {
      parsedAreas = user.areas ? JSON.parse(user.areas) : [];
    } catch {}

    let parsedTiposAcceso: string[] = ['Ascenso', 'Nombramiento', 'Directivo'];
    try {
      if (user.tiposAcceso) {
        const p = JSON.parse(user.tiposAcceso);
        if (Array.isArray(p) && p.length > 0) parsedTiposAcceso = p;
      }
    } catch {}

    // Emitir sesión HTTP-only del servidor
    setServerSession({
      sub: user.id,
      email: user.email,
      role: user.rol,
      permissions: { cuadernillos: true, recursos: true },
    });

    return {
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        estado,
        accesoGranted: Boolean(user.accesoGranted ?? true),
        region: (user as any).region || 'Lima',
        institucionEducativa: (user as any).institucionEducativa || '',
        modalidad: user.modalidad || 'EBR',
        nivel: user.nivel || 'INICIAL',
        areas: parsedAreas,
        tiposAcceso: parsedTiposAcceso,
        fechaFin: user.fechaFin ? user.fechaFin.toISOString() : formatDateTimePE(user.fechaFin),
        isAdmin: false,
      },
    };
  } catch (error: any) {
    console.error('❌ ERROR LOGIN DIRECTO POR CORREO:', error);
    return {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: 'Error al verificar el correo de acceso.',
      },
    };
  }
}

export async function loginDocenteAction(
  identificador: string,
  pin: string
): Promise<ActionResponse<any>> {
  return verificarCodigoOtpAction(identificador, pin);
}

export async function registrarseDocenteAction(data: {
  nombre: string;
  email: string;
  pin?: string;
  rol?: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  creadoPor?: string;
}): Promise<ActionResponse<UsuarioDocenteItem>> {
  return createUsuarioAction({
    nombre: data.nombre,
    email: data.email,
    rol: data.rol,
    modalidad: data.modalidad,
    nivel: data.nivel,
    areas: data.areas,
    pin: data.pin,
    creadoPor: data.creadoPor,
  });
}

export async function getFreshDocenteSessionAction(
  email: string
): Promise<ActionResponse<{ id: string; nombre: string; email: string; rol?: string; estado?: AccountAccessState; accesoGranted?: boolean; region?: string; institucionEducativa?: string; modalidad?: string; nivel?: string; areas?: string[]; tiposAcceso?: string[]; fechaFin: string }>> {
  try {
    const emailTerm = (email || '').trim().toLowerCase();
    if (!emailTerm) {
      return { success: false, error: { code: 'INVALID_EMAIL', message: 'Email no provisto' } };
    }

    const session = (await import('@/lib/serverSession')).readAnySession();
    if (!session || (session.email !== emailTerm && !['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR'].includes(session.role))) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sesión no autorizada.' } };
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

    let parsedTiposAcceso: string[] = ['Ascenso', 'Nombramiento', 'Directivo'];
    try {
      if (user.tiposAcceso) {
        const p = JSON.parse(user.tiposAcceso);
        if (Array.isArray(p) && p.length > 0) parsedTiposAcceso = p;
      }
    } catch {}

    const estado = resolveAccountAccessState(user);

    return {
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        estado,
        accesoGranted: user.accesoGranted !== false,
        region: user.region || 'Lima',
        institucionEducativa: (user as any).institucionEducativa || '',
        modalidad: user.modalidad || 'EBR',
        nivel: user.nivel || 'INICIAL',
        areas: parsedAreas,
        tiposAcceso: parsedTiposAcceso,
        fechaFin: user.fechaFin ? user.fechaFin.toISOString() : '',
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'ERROR', message: error?.message || 'Error' } };
  }
}

const optionalImportText = z.string().trim().max(500).optional();
const bulkDocenteRecordSchema = z.object({
  fila: z.number().int().positive().optional(),
  dni: optionalImportText,
  telefono: optionalImportText,
  email: z.string().trim().max(320),
  nombre: optionalImportText,
  rol: optionalImportText,
  estado: optionalImportText,
  region: optionalImportText,
  departamento: optionalImportText,
  institucionEducativa: optionalImportText,
  ie: optionalImportText,
  colegio: optionalImportText,
  escuela: optionalImportText,
  modalidad: optionalImportText,
  modalidades: optionalImportText,
  nivel: optionalImportText,
  niveles: optionalImportText,
  especialidad: optionalImportText,
  especialidades: optionalImportText,
  tiposAcceso: optionalImportText,
  fechaInicio: optionalImportText,
  fechaFin: optionalImportText,
  pin: z.union([z.literal(''), z.string().trim().regex(/^\d{4}$/)]).optional(),
});

const bulkDocenteRecordsSchema = z.array(bulkDocenteRecordSchema).min(1).max(250);

const bulkImportOptionsSchema = z.object({
  membershipPolicy: z.enum(['STRICT_EXPLICIT', 'LEGACY_ACTIVE_IS_PREMIUM']),
  mappingConfirmed: z.literal(true),
  dateAmbiguitiesResolved: z.literal(true),
  columnMapping: z.record(z.enum(USER_IMPORT_COLUMN_FIELDS)).refine((mapping) => {
    const selected = Object.values(mapping).filter((field) => field !== 'ignore');
    return selected.includes('email') && selected.length === new Set(selected).size;
  }, 'El mapeo debe contener un único correo y no puede repetir campos.'),
  ambiguousColumns: z.number().int().nonnegative().max(100),
});

type ImportedMembershipSource =
  | 'EXPLICIT_PREMIUM'
  | 'EXPLICIT_TRIAL'
  | 'EXPLICIT_CLIENT'
  | 'LEGACY_ACTIVE'
  | 'NONE';

interface ResolvedImportedMembership {
  rolFinal: MembershipRole;
  fechaInicio: Date;
  fechaFin: Date;
  tiposAcceso: string[];
  isActivo: boolean;
  source: ImportedMembershipSource;
}

function isActivePremium(rol: string, fechaFin: Date, now: Date = new Date()): boolean {
  const normalizedRole = rol.toUpperCase().trim();
  return (normalizedRole === 'PREMIUM' || normalizedRole === 'DOCENTE') && fechaFin > now;
}

function membershipPriority(
  rol: MembershipRole,
  fechaFin: Date,
  source: ImportedMembershipSource,
  now: Date = new Date(),
): number {
  if (source === 'NONE') return 0;
  if (rol === 'PREMIUM' && fechaFin > now) return 5;
  if (rol === 'PREMIUM') return 4;
  if (rol === 'PRUEBA_GRATIS_24H' && fechaFin > now) return 3;
  if (rol === 'PRUEBA_GRATIS_24H') return 2;
  return 1;
}

function normalizeMembershipRole(rawRole?: string): MembershipRole {
  const normalized = (rawRole || '').trim().toUpperCase();
  if (/PREMIUM|PREMIUN|PRIMIUM|PRIMIUN|^DOCENTE$/.test(normalized)) return 'PREMIUM';
  if (/PRUEBA|24\s*H|24\s*HORAS|TRIAL|GRATIS/.test(normalized)) return 'PRUEBA_GRATIS_24H';
  return 'CLIENTE';
}

function classifyImportedMembership(rawRole?: string): ImportedMembershipSource {
  const normalized = (rawRole || '').trim().toUpperCase();
  if (/PREMIUM|PREMIUN|PRIMIUM|PRIMIUN|^DOCENTE$/.test(normalized)) return 'EXPLICIT_PREMIUM';
  if (/PRUEBA|24\s*H|24\s*HORAS|TRIAL|GRATIS/.test(normalized)) return 'EXPLICIT_TRIAL';
  if (/CLIENTE|SIN\s*PLAN|SIN\s*SUSCRIPCI[ÓO]N/.test(normalized)) return 'EXPLICIT_CLIENT';
  return 'NONE';
}

function parseImportDate(value: string | undefined, boundary: 'start' | 'end'): Date | null {
  const text = (value || '').trim();
  if (!text) return null;

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const localDate = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (isoDate || localDate) {
    const year = isoDate
      ? Number(isoDate[1])
      : Number(localDate?.[3]?.length === 2 ? `20${localDate[3]}` : localDate?.[3]);
    const month = Number(isoDate ? isoDate[2] : localDate?.[2]);
    const day = Number(isoDate ? isoDate[3] : localDate?.[1]);
    const validation = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      validation.getUTCFullYear() !== year ||
      validation.getUTCMonth() !== month - 1 ||
      validation.getUTCDate() !== day
    ) return null;

    // Perú usa UTC-5 sin horario de verano. Una fecha final de calendario
    // permanece vigente hasta las 23:59:59.999 del día indicado en Perú.
    return boundary === 'end'
      ? new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDurationEndDate(value: string | undefined, startDate: Date): Date | null {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  const years = normalized.match(/(\d+)\s*(ano|anos|year|years)/);
  if (years) return addMonthsExact(startDate, Number(years[1]) * 12);
  const months = normalized.match(/(\d+)\s*(mes|meses|month|months)/);
  if (months) return addMonthsExact(startDate, Number(months[1]));
  const hours = normalized.match(/(\d+)\s*(h|hora|horas)/);
  if (hours) return new Date(startDate.getTime() + Number(hours[1]) * 60 * 60 * 1000);
  return null;
}

function resolveImportedMembership(
  record: BulkDocenteRecord,
  now: Date,
  policy: ImportMembershipPolicy,
): ResolvedImportedMembership {
  const explicitSource = classifyImportedMembership(record.rol);
  const estado = (record.estado || '').trim().toUpperCase();
  const explicitlyInactive = /INACTIVO|VENCIDO|EXPIRADO|BLOQUEADO/.test(estado);
  const fechaInicio = parseImportDate(record.fechaInicio, 'start') || now;
  const explicitEnd = parseImportDate(record.fechaFin, 'end') || parseDurationEndDate(record.fechaFin, fechaInicio);
  const parsedAccess = parseSpecificTiposAcceso(record.tiposAcceso);

  const isStateActive = /^ACTIV[OA]$/.test(estado);
  const isDateFuture = Boolean(explicitEnd && explicitEnd > now);
  const isExplicitPremium = explicitSource === 'EXPLICIT_PREMIUM';
  const isExplicitTrial = explicitSource === 'EXPLICIT_TRIAL';

  // Si no está explícitamente inactivo y (es premium, o el estado dice activo, o la fecha es futura, o la política es legacy)
  if (!explicitlyInactive && (isExplicitPremium || isStateActive || isDateFuture || policy === 'LEGACY_ACTIVE_IS_PREMIUM')) {
    const finalFechaFin = explicitEnd
      ? (explicitEnd < fechaInicio ? addMonthsExact(fechaInicio, 12) : explicitEnd)
      : addMonthsExact(now, 12);
    return {
      rolFinal: 'PREMIUM',
      fechaInicio,
      fechaFin: finalFechaFin,
      tiposAcceso: parsedAccess.length > 0 ? parsedAccess : ['Ascenso', 'Nombramiento', 'Directivo'],
      isActivo: finalFechaFin > now,
      source: isExplicitPremium ? 'EXPLICIT_PREMIUM' : 'LEGACY_ACTIVE',
    };
  }

  if (isExplicitTrial && !explicitlyInactive) {
    const finalFechaFin = explicitEnd || new Date(fechaInicio.getTime() + 24 * 60 * 60 * 1000);
    return {
      rolFinal: 'PRUEBA_GRATIS_24H',
      fechaInicio,
      fechaFin: finalFechaFin,
      tiposAcceso: parsedAccess.length > 0 ? parsedAccess : ['Ascenso', 'Nombramiento', 'Directivo'],
      isActivo: finalFechaFin > now,
      source: 'EXPLICIT_TRIAL',
    };
  }

  // Si el registro trae una fecha explícita, conservarla sin degradar a ayer
  const finalFechaFin = explicitEnd || now;
  return {
    rolFinal: 'CLIENTE',
    fechaInicio,
    fechaFin: finalFechaFin,
    tiposAcceso: parsedAccess,
    isActivo: false,
    source: 'NONE',
  };
}

export async function importarUsuariosMasivoAction(
  rawRecords: BulkDocenteRecord[],
  rawOptions: BulkImportOptions,
  adminName: string = 'Administrador'
): Promise<ActionResponse<ImportReport>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    }

    const parsedRecords = bulkDocenteRecordsSchema.safeParse(rawRecords);
    const parsedOptions = bulkImportOptionsSchema.safeParse(rawOptions);
    if (!parsedRecords.success || !parsedOptions.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_IMPORT_DATA',
          message: 'El archivo, la política o el mapeo confirmado contienen valores inválidos.',
        },
      };
    }
    const records = parsedRecords.data;
    const options = parsedOptions.data;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const report: ImportReport = {
      totalLeidos: records.length,
      nuevosCreados: 0,
      actualizados: 0,
      promovidosAPremium: 0,
      premiumProtegidos: 0,
      noPromovidos: 0,
      duplicadosConsolidados: 0,
      nombresCorregidos: 0,
      telefonosCorregidos: 0,
      fechasRenovadas: 0,
      ambiguedadesDetectadas: options.ambiguousColumns,
      conflictos: [],
      errores: [],
    };

    const groupedByEmail = new Map<
      string,
      {
        filas: number[];
        dni?: string;
        telefono?: string;
        email: string;
        nombre: string;
        rol: MembershipRole;
        membershipSource: ImportedMembershipSource;
        estado?: string;
        region: string;
        institucionEducativa: string;
        rawModalidades: string[];
        rawNiveles: string[];
        areasList: string[];
        tiposAccesoStr?: string;
        pin?: string;
        isExplicitlyExpired: boolean;
        fechaInicio: Date;
        fechaFin: Date;
      }
    >();

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const filaNum = rec.fila || i + 2;
      const rawEmail = (rec.email || '').toString().trim().toLowerCase();

      if (!rawEmail || !emailRegex.test(rawEmail)) {
        report.errores.push({
          fila: filaNum,
          correo: rawEmail || 'VACÍO',
          motivo: 'Formato de correo electrónico inválido o casilla vacía.',
        });
        continue;
      }

const PERU_REGIONS_AND_CITIES_SET = new Set([
  'LIMA METROPOLITANA', 'LIMA PROVINCIAS', 'LIMA', 'CALLAO', 'AREQUIPA', 'CUSCO', 'LA LIBERTAD',
  'PIURA', 'PUNO', 'SAN MARTIN', 'SAN MARTÍN', 'CAJAMARCA', 'ANCASH', 'ÁNCASH', 'JUNIN', 'JUNÍN',
  'LAMBAYEQUE', 'HUANUCO', 'HUÁNUCO', 'LORETO', 'ICA', 'AYACUCHO', 'UCAYALI', 'TACNA', 'APURIMAC',
  'APURÍMAC', 'AMAZONAS', 'PASCO', 'HUANCAVELICA', 'MOQUEGUA', 'MADRE DE DIOS', 'TUMBES',
  'TRUJILLO', 'CHICLAYO', 'HUANCAYO', 'IQUITOS', 'CHIMBOTE', 'PUCALLPA', 'JULIACA', 'SULLANA',
  'TARAPOTO', 'CHINCHA', 'TALARA', 'ABANCAY', 'PUERTO MALDONADO', 'JAEN', 'JAÉN', 'MOYOBAMBA',
  'TARMA', 'CERRO DE PASCO', 'TINGO MARIA', 'TINGO MARÍA', 'BARRANCA', 'HUACHO', 'HUARAL', 'CAÑETE',
  'CHILCA', 'CHOTA', 'BAGUA', 'YURIMAGUAS', 'ANDAHUAYLAS', 'BAGUA GRANDE', 'CHACHAPOYAS',
  'ILO', 'PISCO', 'CHINCHA ALTA', 'NASCA', 'NAZCA', 'HUARAZ', 'CARAZ', 'YAUYOS', 'CANTA', 'OYON',
  'UGEL', 'DRE', 'MINEDU', 'GRE', 'UGEL 01', 'UGEL 02', 'UGEL 03', 'UGEL 04', 'UGEL 05', 'UGEL 06', 'UGEL 07'
]);

function cleanDocenteNombre(rawName?: string): string {
  let val = (rawName || '').toString().trim();
  if (!val || val === '-' || val === '—') {
    return '';
  }

  const up = val.toUpperCase();
  if (PERU_REGIONS_AND_CITIES_SET.has(up) || INVALID_DOCENTE_NAMES_SET.has(up)) {
    return '';
  }

  val = val.replace(/["'\[\]]/g, '').trim();

  return val
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

      const nombre = cleanDocenteNombre(rec.nombre);
      const region = (rec.region || rec.departamento || '').toString().trim();
      const ie = (rec.institucionEducativa || rec.ie || rec.colegio || rec.escuela || '').toString().trim();
      const modalidad = (rec.modalidad || rec.modalidades || '').toString().trim().toUpperCase();
      const nivel = (rec.nivel || rec.niveles || '').toString().trim().toUpperCase();
      const especialidad = (rec.especialidad || rec.especialidades || '').toString().trim();
      const tiposAccesoStr = (rec.tiposAcceso || '').toString().trim().toLowerCase();

      // Generar insignias canónicas limpias según catálogo oficial (sin '1 año', 'jota', etc.)
      const badges = modalidad && nivel ? buildDocenteAccessBadges(modalidad, nivel, especialidad) : [];

      const now = new Date();
      const resolvedMembership = resolveImportedMembership(
        { ...rec, tiposAcceso: tiposAccesoStr },
        now,
        options.membershipPolicy,
      );
      const rolFinal = resolvedMembership.rolFinal;
      const fechaInicio = resolvedMembership.fechaInicio;
      const fechaFin = resolvedMembership.fechaFin;
      const isExpired = !resolvedMembership.isActivo || fechaFin < now;
      const importedPin = normalizeDocentePin(rec.pin);

      const rawPhone = (rec.telefono || '').toString().trim();
      const normalizedPhoneDigits = rawPhone.replace(/[^0-9]/g, '');
      const phoneDigits = normalizedPhoneDigits.length === 11 && normalizedPhoneDigits.startsWith('519')
        ? normalizedPhoneDigits.slice(2)
        : normalizedPhoneDigits;
      const validPhone = phoneDigits.length === 9 && phoneDigits.startsWith('9') ? phoneDigits : '';
      const rawDni = (rec.dni || '').toString().replace(/[^0-9]/g, '');
      const validDni = /^\d{8}$/.test(rawDni) ? rawDni : '';

      if (!groupedByEmail.has(rawEmail)) {
        groupedByEmail.set(rawEmail, {
          filas: [filaNum],
          dni: validDni || undefined,
          telefono: validPhone || undefined,
          email: rawEmail,
          nombre,
          rol: rolFinal,
          membershipSource: resolvedMembership.source,
          estado: isExpired ? 'VENCIDO' : 'PREMIUM',
          region,
          institucionEducativa: ie,
          rawModalidades: modalidad ? [modalidad] : [],
          rawNiveles: nivel ? [nivel] : [],
          areasList: badges,
          tiposAccesoStr,
          pin: importedPin || undefined,
          isExplicitlyExpired: isExpired,
          fechaInicio,
          fechaFin,
        });
      } else {
        const existing = groupedByEmail.get(rawEmail)!;
        existing.filas.push(filaNum);
        report.duplicadosConsolidados++;
        if (validPhone) existing.telefono = validPhone;
        if (validDni && !existing.dni) existing.dni = validDni;
        if (nombre) existing.nombre = nombre;
        if (region) existing.region = region;
        if (ie) existing.institucionEducativa = ie;
        if (modalidad) existing.rawModalidades.push(modalidad);
        if (nivel) existing.rawNiveles.push(nivel);
        existing.areasList.push(...badges);
        if (importedPin) existing.pin = importedPin;
        const incomingPriority = membershipPriority(rolFinal, fechaFin, resolvedMembership.source, now);
        const existingPriority = membershipPriority(existing.rol, existing.fechaFin, existing.membershipSource, now);
        const shouldUseIncomingMembership =
          incomingPriority > existingPriority ||
          (incomingPriority === existingPriority && fechaFin > existing.fechaFin);

        if (shouldUseIncomingMembership) {
          existing.rol = rolFinal;
          existing.membershipSource = resolvedMembership.source;
          existing.fechaInicio = fechaInicio;
          existing.fechaFin = fechaFin;
          existing.isExplicitlyExpired = isExpired;
          if (tiposAccesoStr) existing.tiposAccesoStr = tiposAccesoStr;
        }
      }
    }

    const validUserItems = Array.from(groupedByEmail.values()).map((g) => {
      const now = new Date();

      // 1. Identificar Usuarios "Expirados" (fechaFin en el pasado o marcado como expirado)
      const isExpired = g.isExplicitlyExpired || g.fechaFin < now;

      // Un plan sigue activo hasta su fecha exacta de vencimiento. Estar por
      // vencer o tener varias modalidades nunca elimina sus procesos.
      const parsedFromRow = parseSpecificTiposAcceso(g.tiposAccesoStr);
      const isAutoAccessAllowed = !isExpired && g.rol !== 'CLIENTE';

      const tiposAccesoArr = isAutoAccessAllowed
        ? (parsedFromRow.length > 0 ? parsedFromRow : ['Ascenso', 'Nombramiento', 'Directivo'])
        : [];

      return {
        filas: g.filas,
        dni: g.dni,
        telefono: g.telefono,
        email: g.email,
        nombre: g.nombre,
        rol: g.rol || 'DOCENTE',
        membershipSource: g.membershipSource,
        region: g.region,
        institucionEducativa: g.institucionEducativa,
        modalidadPrimary: g.rawModalidades[0] || '',
        nivelPrimary: g.rawNiveles[0] || '',
        condensedAreas: condenseAccessBadges(g.areasList),
        tiposAccesoJson: JSON.stringify(tiposAccesoArr),
        pin: g.pin,
        fechaInicio: g.fechaInicio,
        fechaFin: g.fechaFin,
      };
    });

    if (validUserItems.length === 0) {
      return {
        success: true,
        data: report,
      };
    }

    const BATCH_SIZE = 250;
    for (let b = 0; b < validUserItems.length; b += BATCH_SIZE) {
      const chunk = validUserItems.slice(b, b + BATCH_SIZE);
      const emailsInChunk = chunk.map((c) => c.email);

      const existingDocentes = await prisma.usuarioDocente.findMany({
        where: { email: { in: emailsInChunk } },
        select: {
          id: true,
          email: true,
          nombre: true,
          areas: true,
          dni: true,
          observacion: true,
          rol: true,
          region: true,
          institucionEducativa: true,
          modalidad: true,
          nivel: true,
          fechaInicio: true,
          fechaFin: true,
          tiposAcceso: true,
          pin: true,
          accesoGranted: true,
        },
      });

      const existingMap = new Map(existingDocentes.map((e) => [e.email, e]));

      // Precargar teléfonos y DNIs existentes para impedir reasignaciones entre correos.
      const candidateIdentityValues = chunk
        .flatMap((candidate) => [candidate.telefono, candidate.dni])
        .filter((value): value is string => Boolean(value));

      const existingDniRecords = candidateIdentityValues.length > 0
        ? await prisma.usuarioDocente.findMany({
            where: {
              OR: [
                { dni: { in: candidateIdentityValues } },
                { observacion: { in: candidateIdentityValues } },
              ],
            },
            select: { dni: true, observacion: true, email: true },
          })
        : [];
      const existingIdentityMap = new Map<string, string>();
      existingDniRecords.forEach((record) => {
        if (record.dni) existingIdentityMap.set(record.dni, record.email);
        if (record.observacion) existingIdentityMap.set(record.observacion, record.email);
      });

      const toUpdate: { id: string; data: Prisma.UsuarioDocenteUpdateInput }[] = [];
      const toCreate: Prisma.UsuarioDocenteCreateManyInput[] = [];
      const usedIdentitiesInBatch = new Map<string, string>();

      for (let idx = 0; idx < chunk.length; idx++) {
        const item = chunk[idx];
        const existing = existingMap.get(item.email);
        const incomingPhone = item.telefono || '';
        const incomingDni = item.dni || '';
        const firstRow = item.filas[0] || idx + 2;
        const phoneOwner = incomingPhone
          ? existingIdentityMap.get(incomingPhone) || usedIdentitiesInBatch.get(incomingPhone)
          : undefined;
        const phoneConflict = Boolean(phoneOwner && phoneOwner !== item.email);

        if (phoneConflict) {
          report.conflictos.push({
            fila: firstRow,
            correo: item.email,
            motivo: `El WhatsApp ${incomingPhone} ya pertenece a ${phoneOwner}; no fue reasignado.`,
          });
        }

        if (existing) {
          const now = new Date();
          const existingPremiumVigente = isActivePremium(existing.rol, existing.fechaFin, now);
          const incomingIsPremium = (item.rol === 'PREMIUM' || item.membershipSource !== 'NONE') && item.fechaFin > now;

          // La fecha final siempre toma la fecha más favorable (la más extendida en el futuro)
          const finalFechaFin = item.fechaFin > existing.fechaFin
            ? item.fechaFin
            : (existing.fechaFin > now ? existing.fechaFin : item.fechaFin);

          const isFinalActive = finalFechaFin > now;
          const finalRole = isFinalActive ? 'DOCENTE' : (existing.rol || 'DOCENTE');
          const finalAccessGranted = isFinalActive;

          const updateData: Prisma.UsuarioDocenteUpdateInput = {
            rol: finalRole,
            fechaInicio: existing.fechaInicio,
            fechaFin: finalFechaFin,
            accesoGranted: finalAccessGranted,
            modificadoPor: adminName,
          };

          const normalizeComparableName = (value: string): string => value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          const emailLocalPart = item.email.split('@')[0] || '';
          const existingNameIsInferred = normalizeComparableName(existing.nombre) === normalizeComparableName(emailLocalPart)
            || normalizeComparableName(existing.nombre) === normalizeComparableName(emailLocalPart.replace(/[._-]+/g, ' '))
            || /^docente\s+(avend|qa)?$/i.test(existing.nombre.trim());

          if (item.nombre && (existingNameIsInferred || !existing.nombre || item.nombre !== existing.nombre)) {
            updateData.nombre = item.nombre;
            report.nombresCorregidos++;
          }
          if (item.region) updateData.region = item.region;
          if (item.institucionEducativa) updateData.institucionEducativa = item.institucionEducativa;
          if (item.modalidadPrimary) updateData.modalidad = item.modalidadPrimary;
          if (item.nivelPrimary) updateData.nivel = item.nivelPrimary;

          if (item.condensedAreas.length > 0) {
            updateData.areas = JSON.stringify(item.condensedAreas);
          }

          const incomingAccess = parseSpecificTiposAcceso(item.tiposAccesoJson);
          const existingAccess = parseSpecificTiposAcceso(existing.tiposAcceso);
          const combinedAccess = isFinalActive
            ? (incomingAccess.length > 0 ? incomingAccess : (existingAccess.length > 0 ? existingAccess : ['Ascenso', 'Nombramiento', 'Directivo']))
            : [];
          updateData.tiposAcceso = JSON.stringify(combinedAccess);

          if (!existingPremiumVigente && isFinalActive) {
            report.promovidosAPremium++;
          } else if (existingPremiumVigente && isFinalActive) {
            report.premiumProtegidos++;
          }
          if (item.fechaFin > existing.fechaFin) {
            report.fechasRenovadas++;
          }

          if (!isFinalActive) report.noPromovidos++;
          if (item.pin) updateData.pin = item.pin;

          if (incomingPhone && !phoneConflict) {
            const syntheticDni = !existing.dni || existing.dni.startsWith('USR-');
            const missingPhone = !existing.observacion;
            if (syntheticDni) updateData.dni = incomingPhone;
            if (missingPhone || existing.observacion === incomingPhone) updateData.observacion = incomingPhone;
            if (syntheticDni || missingPhone) report.telefonosCorregidos++;
            usedIdentitiesInBatch.set(incomingPhone, item.email);
          } else if (incomingDni && (!existing.dni || existing.dni.startsWith('USR-'))) {
            const dniOwner = existingIdentityMap.get(incomingDni) || usedIdentitiesInBatch.get(incomingDni);
            if (!dniOwner || dniOwner === item.email) {
              updateData.dni = incomingDni;
              usedIdentitiesInBatch.set(incomingDni, item.email);
            }
          }

          toUpdate.push({
            id: existing.id,
            data: updateData,
          });
        } else {
          let userDni = !phoneConflict ? (incomingPhone || incomingDni) : '';
          const identityOwner = userDni
            ? existingIdentityMap.get(userDni) || usedIdentitiesInBatch.get(userDni)
            : undefined;
          if (!userDni || (identityOwner && identityOwner !== item.email)) {
            userDni = `USR-${Date.now().toString().slice(-5)}${String(b + idx).padStart(3, '0')}`;
          }
          usedIdentitiesInBatch.set(userDni, item.email);

          const localPart = item.email.split('@')[0] || 'docente avend';
          const fallbackName = localPart
            .replace(/[._-]+/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          const modalidad = item.modalidadPrimary || 'EBR';
          const nivel = item.nivelPrimary || 'INICIAL';
          const areas = item.condensedAreas.length > 0
            ? item.condensedAreas
            : buildDocenteAccessBadges(modalidad, nivel);

          toCreate.push({
            dni: userDni,
            observacion: incomingPhone && !phoneConflict ? incomingPhone : null,
            nombre: item.nombre || fallbackName || 'Docente AVEND',
            email: item.email,
            region: item.region || 'Lima',
            institucionEducativa: item.institucionEducativa || '',
            pin: item.pin || '',
            rol: item.rol === 'PREMIUM' ? 'DOCENTE' : item.rol,
            modalidad,
            nivel,
            areas: JSON.stringify(areas),
            tiposAcceso: item.tiposAccesoJson,
            accesoGranted: item.rol !== 'CLIENTE' && item.fechaFin > new Date(),
            creadoPor: adminName,
            modificadoPor: adminName,
            fechaInicio: item.fechaInicio,
            fechaFin: item.fechaFin,
          });
          if (item.rol !== 'PREMIUM' || item.fechaFin <= new Date()) report.noPromovidos++;
        }
      }

      // Inserción Masiva Directa Ultra Rápida con createMany (sin timeouts de transacción)
      if (toCreate.length > 0) {
        const createRes = await prisma.usuarioDocente.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
        report.nuevosCreados += createRes.count;
      }

      // Actualización Paralela por Sub-lotes
      if (toUpdate.length > 0) {
        const SUB_BATCH = 25;
        for (let u = 0; u < toUpdate.length; u += SUB_BATCH) {
          const updateSubChunk = toUpdate.slice(u, u + SUB_BATCH);
          await Promise.all(
            updateSubChunk.map((up) =>
              prisma.usuarioDocente.update({
                where: { id: up.id },
                data: up.data,
              })
            )
          );
          report.actualizados += updateSubChunk.length;
        }
      }
    }

    invalidateUsuariosCache();
    revalidatePath('/admin');

    return {
      success: true,
      data: report,
    };
  } catch (error: unknown) {
    console.error('❌ ERROR IMPORTAR USUARIOS MASIVO:', error);
    return {
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: error instanceof Error ? error.message : 'Error durante la importación masiva.',
      },
    };
  }
}

export async function updatePerfilDocenteAction(data: {
  email: string;
  nombre: string;
  region: string;
  institucionEducativa: string;
}): Promise<ActionResponse<{ nombre: string; region: string; institucionEducativa: string }>> {
  try {
    const rawEmail = (data.email || '').trim().toLowerCase();
    if (!rawEmail) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Correo no válido.' } };
    }

    const updated = await prisma.usuarioDocente.update({
      where: { email: rawEmail },
      data: {
        nombre: (data.nombre || '').trim(),
        region: (data.region || '').trim(),
        institucionEducativa: (data.institucionEducativa || '').trim(),
      } as any,
    });

    invalidateUsuariosCache();
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        nombre: updated.nombre,
        region: (updated as any).region || '',
        institucionEducativa: (updated as any).institucionEducativa || '',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { code: 'UPDATE_ERROR', message: error?.message || 'Error al actualizar el perfil.' },
    };
  }
}

export async function toggleDocenteTipoAccesoAction(
  userId: string,
  tipo: 'Ascenso' | 'Nombramiento' | 'Directivo'
): Promise<ActionResponse<{ tiposAcceso: string[] }>> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
    }

    const user = await prisma.usuarioDocente.findUnique({
      where: { id: userId },
      select: { id: true, tiposAcceso: true, fechaInicio: true, fechaFin: true },
    });

    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado.' } };
    }

    let currentAcc: string[] = [];
    try {
      if (user.tiposAcceso) currentAcc = JSON.parse(user.tiposAcceso);
    } catch {}

    const index = currentAcc.indexOf(tipo);
    if (index >= 0) {
      currentAcc.splice(index, 1);
    } else {
      currentAcc.push(tipo);
    }

    const ahora = new Date();
    const isCurrentlyActive = new Date(user.fechaFin || 0) >= ahora;

    let updateData: any = {
      tiposAcceso: JSON.stringify(currentAcc),
    };

    // Si se le otorga un acceso a un usuario expirado/pausado -> reactivar automáticamente por 6 meses
    if (currentAcc.length > 0 && !isCurrentlyActive) {
      updateData.fechaInicio = ahora;
      updateData.fechaFin = addMonthsExact(ahora, 6);
    }

    if (currentAcc.length > 0) updateData.rol = 'DOCENTE';

    // Si se le remueven todos los accesos -> pausar/expirar usuario inmediatamente
    if (currentAcc.length === 0) {
      updateData.fechaFin = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.usuarioDocente.update({
      where: { id: userId },
      data: updateData,
    });

    invalidateUsuariosCache();
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        tiposAcceso: currentAcc,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { code: 'TOGGLE_ERROR', message: error?.message || 'Error al modificar tipo de acceso.' },
    };
  }
}

// Acción de Importación Masiva directa desde archivo Excel (Base64)
export async function importarDocentesDesdeExcelAction(
  base64Data: string,
  adminResponsable: string = 'Administrador'
): Promise<ActionResponse<{ creados: number; actualizados: number; errores: string[] }>> {
  try {
    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const normalize = (v: any) => String(v || '').trim();
      const email = normalize(row.Email || row.email || row.Correo || row.correo).toLowerCase();
      const nombre = normalize(row.Nombre || row.nombre || row.Docente || row.docente);
      const rawRol = normalize(row.Rol || row.rol || 'CLIENTE');
      const rawEstado = normalize(row.Estado || row.estado || row.Status || 'ACTIVO');
      const modalidad = normalize(row.Modalidad || row.modalidad || 'EBR').toUpperCase();
      const nivel = normalize(row.Nivel || row.nivel || 'INICIAL').toUpperCase();
      const especialidad = normalize(row.Especialidad || row.especialidad || row.Area || row['Área'] || '');
      const region = normalize(row.Region || row.region || row['Región'] || 'Lima');
      const telefono = normalize(
        row.Telefono || row.telefono || row['Teléfono'] || row['teléfono'] ||
        row.Celular || row.celular || row.Whatsapp || row.whatsapp ||
        row.Movil || row.movil || row['Móvil'] || row['móvil'] ||
        row.Telf || row.telf || row.Contacto || row.contacto ||
        row.Numero || row.numero || row['Número'] || row.Cel || row.cel || ''
      );
      const rawTiposAcceso = normalize(
        row['Tipo de Acceso'] || row.TipoAcceso || row.TiposAcceso || row['Tipos de Acceso'] ||
        row.Proceso || row.proceso || row.Curso || row.Cursos || row.Suscripcion || row.Plan ||
        row.Acceso || row.accesos || row.Observacion || ''
      );

      if (!email || !email.includes('@')) {
        errores.push(`Fila ${i + 2}: Email inválido (${email}).`);
        continue;
      }

      // Resolver Rol, Duración y Accesos Individuales
      const accessRes = resolveUserAccessAndRole(rawRol, rawEstado, row.FechaFin || row.fechaFin, rawTiposAcceso);

      const phoneDigits = telefono ? telefono.replace(/[^0-9]/g, '') : '';
      const internalDni = phoneDigits.length >= 6 ? phoneDigits : `USR-${Date.now()}-${i}`;
      const badges = buildDocenteAccessBadges(modalidad, nivel, especialidad);
      const areasJson = JSON.stringify(badges);
      const tiposAccesoJson = JSON.stringify(accessRes.tiposAcceso);

      const existing = await prisma.usuarioDocente.findFirst({ where: { email } });
      if (existing) {
        const now = new Date();
        const existingPremiumVigente = isActivePremium(existing.rol, existing.fechaFin, now);
        const incomingIsPremium = accessRes.rolFinal === 'PREMIUM';
        const preserveExistingPremium = existingPremiumVigente && !incomingIsPremium;
        const finalFechaFin = existingPremiumVigente && existing.fechaFin > accessRes.fechaFin
          ? existing.fechaFin
          : accessRes.fechaFin;
        const updateData: any = {
          nombre: nombre || existing.nombre,
          rol: preserveExistingPremium ? existing.rol : accessRes.rolFinal,
          modalidad,
          nivel,
          areas: areasJson,
          region: region || (existing as any).region,
          fechaInicio: preserveExistingPremium ? existing.fechaInicio : accessRes.fechaInicio,
          fechaFin: finalFechaFin,
          tiposAcceso: preserveExistingPremium ? existing.tiposAcceso : tiposAccesoJson,
          modificadoPor: adminResponsable,
        };
        if (phoneDigits.length >= 6) {
          updateData.dni = phoneDigits;
          updateData.observacion = phoneDigits;
        }

        await prisma.usuarioDocente.update({
          where: { id: existing.id },
          data: updateData,
        });
        actualizados++;
      } else {
        await prisma.usuarioDocente.create({
          data: {
            email,
            nombre: nombre || 'Docente AVEND',
            dni: internalDni,
            observacion: phoneDigits.length >= 6 ? phoneDigits : null,
            pin: generateDocentePin(),
            rol: accessRes.rolFinal,
            modalidad,
            nivel,
            areas: areasJson,
            region,
            fechaInicio: accessRes.fechaInicio,
            fechaFin: accessRes.fechaFin,
            tiposAcceso: tiposAccesoJson,
            creadoPor: adminResponsable,
            modificadoPor: adminResponsable,
          },
        });
        creados++;
      }
    }

    invalidateUsuariosCache();
    revalidatePath('/admin');
    return { success: true, data: { creados, actualizados, errores } };
  } catch (error: any) {
    console.error('❌ [IMPORT EXCEL ERROR]:', error);
    return { success: false, error: { code: 'IMPORT_FAILED', message: error?.message || 'Error al importar Excel.' } };
  }
}
