// src/lib/r2.ts
// AVEND ESCALA - Cliente de Almacenamiento Cloudflare R2 y Generador de Signed URLs ($0 Egress)

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'avend-escala-pdfs';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : 'https://placeholder.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: R2_SECRET_ACCESS_KEY || 'placeholder',
  },
});

/**
 * Genera una Signed URL de LECTURA (GetObjectCommand) para acceder a un PDF en Cloudflare R2.
 */
export async function getSignedPdfUrl(key: string, expiresInSegs: number = 300): Promise<string> {
  try {
    if (!key) return '';

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error('R2_NOT_CONFIGURED');

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: Math.min(Math.max(expiresInSegs, 1), 300) });
    return signedUrl;
  } catch (error) {
    console.error(`[Cloudflare R2 Error] Error al generar Signed URL para ${key}:`, error);
    throw new Error('R2_SIGNING_FAILED');
  }
}

/**
 * Genera una Signed URL de SUBIDA (PutObjectCommand) exclusiva para administradores.
 * Permite la ingesta directa desde el navegador cliente hacia Cloudflare R2.
 */
export async function getUploadSignedPdfUrl(
  key: string,
  contentType: string = 'application/pdf',
  expiresInSegs: number = 900
): Promise<string> {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      // Endpoint simulado para entornos de prueba sin credenciales R2
      throw new Error('R2_NOT_CONFIGURED');
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadSignedUrl = await getSignedUrl(r2Client, command, { expiresIn: Math.min(Math.max(expiresInSegs, 1), 300) });
    return uploadSignedUrl;
  } catch (error) {
    console.error(`[Cloudflare R2 Upload Error] Error al generar Upload URL para ${key}:`, error);
    throw new Error('Fallo la generación de la URL de carga en R2');
  }
}
