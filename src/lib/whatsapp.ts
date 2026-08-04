// src/lib/whatsapp.ts
// AVEND ESCALA - Generador de enlaces de WhatsApp para Soporte y Activación de Cuentas

const DEFAULT_SUPPORT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51900000000';

/**
 * Genera la URL de la API de WhatsApp con mensaje codificado.
 * @param customMessage Mensaje opcional personalizado para la conversación
 */
export function getWhatsAppLink(customMessage?: string): string {
  const defaultText =
    'Hola equipo de AVEND ESCALA, solicito asistencia para la activación/acceso a mi cuenta del Banco de Evaluaciones MINEDU.';
  const message = customMessage ? customMessage : defaultText;
  const encodedText = encodeURIComponent(message);
  
  return `https://wa.me/${DEFAULT_SUPPORT_NUMBER}?text=${encodedText}`;
}
