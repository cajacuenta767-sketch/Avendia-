// src/lib/email.ts
import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  toEmail: string;
  otpCode: string;
  nombreDocente?: string;
}

export async function sendOtpEmail({ toEmail, otpCode }: SendOtpEmailParams): Promise<{
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
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Formatear el código de 4 dígitos con espacio entre números (ej. 7 4 9 2)
    const formattedCode = otpCode.split('').join(' ');

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <!-- Cabecera Azul Institucional -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); padding: 34px 20px; text-align: center; color: #ffffff;">
          <h1 style="font-size: 30px; font-weight: 900; margin: 0; letter-spacing: -0.5px; text-transform: uppercase;">AVEND ESCALA</h1>
          <p style="font-size: 13px; margin: 6px 0 0 0; opacity: 0.95; font-weight: 700;">Plataforma de preparación docente</p>
          <p style="font-size: 12px; margin: 4px 0 0 0; opacity: 0.85; font-weight: 500; letter-spacing: 0.2px;">Banco de exámenes, claves y resolución.</p>
        </div>

        <!-- Cuerpo del Mensaje -->
        <div style="padding: 32px 28px; background-color: #ffffff;">
          <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0;">Tu código de verificación</h2>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
            Ingresa este código en AVEND ESCALA para confirmar tu correo electrónico y activar tu cuenta:
          </p>

          <!-- Caja del Código de 4 Dígitos -->
          <div style="border: 2px solid #60a5fa; border-radius: 16px; background-color: #f8fafc; padding: 24px 12px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 42px; font-weight: 800; color: #3b82f6; letter-spacing: 14px; font-family: monospace; display: inline-block;">
              ${formattedCode}
            </span>
          </div>

          <!-- Indicadores y Avisos -->
          <div style="font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0;">⏰ Este código expira en <strong>10 minutos</strong>.</p>
            <p style="margin: 0 0 0 0;">📁 Si no ves este correo en tu bandeja principal, revisa la carpeta de <strong>spam o correo no deseado</strong>.</p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; pt-20px; padding-top: 20px;">
            Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"AVEND ESCALA" <${smtpUser}>`,
      to: toEmail,
      subject: `🔑 ${otpCode} es tu código de verificación AVEND ESCALA`,
      html: htmlContent,
    });

    console.log(`✅ [REAL EMAIL SENT] Correo enviado exitosamente a ${toEmail} con código ${otpCode}: ${info.messageId}`);
    return { success: true, message: 'Correo enviado a Gmail exitosamente.' };
  } catch (error: any) {
    console.error('❌ [EMAIL ERROR]:', error);
    return { success: false, error: error?.message || 'Error al enviar correo mediante SMTP.' };
  }
}
