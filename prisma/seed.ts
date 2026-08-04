// prisma/seed.ts
// AVEND ESCALA - Script de Sembrado
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos para AVEND ESCALA...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@avendescala.pe' },
    update: {},
    create: {
      email: 'admin@avendescala.pe',
      fullName: 'Administrador AVEND ESCALA',
      passwordHash: '$2a$12$eImiTXuWVxfM37uY4JANjOL.81F4n3y1g8w.8oG3rV9O.V3d0b2.',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Usuario Admin creado/verificado: ${adminUser.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
