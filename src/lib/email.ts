// src/lib/email.ts
import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  toEmail: string;
  otpCode: string;
  nombreDocente?: string;
}

export async function sendOtpEmail({ toEmail, otpCode, nombreDocente }: SendOtpEmailParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.GMAIL_PASS || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('⚠️ [SMTP CONFIG] No se encontraron credenciales GMAIL_USER / GMAIL_PASS en .env');
    return {
      success: false,
      message: 'Falta configurar GMAIL_USER y GMAIL_PASS en el archivo .env para envíos reales.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL directo para máxima confiabilidad
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      pool: true,
      maxConnections: 3,
    });

    const nombreDestinatario = nombreDocente && nombreDocente !== 'Usuario' ? nombreDocente : 'Docente';

    // 1. Versión en Texto Plano (Fundamental para filtros antispam de Gmail / Outlook)
    const textContent = `AVEND ESCALA - Plataforma Docente Oficial

Hola, ${nombreDestinatario}:

Tu código de verificación para ingresar a AVEND ESCALA es:
${otpCode}

Ingresa estos 4 dígitos en la plataforma para confirmar tu identidad y acceder a los cuadernillos, claves oficiales y solucionarios.

• Este código es de uso personal y expira en 10 minutos.
• Si no solicitaste este código, puedes ignorar este mensaje de forma segura.

Atentamente,
Equipo AVEND ESCALA
https://cuadernillos.avend.pe`;

    // 2. Versión en HTML Profesional y Optimizado
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificación - AVEND ESCALA</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                
                <!-- Encabezado Institucional -->
                <tr>
                  <td align="center" style="background-color: #1d4ed8; padding: 28px 20px; color: #ffffff;">
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase;">AVEND ESCALA</h1>
                    <p style="font-size: 12px; font-weight: 700; margin: 4px 0 0 0; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.5px;">Plataforma Docente Oficial</p>
                  </td>
                </tr>

                <!-- Contenido Principal -->
                <tr>
                  <td style="padding: 32px 24px; background-color: #ffffff;">
                    <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0; font-weight: 600;">
                      Estimado(a) ${nombreDestinatario}:
                    </p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                      Ingresa el siguiente código de verificación de 4 dígitos para acceder a tus materiales de evaluación:
                    </p>

                    <!-- Bloque del Código OTP -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
                      <tr>
                        ${otpCode
                          .split('')
                          .map(
                            (digit) => `
                          <td align="center" valign="middle" style="width: 48px; height: 56px; background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 10px; font-size: 28px; font-weight: 900; color: #1d4ed8; font-family: 'Courier New', Courier, monospace; text-align: center; padding: 0 2px;">
                            ${digit}
                          </td>
                          <td style="width: 8px;"></td>
                        `
                          )
                          .join('')}
                      </tr>
                    </table>

                    <!-- Aviso de Seguridad y Validez -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 10px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 12px 16px; font-size: 12px; color: #475569; line-height: 1.5;">
                          ⏱️ Código de un solo uso válido por <strong>10 minutos</strong>.<br>
                          🔒 Por tu seguridad, no compartas este código con nadie.
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                      Si no solicitaste este acceso, puedes ignorar este mensaje.<br>
                      © AVEND ESCALA — Evaluaciones y Preparación Docente
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"AVEND ESCALA" <${smtpUser}>`,
      to: toEmail,
      subject: `Código de verificación: ${otpCode} | AVEND ESCALA`,
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    console.log(`✅ [EMAIL DELIVERED] Correo transaccional enviado a ${toEmail} con código ${otpCode} (MessageId: ${info.messageId})`);
    return { success: true, message: 'Correo enviado exitosamente.' };
  } catch (error: any) {
    console.error('❌ [EMAIL ERROR]:', error);
    return { success: false, error: error?.message || 'Error al enviar correo mediante SMTP.' };
  }
}
