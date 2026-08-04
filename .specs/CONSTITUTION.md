# CONSTITUCIÓN DEL PROYECTO - AVEND ESCALA

> **Estatus:** DOCUMENTO INMUTABLE DE GOBERNANZA TÉCNICA  
> **Ámbito:** Repositorio Completo `avend-escala`  
> **Metodología:** Spec-Driven Development (SDD)

---

## 1. LEYES FUNDAMENTALES Y ANTI-ALUCINACIÓN

### 1.1 Inmutabilidad de la Constitución y Supremacía del Spec
1. Esta Constitución rige de manera jerárquica y vinculante sobre todas las decisiones de arquitectura, desarrollo y generación de código por parte de desarrolladores e Inteligencia Artificial (Antigravity IDE).
2. Ningún código fuente, componente, mutación o migración de base de datos podrá implementarse sin contar con una especificación previa formalizada en `.specs/features/XXX-[feature-name].md` y aprobada explícitamente.

### 1.2 Principio de Cero Alucinación y Control de Ámbito
1. **Prohibición de Creación Especulativa:** Queda estrictamente prohibido crear archivos, carpetas, tipos o componentes que no hayan sido contemplados en la especificación técnica aprobada.
2. **Prohibición de Refactorización Fuera de Ámbito:** Queda prohibido modificar, reorganizar o "limpiar" archivos ajenos a la tarea actual.
3. **Instalación Restringida de Paquetes:** Prohibida la ejecución de `npm install` de nuevas dependencias sin una justificación técnica documentada de costo/beneficio y la autorización previa del usuario.

### 1.3 Principio de Cero `any` (Tipado TypeScript Estricto)
1. Queda totalmente prohibido el uso del tipo `any` en todo el proyecto (`strict: true` activado en `tsconfig.json`).
2. Todas las estructuras de datos, props de componentes, respuestas de Server Actions y entidades de Prisma deben contar con interfaces o tipos explícitos declarados en `src/types/` o inferidos limpiamente mediante Zod/Prisma.
3. Se deben gestionar explícitamente todos los casos de `null` y `undefined` mediante tipos de unión discriminada y chequeos defensivos.

---

## 2. ARQUITECTURA Y PATRONES DE CÓDIGO (Next.js & Prisma)

### 2.1 Patrón Server-First y Aislamiento de Capa de Datos
1. **Server Components por Defecto:** Todo componente en la carpeta `src/app/` debe ser un React Server Component (RSC), garantizando que la carga de datos ocurra en el servidor cerca de la base de datos.
2. **Prohibición de Consultas en el Cliente:** Los componentes marcados con `'use client'` tienen **estrictamente prohibido** realizar llamadas directas a Prisma ORM, ejecutar queries SQL o acceder a variables de entorno de servidor.
3. **Capa de Servicios y Server Actions (`src/services/`):** Toda mutación o consulta de base de datos debe canalizarse a través de funciones asíncronas en `src/services/` o Server Actions dedicadas marcadas con `'use server'`.
4. **Instancia Singleton de Prisma:** Toda consulta a la base de datos debe reutilizar la instancia singleton exportada desde `src/lib/prisma.ts`.

### 2.2 Manejo Centralizado de Errores y Registro Defensivo
1. **Sin Fallos Silenciosos:** Queda prohibido el uso de bloques `catch` vacíos o el retorno silencioso de valores por defecto desinformados (`null`, `[]`, `{}`) cuando ocurra un fallo de sistema.
2. **Aislamiento de Detalles Sensibles:** Los errores del servidor o excepciones de PostgreSQL/Prisma nunca deben exponerse directamente al cliente. Todo error capturado debe ser transformado a un tipo estandarizado `ActionResponse<T>`:
   ```typescript
   export type ActionResponse<T> = 
     | { success: true; data: T }
     | { success: false; error: { code: string; message: string } };
   ```
3. **Mapeo de Errores de Dominio:** Los Server Actions deben validar la entrada con **Zod** y retornar códigos de error de dominio comprensibles para la interfaz de usuario (ej. `EVALUATION_NOT_FOUND`, `UNAUTHORIZED_ACCESS`).

---

## 3. ESTÁNDARES DE INTERFAZ Y DISEÑO (Tailwind & Shadcn UI)

### 3.1 Estética visual y UI Accesible
1. **Diseño de Grado Profesional:** La plataforma está orientada a docentes del MINEDU y debe transmitir sobriedad, modernidad, velocidad y claridad visual absoluta.
2. **Sistema de Componentes:** Se debe hacer uso exclusivo de Tailwind CSS y primitives de **Shadcn UI** ubicados en `src/components/ui/`.
3. **Responsive & Mobile First:** La interfaz debe adaptarse fluidamente a dispositivos móviles, tablets y monitores de escritorio.

### 3.2 Delimitación de Componentes de Cliente
1. La directiva `'use client'` debe colocarse en el nivel más bajo posible del árbol de componentes (ej. en el botón interactivo o el modal, no en toda la página).
2. Los componentes visuales deben ser desacoplados y reutilizables, separando componentes de UI pura (`src/components/ui/`) de componentes de dominio (`src/components/cuadernillos/`, `src/components/simulador/`).

---

## 4. SEGURIDAD, AUTENTICACIÓN Y ALMACENAMIENTO (Cloudflare R2)

### 4.1 Protección Estricta de Recursos PDF en Cloudflare R2
1. **Acceso Público Prohibido:** El bucket de Cloudflare R2 debe permanecer 100% privado. Ningún archivo PDF (cuadernillo, clave de respuestas o resolución) debe ser accesible mediante URLs públicas fijas.
2. **Generación de Signed URLs Temporales:** Todas las descargas y previsualizaciones deben realizarse generando URLs firmadas de duración limitada (TTL máximo de **300 segundos / 5 minutos**) mediante el SDK de S3 (`@aws-sdk/s3-request-presigner`) ejecutado en el servidor.
3. **Auditoría de Descargas:** La emisión de una Signed URL debe estar precedida por una verificación de sesión del usuario y el registro en la tabla `DownloadLog` de PostgreSQL.

### 4.2 Aislamiento de Credenciales y Variables de Entorno
1. Cero tolerancia al hardcodeo de claves API, tokens de R2 o cadenas de conexión a PostgreSQL.
2. Todas las credenciales deben gestionarse mediante `.env.local` en desarrollo y variables de entorno de servidor en producción.
3. El prefijo `NEXT_PUBLIC_` queda restringido a metadatos de configuración no sensibles.

---

## 5. FLUJO DE TRABAJO Y GOBERNANZA SDD

### 5.1 Fases del Ciclo de Vida del Desarrollo (SDD)
1. **Fase 1 - Especificación (`.specs/features/XXX.md`):** Definición clara de requisitos funcionales, modelo de datos, archivos involucrados y criterios de aceptación.
2. **Fase 2 - Plan de Ejecución Táctica (PEP):** Presentación detallada por parte de la IA o desarrollador de los cambios exactos a realizar (`[NEW]`, `[MODIFY]`).
3. **Fase 3 - Aprobación del Usuario:** Pausa obligatoria hasta obtener el consentimiento explícito del usuario.
4. **Fase 4 - Implementación & Verificación:** Ejecución estricta del plan y validación de tipos (`tsc --noEmit`).

### 5.2 Compromiso de Calidad y Mantenibilidad
Todo código producido para el proyecto AVEND ESCALA debe ser claro, autosuficiente, mantenible y estar alineado con los costos mínimos de operación ($0 egreso de datos).
