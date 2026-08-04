// prisma/seed.ts
// AVEND ESCALA - Script de Sembrado Idempotente para PostgreSQL

import { PrismaClient, UserRole, ProcesoMinedu, ModalidadEducativa, NivelEducativo, StatusEvaluation } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos en PostgreSQL para AVEND ESCALA...');

  // 1. Crear Usuario Administrador de Prueba
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@avendescala.pe' },
    update: {},
    create: {
      email: 'admin@avendescala.pe',
      fullName: 'Administrador AVEND ESCALA',
      passwordHash: '$2a$12$eImiTXuWVxfM37uY4JANjOL.81F4n3y1g8w.8oG3rV9O.V3d0b2.', // Hash de prueba
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Usuario Admin creado/verificado: ${adminUser.email}`);

  // 2. Crear Especialidades MINEDU principales
  const especialidadMat = await prisma.speciality.upsert({
    where: { slug: 'matematica' },
    update: {},
    create: {
      name: 'Matemática',
      slug: 'matematica',
      nivel: NivelEducativo.SECUNDARIA,
    },
  });

  const especialidadCom = await prisma.speciality.upsert({
    where: { slug: 'comunicacion' },
    update: {},
    create: {
      name: 'Comunicación',
      slug: 'comunicacion',
      nivel: NivelEducativo.SECUNDARIA,
    },
  });

  console.log('✅ Especialidades MINEDU registradas');

  // 3. Crear Evaluación de Prueba (Nombramiento 2024 Matemática)
  const eval2024 = await prisma.evaluation.upsert({
    where: { mineduCode: 'MINEDU-2024-NOM-SEC-MAT' },
    update: {},
    create: {
      title: 'Prueba Única Nacional Nombramiento Docente 2024 - Educación Secundaria Matemática',
      mineduCode: 'MINEDU-2024-NOM-SEC-MAT',
      proceso: ProcesoMinedu.NOMBRAMIENTO_DOCENTE,
      modalidad: ModalidadEducativa.EBR,
      nivel: NivelEducativo.SECUNDARIA,
      anio: 2024,
      status: StatusEvaluation.PUBLISHED,
      description: 'Evaluación oficial aplicada para el ingreso a la Carrera Pública Magisterial 2024.',
      cuadernilloR2Key: 'evaluations/2024/nombramiento/secundaria-matematica-cuadernillo.pdf',
      clavesR2Key: 'evaluations/2024/nombramiento/secundaria-matematica-claves.pdf',
      resolucionR2Key: 'evaluations/2024/nombramiento/secundaria-matematica-resolucion.pdf',
      specialityId: especialidadMat.id,
      createdById: adminUser.id,
    },
  });

  console.log(`✅ Evaluación sembrada: ${eval2024.title}`);
  console.log('🚀 Sembrado de datos completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
