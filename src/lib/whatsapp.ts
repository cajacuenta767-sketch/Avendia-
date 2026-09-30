// src/lib/whatsapp.ts
// AVEND ESCALA - Generador de enlaces de WhatsApp para Soporte y Activación de Cuentas

const DEFAULT_SUPPORT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51954562938';

export type AccountAccessState =
  | 'ACTIVA'
  | 'EN_ESPERA'
  | 'PAUSADA'
  | 'VENCIDA'
  | 'PRUEBA_FINALIZADA';

export type AccountWhatsAppReason =
  | 'LOGIN_ACCESS'
  | 'UNREGISTERED'
  | 'WAITING'
  | 'PAUSED'
  | 'EXPIRED'
  | 'TRIAL_EXPIRED';

const formatAccountEmail = (email?: string): string => {
  const normalized = (email || '').trim().toLowerCase();
  return normalized.includes('@') ? normalized : '[correo electrónico]';
};

const ACCOUNT_WHATSAPP_MESSAGES: Record<AccountWhatsAppReason, (email: string) => string> = {
  LOGIN_ACCESS: (email) =>
    `Hola equipo de AVEND ESCALA. Deseo solicitar la activacion y el acceso a la plataforma de Cuadernillos y Resoluciones MINEDU.\n\nMi correo registrado es: ${email}.\n\nQuedo a la espera de su amable orientacion.`,
  UNREGISTERED: (email) =>
    `Hola equipo de AVEND ESCALA. Deseo registrarme y adquirir el plan de acceso a la plataforma de Cuadernillos y Resoluciones MINEDU.\n\nMi correo electronico es: ${email}.\n\nPor favor, brindarme la informacion necesaria para completar mi inscripcion.`,
  WAITING: (email) =>
    `Hola equipo de AVEND ESCALA. Mi cuenta se encuentra en espera de activacion y deseo habilitar mi acceso a los cuadernillos y solucionarios.\n\nMi correo registrado es: ${email}.\n\nMuchas gracias por su atencion.`,
  PAUSED: (email) =>
    `Hola equipo de AVEND ESCALA. Mi cuenta figura temporalmente pausada y deseo solicitar la revision y reactivacion de mi suscripcion docente.\n\nMi correo registrado es: ${email}.\n\nAgradezco su gentil apoyo para continuar con mi preparacion.`,
  EXPIRED: (email) =>
    `Hola equipo de AVEND ESCALA. Mi suscripcion a la plataforma docente ha concluido y deseo renovar mi plan para seguir accediendo a las evaluaciones y resoluciones.\n\nMi correo registrado es: ${email}.\n\nPor favor, compartirme los medios de renovacion disponibles.`,
  TRIAL_EXPIRED: (email) =>
    `Hola equipo de AVEND ESCALA. Concluyo satisfactoriamente mi periodo de prueba de 24 horas y deseo activar el plan completo e ilimitado de Cuadernillos y Resoluciones.\n\nMi correo registrado es: ${email}.\n\nQuedo atento a las indicaciones para realizar el pago y continuar.`,
};

/**
 * Genera la URL de la API de WhatsApp con mensaje codificado.
 * @param customMessage Mensaje opcional personalizado para la conversación
 */
export function getWhatsAppLink(customMessage?: string): string {
  const defaultText =
    'Hola equipo de AVEND ESCALA. Solicito gentilmente su orientacion y asistencia para el acceso a mi cuenta en la plataforma de Evaluaciones y Resoluciones MINEDU.';
  const message = customMessage ? customMessage : defaultText;
  const encodedText = encodeURIComponent(message);
  
  return `https://wa.me/${DEFAULT_SUPPORT_NUMBER}?text=${encodedText}`;
}

export function getAccountWhatsAppLink(reason: AccountWhatsAppReason, email?: string): string {
  return getWhatsAppLink(ACCOUNT_WHATSAPP_MESSAGES[reason](formatAccountEmail(email)));
}

export function getWhatsAppReasonForAccountState(state?: AccountAccessState): AccountWhatsAppReason {
  if (state === 'PAUSADA') return 'PAUSED';
  if (state === 'VENCIDA') return 'EXPIRED';
  if (state === 'PRUEBA_FINALIZADA') return 'TRIAL_EXPIRED';
  return 'WAITING';
}

/**
 * Genera un enlace directo de WhatsApp hacia el número de celular del docente con mensaje predeterminado.
 */
export function getUserWhatsAppLink(phone: string, nombre: string, email: string, pin?: string): string {
  const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
  const phoneWithCountry = cleanDigits.length === 9 ? `51${cleanDigits}` : cleanDigits;
  const pinMsg = pin && pin.trim() !== '' ? `\nSu PIN de acceso es: *${pin.trim()}*` : '';
  const message = `Hola docente ${nombre}, le saludamos de AVEND ESCALA. Su cuenta (${email}) se encuentra activa en: https://cuadernillos.avend.pe${pinMsg}\n\nExitos en su preparacion profesional.`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}
