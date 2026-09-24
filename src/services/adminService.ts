// src/services/adminService.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getUploadSignedPdfUrl } from '@/lib/r2';
import { MOCK_EVALUACIONES } from '@/data/mockEvaluaciones';
import { Evaluacion, ProcesoMinedu, ModalidadEducativa, NivelEducativo } from '@/types/evaluacion';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

import { OFFICIAL_ADMIN_ACCOUNTS, AdminAccount } from '@/data/adminAccounts';
import { REGISTRADOR_ROLE, requireActiveAdminSession, setServerSession } from '@/lib/serverSession';
import { checkAdminRoleAssignment, createAttemptLimiter, validateAdminPassword } from '@/lib/adminPolicy';
import { headers } from 'next/headers';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(value, salt, 32).toString('hex')}`;
}

function verifySecret(value: string, stored: string): boolean {
  if (!stored.startsWith('scrypt$')) return stored === value;
  const [, salt, digest] = stored.split('$');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(value, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type { AdminAccount };

// Solo el Superadministrador puede crear, editar o eliminar superadministradores y registradores.
async function checkRoleAssignmentForTarget(actorRole: string, requestedRole?: string, targetId?: string): Promise<string | null> {
  let targetRole: string | null = null;
  if (targetId) {
    const target = await prisma.adminUser.findUnique({ where: { id: targetId }, select: { rol: true } });
    targetRole = target?.rol ?? null;
  }
  return checkAdminRoleAssignment(actorRole, requestedRole, targetRole);
}

// 5 intentos fallidos por cuenta y 20 por IP cada 15 minutos (memoria de la instancia).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailuresByAccount = createAttemptLimiter(5, LOGIN_WINDOW_MS);
const loginFailuresByIp = createAttemptLimiter(20, LOGIN_WINDOW_MS);

function getClientIp(): string {
  try {
    const forwarded = headers().get('x-forwarded-for') || headers().get('x-real-ip') || '';
    return forwarded.split(',')[0].trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function resolveAdminPermissions(dbAdmin: {
  rol: string;
  permisoUsuarios: boolean;
  permisoCuadernillos: boolean;
  permisoRecursos: boolean;
  permisoMetricas: boolean;
}) {
  if (dbAdmin.rol === REGISTRADOR_ROLE) {
    return { usuarios: true, cuadernillos: false, recursos: false, metricas: false };
  }
  return {
    usuarios: dbAdmin.permisoUsuarios,
    cuadernillos: dbAdmin.permisoCuadernillos,
    recursos: dbAdmin.permisoRecursos,
    metricas: dbAdmin.permisoMetricas,
  };
}

export interface AdminUserItem {
  id: string;
  nombre: string;
  email: string;
  usuario: string;
  password?: string;
  rol: 'SUPERADMINISTRADOR' | 'ADMINISTRADOR' | string;
  estado: 'ACTIVO' | 'PAUSADO';
  permisoUsuarios: boolean;
  permisoCuadernillos: boolean;
  permisoRecursos: boolean;
  permisoMetricas: boolean;
  creadoPor?: string;
  modificadoPor?: string;
  createdAt: string;
}

// Lista Oficial Inicial de Administradores
const INITIAL_ADMIN_ACCOUNTS: AdminUserItem[] = [
  {
    id: 'admin-super-bryan',
    nombre: 'Bryan',
    email: 'cajacuenta767@gmail.com',
    usuario: 'cajacuenta767',
    password: undefined,
    rol: 'SUPERADMINISTRADOR',
    estado: 'ACTIVO',
    permisoUsuarios: true,
    permisoCuadernillos: true,
    permisoRecursos: true,
    permisoMetricas: true,
    creadoPor: 'Sistema AVEND',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-super-avendoficial',
    nombre: 'Superadministrador AVEND',
    email: 'avendoficial@gmail.com',
    usuario: 'avendoficial',
    password: undefined,
    rol: 'SUPERADMINISTRADOR',
    estado: 'ACTIVO',
    permisoUsuarios: true,
    permisoCuadernillos: true,
    permisoRecursos: true,
    permisoMetricas: true,
    creadoPor: 'Sistema AVEND',
    createdAt: new Date().toISOString(),
  },
];

export async function getOfficialAdminAccountsAction(): Promise<ActionResponse<AdminAccount[]>> {
  try {
    await requireActiveAdminSession();
    return { success: true, data: OFFICIAL_ADMIN_ACCOUNTS.map(({ userOrEmail, name, role }) => ({ userOrEmail, name, role, passOrPin: [] })) };
  } catch {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso denegado.' } };
  }
}

/**
 * Obtener Administradores Secundarios desde la Base de Datos (excluyendo a los Superadministradores)
 */
export async function getAdminUsersAction(): Promise<ActionResponse<AdminUserItem[]>> {
  try {
    await requireActiveAdminSession('usuarios');
    const dbAdmins = await prisma.adminUser.findMany({
      where: {
        AND: [
          { rol: { not: 'SUPERADMINISTRADOR' } },
          { email: { notIn: ['cajacuenta767@gmail.com', 'avendoficial@gmail.com'] } },
          { usuario: { notIn: ['cajacuenta767', 'avendoficial'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const list: AdminUserItem[] = (dbAdmins || []).map((item) => ({
      id: item.id,
      nombre: item.nombre,
      email: item.email,
      usuario: item.usuario,
      rol: item.rol,
      estado: item.estado as 'ACTIVO' | 'PAUSADO',
      permisoUsuarios: item.permisoUsuarios,
      permisoCuadernillos: item.permisoCuadernillos,
      permisoRecursos: item.permisoRecursos,
      permisoMetricas: item.permisoMetricas,
      creadoPor: item.creadoPor || 'Sistema AVEND',
      modificadoPor: item.modificadoPor || item.creadoPor || 'Sistema AVEND',
      createdAt: item.createdAt.toISOString(),
    }));
    return { success: true, data: list };
  } catch (error: unknown) {
    console.error('❌ [GET ADMIN USERS ERROR]:', error);
    return { success: false, error: { code: 'GET_ADMIN_USERS_FAILED', message: 'No se pudo recuperar el equipo administrativo.' } };
  }
}

/**
 * Crear un Nuevo Administrador con asignación de funciones (Permisos Exclusivos de SUPERADMINISTRADOR)
 */
export async function createAdminUserAction(data: {
  nombre: string;
  email: string;
  usuario: string;
  password?: string;
  rol?: string;
  permisoUsuarios?: boolean;
  permisoCuadernillos?: boolean;
  permisoRecursos?: boolean;
  permisoMetricas?: boolean;
  creadoPor?: string;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requireActiveAdminSession('usuarios');
    const roleError = await checkRoleAssignmentForTarget(actor.role, data.rol);
    if (roleError) return { success: false, error: { code: 'FORBIDDEN', message: roleError } };
    const cleanNombre = (data.nombre || '').trim();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanUsuario = (data.usuario || '').trim().toLowerCase();
    const passwordError = validateAdminPassword(data.password);
    if (passwordError) return { success: false, error: { code: 'WEAK_PASSWORD', message: passwordError } };
    const cleanPassword = (data.password || '').trim();

    if (!cleanNombre || !cleanEmail || !cleanUsuario) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Ingresa nombre, correo y usuario.' } };
    }

    const created = await prisma.adminUser.create({
      data: {
        nombre: cleanNombre,
        email: cleanEmail,
        usuario: cleanUsuario,
        password: hashSecret(cleanPassword),
        rol: data.rol || 'ADMINISTRADOR',
        estado: 'ACTIVO',
        permisoUsuarios: data.rol === REGISTRADOR_ROLE ? true : Boolean(data.permisoUsuarios ?? true),
        permisoCuadernillos: data.rol === REGISTRADOR_ROLE ? false : Boolean(data.permisoCuadernillos ?? true),
        permisoRecursos: data.rol === REGISTRADOR_ROLE ? false : Boolean(data.permisoRecursos ?? true),
        permisoMetricas: data.rol === REGISTRADOR_ROLE ? false : Boolean(data.permisoMetricas ?? true),
        creadoPor: data.creadoPor || 'Superadministrador AVEND',
        modificadoPor: data.creadoPor || 'Superadministrador AVEND',
      },
    });

    return { success: true, data: { id: created.id } };
  } catch (error: any) {
    console.error('❌ [CREATE ADMIN USER ERROR]:', error);
    return { success: false, error: { code: 'CREATE_FAILED', message: `Error al crear administrador: ${error?.message || error}` } };
  }
}

/**
 * Actualizar datos y casillas de permisos de un Administrador
 */
export async function updateAdminUserAction(
  id: string,
  data: {
    nombre?: string;
    email?: string;
    usuario?: string;
    password?: string;
    rol?: string;
    estado?: string;
    permisoUsuarios?: boolean;
    permisoCuadernillos?: boolean;
    permisoRecursos?: boolean;
    permisoMetricas?: boolean;
    modificadoPor?: string;
  }
): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requireActiveAdminSession('usuarios');
    const roleError = await checkRoleAssignmentForTarget(actor.role, data.rol, id);
    if (roleError) return { success: false, error: { code: 'FORBIDDEN', message: roleError } };
    if (data.password) {
      const passwordError = validateAdminPassword(data.password);
      if (passwordError) return { success: false, error: { code: 'WEAK_PASSWORD', message: passwordError } };
    }
    const updated = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.email && { email: data.email.trim().toLowerCase() }),
        ...(data.usuario && { usuario: data.usuario.trim().toLowerCase() }),
        ...(data.password && { password: hashSecret(data.password.trim()) }),
        ...(data.rol && { rol: data.rol }),
        ...(data.estado && { estado: data.estado }),
        ...(data.permisoUsuarios !== undefined && { permisoUsuarios: data.permisoUsuarios }),
        ...(data.permisoCuadernillos !== undefined && { permisoCuadernillos: data.permisoCuadernillos }),
        ...(data.permisoRecursos !== undefined && { permisoRecursos: data.permisoRecursos }),
        ...(data.permisoMetricas !== undefined && { permisoMetricas: data.permisoMetricas }),
        ...(data.modificadoPor && { modificadoPor: data.modificadoPor }),
      },
    });

    return { success: true, data: { id: updated.id } };
  } catch (error: any) {
    console.error('❌ [UPDATE ADMIN USER ERROR]:', error);
    return { success: false, error: { code: 'UPDATE_FAILED', message: 'Error al actualizar administrador.' } };
  }
}

/**
 * Eliminar un Administrador
 */
export async function deleteAdminUserAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requireActiveAdminSession('usuarios');
    const roleError = await checkRoleAssignmentForTarget(actor.role, undefined, id);
    if (roleError) return { success: false, error: { code: 'FORBIDDEN', message: roleError } };
    await prisma.adminUser.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('❌ [DELETE ADMIN USER ERROR]:', error);
    return { success: false, error: { code: 'DELETE_FAILED', message: 'Error al eliminar administrador.' } };
  }
}

/**
 * Autenticación oficial estricta para el Dashboard Administrador.
 */
export async function verifyAdminCredentialsAction(
  userOrEmail: string,
  passOrPin: string
): Promise<ActionResponse<{
  token: string;
  name: string;
  email?: string;
  role: string;
  permisoUsuarios: boolean;
  permisoCuadernillos: boolean;
  permisoRecursos: boolean;
  permisoMetricas: boolean;
}>> {
  try {
    const cleanUser = (userOrEmail || '').trim().toLowerCase();
    const cleanPass = (passOrPin || '').trim();
    const invalidCredentials = {
      success: false as const,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales o Código de Acceso Asignado incorrecto. Revisa correo y clave.',
      },
    };

    // El usuario/correo es obligatorio: nunca se autentica solo con la contraseña.
    if (!cleanUser || !cleanPass) return invalidCredentials;

    const clientIp = getClientIp();
    if (loginFailuresByAccount.isBlocked(cleanUser) || loginFailuresByIp.isBlocked(clientIp)) {
      return {
        success: false,
        error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo.' },
      };
    }

    // 1. Probar contra base de datos PostgreSQL filtrando estrictamente por usuario/email
    try {
      const dbAdmin = await prisma.adminUser.findFirst({
        where: { estado: 'ACTIVO', OR: [{ email: cleanUser }, { usuario: cleanUser }] },
      });

      if (dbAdmin && verifySecret(cleanPass, dbAdmin.password)) {
        loginFailuresByAccount.reset(cleanUser);
        if (!dbAdmin.password.startsWith('scrypt$')) {
          await prisma.adminUser.update({ where: { id: dbAdmin.id }, data: { password: hashSecret(cleanPass) } });
        }
        const permissions = resolveAdminPermissions(dbAdmin);
        setServerSession({ sub: dbAdmin.id, email: dbAdmin.email, role: dbAdmin.rol, permissions });
        return {
          success: true,
          data: {
            token: `admin_session_${Date.now()}_${dbAdmin.nombre.replace(/\s+/g, '_').toLowerCase()}`,
            name: dbAdmin.nombre,
            email: dbAdmin.email,
            role: dbAdmin.rol,
            permisoUsuarios: permissions.usuarios,
            permisoCuadernillos: permissions.cuadernillos,
            permisoRecursos: permissions.recursos,
            permisoMetricas: permissions.metricas,
          },
        };
      }
    } catch {}

    // 2. Probar coincidencia por correo específico en cuentas oficiales
    {
      const matchedByEmail = OFFICIAL_ADMIN_ACCOUNTS.find(
        (acc) =>
          acc.userOrEmail.map((u) => u.toLowerCase()).includes(cleanUser) &&
          acc.passOrPin.includes(cleanPass)
      );

      if (matchedByEmail) {
        loginFailuresByAccount.reset(cleanUser);
        const matchedAccount = INITIAL_ADMIN_ACCOUNTS.find(
          (acc) => acc.email.toLowerCase() === matchedByEmail.userOrEmail[0].toLowerCase()
        );

        setServerSession({ sub: matchedAccount?.id || 'official-admin', email: matchedByEmail.userOrEmail[0], role: matchedByEmail.role, permissions: { usuarios: true, cuadernillos: true, recursos: true, metricas: true } });
        return {
          success: true,
          data: {
            token: `admin_session_${Date.now()}_${matchedByEmail.name.replace(/\s+/g, '_').toLowerCase()}`,
            name: matchedByEmail.name,
            email: matchedByEmail.userOrEmail[0],
            role: matchedByEmail.role,
            permisoUsuarios: matchedAccount ? matchedAccount.permisoUsuarios : true,
            permisoCuadernillos: matchedAccount ? matchedAccount.permisoCuadernillos : true,
            permisoRecursos: matchedAccount ? matchedAccount.permisoRecursos : true,
            permisoMetricas: matchedAccount ? matchedAccount.permisoMetricas : true,
          },
        };
      }
    }

    loginFailuresByAccount.registerFailure(cleanUser);
    loginFailuresByIp.registerFailure(clientIp);
    return invalidCredentials;
  } catch (error: any) {
    return {
      success: false,
      error: { code: 'AUTH_ERROR', message: error?.message || 'Error en autenticación.' },
    };
  }
}

/**
 * Verifica si un correo electrónico pertenece a un Administrador para redirigir al Dashboard
 */
export async function checkIsAdminEmailAction(email: string): Promise<{ isAdmin: boolean; name?: string }> {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { isAdmin: false };

    // 1. Verificar en base de datos PostgreSQL
    const dbAdmin = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { usuario: cleanEmail }],
        estado: 'ACTIVO',
      },
    });

    if (dbAdmin) {
      return { isAdmin: true, name: dbAdmin.nombre };
    }

    // 2. Verificar en lista oficial de cuentas de administración
    const matchedOfficial = OFFICIAL_ADMIN_ACCOUNTS.find(
      (acc) => acc.userOrEmail.map((u) => u.toLowerCase()).includes(cleanEmail)
    );

    if (matchedOfficial) {
      return { isAdmin: true, name: matchedOfficial.name };
    }

    return { isAdmin: false };
  } catch (error) {
    return { isAdmin: false };
  }
}

/**
 * Verificación estricta de seguridad
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    await requireActiveAdminSession();
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el catálogo completo de evaluaciones para la consola de administración.
 */
export async function getAdminEvaluacionesAction(): Promise<ActionResponse<Evaluacion[]>> {
  try {
    await requireActiveAdminSession('cuadernillos');

    try {
      const dbEvaluations = await prisma.evaluation.findMany({
        include: { speciality: true },
        orderBy: { createdAt: 'desc' },
      });

      if (dbEvaluations && dbEvaluations.length > 0) {
        const formattedList: Evaluacion[] = dbEvaluations.map((item) => ({
          id: item.id,
          mineduCode: item.mineduCode,
          titulo: item.title,
          proceso: item.proceso as ProcesoMinedu,
          modalidad: item.modalidad as ModalidadEducativa,
          nivel: item.nivel as NivelEducativo,
          especialidad: item.speciality.name,
          especialidadLabel: `${item.nivel} - ${item.speciality.name}`,
          anio: item.anio,
          isLatest: item.anio >= 2024,
          resources: {
            cuadernilloKey: item.cuadernilloR2Key,
            resolucionKey: item.resolucionR2Key || undefined,
            clavesKey: item.clavesR2Key || undefined,
          },
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.createdAt.toISOString(),
        }));

        return { success: true, data: formattedList };
      }
    } catch {
      console.log('[Admin Service] Base de datos en espera. Retornando catálogo administrado mock.');
    }

    return { success: true, data: MOCK_EVALUACIONES };
  } catch (error) {
    console.error('[Admin Service Error]:', error);
    return {
      success: false,
      error: { code: 'ADMIN_FETCH_FAILED', message: 'Error al recuperar catálogo de administración' },
    };
  }
}

export interface CreateEvaluationInput {
  mineduCode: string;
  title: string;
  proceso: ProcesoMinedu;
  modalidad: ModalidadEducativa;
  nivel: NivelEducativo;
  especialidad: string;
  tipoCuadernillo?: string;
  anio: number;
  cuadernilloKey: string;
  resolucionKey?: string;
  clavesKey?: string;
  origenCuadernillo?: string;
  origenResolucion?: string;
  origenClaves?: string;
}

/**
 * Crea una nueva evaluación MINEDU en PostgreSQL o dataset en memoria.
 */
export async function createEvaluationAction(
  input: CreateEvaluationInput
): Promise<ActionResponse<Evaluacion>> {
  try {
    await requireActiveAdminSession('cuadernillos');

    const newEval: Evaluacion = {
      id: `eval-${Date.now()}`,
      mineduCode: input.mineduCode,
      titulo: input.title,
      proceso: input.proceso,
      modalidad: input.modalidad,
      nivel: input.nivel,
      especialidad: input.especialidad,
      especialidadLabel: `${input.nivel} - ${input.especialidad}`,
      anio: Number(input.anio),
      isLatest: Number(input.anio) >= 2024,
      resources: {
        cuadernilloKey: input.cuadernilloKey,
        resolucionKey: input.resolucionKey,
        clavesKey: input.clavesKey,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_EVALUACIONES.unshift(newEval);

    return { success: true, data: newEval };
  } catch (error) {
    console.error('[Create Evaluation Error]:', error);
    return {
      success: false,
      error: { code: 'CREATE_FAILED', message: 'No se pudo registrar la evaluación.' },
    };
  }
}

/**
 * Elimina una evaluación del banco de materiales.
 */
export async function deleteEvaluationAction(id: string): Promise<ActionResponse<{ deletedId: string }>> {
  try {
    await requireActiveAdminSession('cuadernillos');

    const index = MOCK_EVALUACIONES.findIndex((item) => item.id === id);
    if (index !== -1) {
      MOCK_EVALUACIONES.splice(index, 1);
    }

    return { success: true, data: { deletedId: id } };
  } catch (error) {
    console.error('[Delete Evaluation Error]:', error);
    return {
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Error al eliminar la evaluación.' },
    };
  }
}

/**
 * Genera una Signed URL de subida a Cloudflare R2 previa comprobación de rol ADMIN.
 */
export async function generateR2UploadUrlAction(
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<ActionResponse<{ uploadUrl: string; key: string }>> {
  try {
    await requireActiveAdminSession('cuadernillos');

    const sanitizeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `evaluations/${Date.now()}_${sanitizeName}`;

    const uploadUrl = await getUploadSignedPdfUrl(key, contentType, 300);

    return { success: true, data: { uploadUrl, key } };
  } catch (error) {
    console.error('[R2 Upload Presigned Action Error]:', error);
    return {
      success: false,
      error: { code: 'R2_UPLOAD_URL_FAILED', message: 'Fallo al solicitar la firma de carga R2.' },
    };
  }
}
