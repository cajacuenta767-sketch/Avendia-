import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  hasAdminRole,
  isPanelRole,
  REGISTRADOR_ROLE,
  SUPERADMIN_ROLE,
} from '@/lib/adminPolicy';

export {
  REGISTRADOR_ROLE,
  REGISTRADOR_EDIT_WINDOW_MS,
  getRegistradorEditDeadline,
  isWithinRegistradorEditWindow,
} from '@/lib/adminPolicy';

const SESSION_COOKIE = 'avend_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 3650;
const sessionSecret = process.env.SESSION_SECRET;

// Cuentas oficiales definidas por variables de entorno (no existen en admin_users).
const OFFICIAL_ADMIN_SUBS = new Set(['official-admin', 'admin-super-bryan', 'admin-super-avendoficial']);

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
  permissions?: Record<string, boolean>;
};

export type UsuariosScope =
  | { scope: 'ALL'; session: SessionPayload }
  | { scope: 'OWN'; adminId: string; session: SessionPayload };

// Las cookies legacy no están firmadas: nunca pueden otorgar un rol administrativo.
function readLegacySession(): SessionPayload | null {
  const legacyCookies = [
    cookies().get('admin_auth_session')?.value,
    cookies().get('docente_session')?.value,
  ];

  for (const legacy of legacyCookies) {
    if (!legacy) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(legacy)) as { id?: string; email?: string; nombre?: string; rol?: string; role?: string; isAdmin?: boolean };
      if (!parsed.id && !parsed.email) continue;
      const claimedRole = (parsed.role || parsed.rol || 'DOCENTE').toUpperCase();
      const role = isPanelRole(claimedRole) ? 'DOCENTE' : claimedRole;
      return { sub: parsed.id || parsed.email || 'legacy-session', email: parsed.email || '', role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
    } catch {
      continue;
    }
  }

  return null;
}

function sign(value: string): string {
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET_MISSING');
  }
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

export function createServerSession(payload: Omit<SessionPayload, 'exp'>): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readServerSession(): SessionPayload | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export function readAnySession(): SessionPayload | null {
  return readServerSession() || readLegacySession();
}

export function setServerSession(payload: Omit<SessionPayload, 'exp'>): void {
  cookies().set(SESSION_COOKIE, createServerSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearServerSession(): void {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

/**
 * Una sesión de panel solo es válida mientras su cuenta siga ACTIVA y conserve el mismo rol:
 * pausar, eliminar o cambiar de rol a un administrador revoca su sesión de inmediato.
 */
export async function isPanelAccountActive(session: SessionPayload): Promise<boolean> {
  if (!isPanelRole(session.role)) return true;
  if (session.role === SUPERADMIN_ROLE && OFFICIAL_ADMIN_SUBS.has(session.sub)) return true;
  try {
    const account = await prisma.adminUser.findUnique({ where: { id: session.sub }, select: { estado: true, rol: true } });
    return Boolean(account && account.estado === 'ACTIVO' && account.rol === session.role);
  } catch {
    return false;
  }
}

/** Solo valida la firma y el rol. Para mutaciones usar requireActiveAdminSession. */
export function requireAdminSession(permission?: string): SessionPayload {
  // Las mutaciones administrativas nunca deben aceptar la cookie legacy del
  // navegador: solo la sesión firmada y HTTP-only emitida por el servidor.
  const session = readServerSession();
  if (!session || !hasAdminRole(session.role)) {
    throw new Error('UNAUTHORIZED');
  }
  if (permission && session.role !== SUPERADMIN_ROLE && session.permissions?.[permission] === false) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function requireActiveAdminSession(permission?: string): Promise<SessionPayload> {
  const session = requireAdminSession(permission);
  if (!(await isPanelAccountActive(session))) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/**
 * Alcance de gestión de docentes: los administradores ven a todos; un REGISTRADOR
 * solo a los docentes que él mismo creó. REGISTRADOR no forma parte de ADMIN_ROLES,
 * por lo que no supera requireAdminSession ni el resto de módulos administrativos.
 */
export async function requireUsuariosScope(): Promise<UsuariosScope> {
  const session = readServerSession();
  if (!session || !isPanelRole(session.role)) throw new Error('UNAUTHORIZED');
  if (!(await isPanelAccountActive(session))) throw new Error('UNAUTHORIZED');
  if (session.role === REGISTRADOR_ROLE) {
    return { scope: 'OWN', adminId: session.sub, session };
  }
  return { scope: 'ALL', session };
}
