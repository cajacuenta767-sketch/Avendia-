// src/lib/authSession.ts
// Utility para manejo de sesión persistente de 30 días en localStorage y Cookies HTTP

export const DOCENTE_SESSION_KEY = 'docente_session';
export const ADMIN_SESSION_KEY = 'admin_auth_session';
export const THIRTY_DAYS_SECONDS = 10 * 365 * 24 * 60 * 60;

export interface DocenteSessionData {
  id: string;
  nombre: string;
  email: string;
  rol?: string;
  region?: string;
  institucionEducativa?: string;
  modalidad?: string;
  nivel?: string;
  areas?: string[];
  fechaFin?: string;
  estado?: string;
  tiposAcceso?: string[] | {
    Ascenso?: boolean;
    Nombramiento?: boolean;
    Directivo?: boolean;
  };
}

/**
 * Guarda la sesión del docente tanto en localStorage como en cookie persistente de 30 días
 */
export function saveDocenteSession(data: DocenteSessionData): void {
  if (typeof window === 'undefined') return;

  try {
    const jsonStr = JSON.stringify(data);

    // 1. Persistencia en localStorage
    localStorage.setItem(DOCENTE_SESSION_KEY, jsonStr);

    // 2. Persistencia en Cookie con tiempo de vida de 30 días (2,592,000s)
    const encodedValue = encodeURIComponent(jsonStr);
    document.cookie = `${DOCENTE_SESSION_KEY}=${encodedValue}; path=/; max-age=${THIRTY_DAYS_SECONDS}; SameSite=Lax`;

    // 3. Notificar a componentes en tiempo real
    window.dispatchEvent(new Event('docente_session_change'));
  } catch (err) {
    console.error('Error al guardar sesión docente:', err);
  }
}

function refreshLegacyCookie(data: DocenteSessionData): void {
  document.cookie = `${DOCENTE_SESSION_KEY}=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${THIRTY_DAYS_SECONDS}; SameSite=Lax`;
}

/**
 * Obtiene la sesión activa comprobando localStorage y cookie de respaldo
 */
export function getDocenteSession(): DocenteSessionData | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Intentar desde localStorage
    const localData = localStorage.getItem(DOCENTE_SESSION_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed && (parsed.email || parsed.id)) {
        refreshLegacyCookie(parsed as DocenteSessionData);
        return parsed;
      }
    }

    // 2. Intentar desde Cookie de respaldo
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === DOCENTE_SESSION_KEY && val) {
        const decoded = decodeURIComponent(val);
        const parsed = JSON.parse(decoded);
        if (parsed && (parsed.email || parsed.id)) {
          // Re-sincronizar localStorage si se restauró desde cookie
          localStorage.setItem(DOCENTE_SESSION_KEY, JSON.stringify(parsed));
          refreshLegacyCookie(parsed as DocenteSessionData);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error al leer sesión docente:', err);
  }

  return null;
}

/**
 * Elimina la sesión del docente (Cierre de sesión) en localStorage y destruye la Cookie
 */
export function clearDocenteSession(): void {
  if (typeof window === 'undefined') return;

  try {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    document.cookie = `${DOCENTE_SESSION_KEY}=; path=/; max-age=0; SameSite=Lax`;
    window.dispatchEvent(new Event('docente_session_change'));
  } catch (err) {
    console.error('Error al cerrar sesión docente:', err);
  }
}
