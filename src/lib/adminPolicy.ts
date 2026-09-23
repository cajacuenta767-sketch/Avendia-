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
