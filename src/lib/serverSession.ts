import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'avend_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 3650;
const sessionSecret = process.env.SESSION_SECRET;
const ADMIN_ROLES = ['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS'] as const;

function hasAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
  permissions?: Record<string, boolean>;
};

export const REGISTRADOR_ROLE = 'REGISTRADOR';
export const REGISTRADOR_EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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
      const role = hasAdminRole(claimedRole) || claimedRole === REGISTRADOR_ROLE ? 'DOCENTE' : claimedRole;
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

export function requireAdminSession(permission?: string): SessionPayload {
  // Las mutaciones administrativas nunca deben aceptar la cookie legacy del
  // navegador: solo la sesión firmada y HTTP-only emitida por el servidor.
  const session = readServerSession();
  if (!session || !hasAdminRole(session.role)) {
    throw new Error('UNAUTHORIZED');
  }
  if (permission && session.role !== 'SUPERADMINISTRADOR' && session.permissions?.[permission] === false) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Alcance de gestión de docentes: los administradores ven a todos; un REGISTRADOR
 * solo a los docentes que él mismo creó. REGISTRADOR no forma parte de ADMIN_ROLES,
 * por lo que no supera requireAdminSession ni el resto de módulos administrativos.
 */
export function requireUsuariosScope(): UsuariosScope {
  const session = readServerSession();
  if (!session) throw new Error('UNAUTHORIZED');
  if (session.role === REGISTRADOR_ROLE && session.sub) {
    return { scope: 'OWN', adminId: session.sub, session };
  }
  if (!hasAdminRole(session.role)) throw new Error('UNAUTHORIZED');
  return { scope: 'ALL', session };
}

export function isWithinRegistradorEditWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < REGISTRADOR_EDIT_WINDOW_MS;
}
