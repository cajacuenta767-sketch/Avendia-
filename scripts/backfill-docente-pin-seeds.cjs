const { randomInt } = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) throw new Error('No se encontró DATABASE_URL ni el archivo .env.');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((item) => /^DATABASE_URL\s*=/.test(item));
  if (!line) throw new Error('DATABASE_URL no está configurada.');
  process.env.DATABASE_URL = line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
}

function newSeed() {
  return randomInt(1000, 10000).toString();
}

async function main() {
  loadDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    const missing = await prisma.usuarioDocente.findMany({
      where: { pin: '' },
      select: { id: true },
    });
    console.log(`PIN vacíos detectados: ${missing.length}`);

    if (!process.argv.includes('--apply')) {
      console.log('Modo diagnóstico: no se modificó ningún registro. Usa --apply solo tras confirmar la base objetivo.');
      return;
    }

    for (let index = 0; index < missing.length; index += 100) {
      const batch = missing.slice(index, index + 100);
      await prisma.$transaction(
        batch.map((user) => prisma.usuarioDocente.update({
          where: { id: user.id },
          data: { pin: newSeed() },
        }))
      );
    }

    console.log(`PIN completados: ${missing.length}. No se eliminó ni sobrescribió ningún PIN existente.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
