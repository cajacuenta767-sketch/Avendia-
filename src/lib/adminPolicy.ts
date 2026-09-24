// src/lib/adminPolicy.ts
// Reglas puras (sin dependencias) de roles administrativos, ventana de edición del
// REGISTRADOR y límite de intentos de acceso. Se prueban en tests/unit/.

export const REGISTRADOR_ROLE = 'REGISTRADOR';
export const SUPERADMIN_ROLE = 'SUPERADMINISTRADOR';
export const ADMIN_ROLES = ['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS'] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const REGISTRADOR_EDIT_WINDOW_MS = 14 * DAY_MS;
export const MIN_ADMIN_PASSWORD_LENGTH = 10;

export function hasAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function isPanelRole(role: string): boolean {
  return hasAdminRole(role) || role === REGISTRADOR_ROLE;
}

/** Fin de la ventana de edición: ampliación manual del Superadministrador o 14 días desde el registro. */
export function getRegistradorEditDeadline(createdAt: Date, edicionHasta?: Date | null): Date {
  const base = new Date(createdAt.getTime() + REGISTRADOR_EDIT_WINDOW_MS);
  return edicionHasta && edicionHasta > base ? edicionHasta : base;
}

export function isWithinRegistradorEditWindow(
  createdAt: Date,
  edicionHasta?: Date | null,
  now: Date = new Date()
): boolean {
  return now < getRegistradorEditDeadline(createdAt, edicionHasta);
}

/**
 * Solo el Superadministrador puede asignar o gestionar cuentas SUPERADMINISTRADOR o REGISTRADOR.
 * Devuelve el mensaje de error o null si la operación está permitida.
 */
export function checkAdminRoleAssignment(
  actorRole: string,
  requestedRole?: string | null,
  targetCurrentRole?: string | null
): string | null {
  if (actorRole === SUPERADMIN_ROLE) return null;
  const restricted = [SUPERADMIN_ROLE, REGISTRADOR_ROLE];
  if ((requestedRole && restricted.includes(requestedRole)) || (targetCurrentRole && restricted.includes(targetCurrentRole))) {
    return 'Solo el Superadministrador puede gestionar superadministradores y registradores.';
  }
  return null;
}

export function validateAdminPassword(password: string | undefined | null): string | null {
  const value = (password || '').trim();
  if (value.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export interface AttemptLimiter {
  isBlocked(key: string, now?: number): boolean;
  registerFailure(key: string, now?: number): void;
  reset(key: string): void;
}

/** Limitador de intentos fallidos en memoria (por instancia del servidor). */
export function createAttemptLimiter(maxFailures: number, windowMs: number): AttemptLimiter {
  const store = new Map<string, { count: number; resetAt: number }>();
  return {
    isBlocked(key, now = Date.now()) {
      const entry = store.get(key);
      if (!entry) return false;
      if (entry.resetAt <= now) {
        store.delete(key);
        return false;
      }
      return entry.count >= maxFailures;
    },
    registerFailure(key, now = Date.now()) {
      const entry = store.get(key);
      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count += 1;
      }
    },
    reset(key) {
      store.delete(key);
    },
  };
}

// Perú no aplica horario de verano: UTC-05:00 todo el año.
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export interface SemanaAltas {
  /** Lunes 00:00 hora de Perú (instante UTC). */
  inicio: Date;
  /** Lunes siguiente 00:00 hora de Perú (exclusivo). */
  fin: Date;
}

/** Lunes 00:00 (hora de Perú) de la semana que contiene `date`. */
export function getPeruWeekStart(date: Date): Date {
  const local = new Date(date.getTime() - PERU_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - daysSinceMonday * DAY_MS;
  return new Date(mondayLocalMidnight + PERU_OFFSET_MS);
}

/** Últimas `cantidad` semanas (lunes a domingo, hora de Perú), de la más reciente a la más antigua. */
export function buildSemanasAltas(cantidad: number, now: Date = new Date()): SemanaAltas[] {
  const actual = getPeruWeekStart(now).getTime();
  return Array.from({ length: cantidad }, (_, i) => {
    const inicio = actual - i * WEEK_MS;
    return { inicio: new Date(inicio), fin: new Date(inicio + WEEK_MS) };
  });
}

/** Índice de la semana (0 = actual) a la que pertenece `date`, o -1 si queda fuera del rango. */
export function getSemanaIndex(date: Date, semanas: SemanaAltas[]): number {
  return semanas.findIndex((s) => date >= s.inicio && date < s.fin);
}
