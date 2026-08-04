# REGLAS DE GOBERNANZA Y COMPORTAMIENTO PARA CURSOR / ANTIGRAVITY IDE - AVEND ESCALA

> **Estatus:** OBLIGATORIO E INMUTABLE  
> **Ámbito:** Raíz del proyecto `avend-escala`  
> **Propósito:** Gobernanza de IA, Metodología Spec-Driven Development (SDD), Anti-Alucinación y Seguridad Estricta.

---

## 1. PROTOCOLO DE GOBERNANZA SDD (SPEC-DRIVEN DEVELOPMENT)

Cualquier intervención de la IA en la base de código debe ajustarse a las siguientes etapas sin excepción:

### 1.1 Lectura Previa de Especificaciones
- Antes de proponer o escribir código en `src/`, la IA DEBE inspeccionar `.specs/CONSTITUTION.md` y la especificación técnica correspondiente en `.specs/features/XXX-[feature-name].md`.
- Si la tarea del usuario no está asociada a una especificación formal o el usuario no hace referencia explícita a un paso dentro de `.specs/features/*.md`, la IA DEBE solicitar la creación o indicación del spec correspondiente antes de modificar el código fuente.

### 1.2 Plan de Ejecución Táctica (PEP) y Aprobación
- La IA NUNCA debe generar o editar archivos de producción directamente sin antes entregar un **Plan de Ejecución Táctica (PEP)**.
- El PEP debe detallar:
  1. Archivos a crear (`[NEW]`) o modificar (`[MODIFY]`).
  2. Modificaciones de tipos TypeScript o esquemas de Prisma.
  3. Contratos de Server Actions / API y validaciones de seguridad Zod.
  4. Impacto en la UI/UX.
- **Detención Obligatoria:** Tras entregar el PEP, la IA DEBE pausar y esperar la **confirmación explícita del usuario** ("Aprobado", "Proceder", "Adelante") antes de realizar cualquier cambio en el sistema de archivos.

---

## 2. ANTI-ALUCINACIÓN Y CONTROL RIGUROSO DE ÁMBITO

### 2.1 Cero Alteraciones Fuera de Ámbito
- Queda estrictamente PROHIBIDO refactorizar, "limpiar" o reorganizar archivos, componentes o utilidades que no formen parte explícita de la especificación técnica o de la tarea autorizada.
- No modificar formatos o estilos en archivos no tocados por la característica actual.

### 2.2 Control de Dependencias (`npm install`)
- La IA NUNCA debe ejecutar ni sugerir comandos de instalación de nuevos paquetes `npm` sin antes presentar una **Justificación de Dependencias**:
  - Por qué la biblioteca estándar o el stack actual (Next.js, Tailwind, Shadcn UI, Prisma, S3-SDK) no es suficiente.
  - Análisis del impacto en el tamaño del bundle.
- Requiere autorización previa y explícita del usuario para cualquier instalación.

### 2.3 Clarificación Activa de Ambigüedades
- Si faltan reglas de negocio, flujos de UI, campos de base de datos o criterios de filtrado en la especificación, la IA DEBE **detenerse y formular preguntas concretas al usuario**.
- Queda PROHIBIDO inventar requisitos, asunciones de UI no documentadas o componentes fantasma.

---

## 3. SEGURIDAD, TIPADO Y ESTÁNDARES TÉCNICOS

### 3.1 Aislamiento de Credenciales (Zero Secret Leakage)
- Queda prohibido escribir cualquier clave API, secreto de R2, string de conexión a PostgreSQL o token de sesión directamente en código fuente client/server.
- Se debe utilizar exclusivamente `process.env.[VARIABLE]` cargado desde `.env.local`.
- Prohibido calificar variables sensibles con el prefijo `NEXT_PUBLIC_`.

### 3.2 Protección de Recursos en Cloudflare R2
- Ningún archivo PDF (cuadernillo, clave o resolución) debe servirse mediante URLs públicas fijas.
- Todas las descargas y previsualizaciones deben generarse en el servidor utilizando **Signed URLs** de Cloudflare R2 con expiración máxima de 300 segundos (5 minutos) y registradas en `DownloadLog`.

### 3.3 TypeScript Estricto (Strict Mode: True)
- Deshabilitado el uso del tipo `any`. Se deben utilizar tipos nativos, genéricos restringidos o tipos inferidos de Zod/Prisma.
- Manejo explícito de valores nulos o indefinidos (`null`, `undefined`) en respuestas asíncronas.

### 3.4 Next.js 14+ App Router Best Practices
- **Server Components:** Utilizados por defecto para carga de datos inicial y layouts.
- **Client Components:** Usar `'use client'` únicamente cuando existan eventos del DOM o estado reactivo local (`useState`, `useEffect`).
- **Server Actions:** Todas las mutaciones deben residir en `src/services/` y estar validadas con Zod.

---

## 4. FORMATO DE RESPUESTA INTERNO (CHAIN OF THOUGHT)

En cada interacción, la IA debe estructurar su razonamiento interno respetando la siguiente arquitectura de pensamiento antes de entregar código o planes técnicos:

```markdown
### 🧠 RAZONAMIENTO PASO A PASO (Chain of Thought)
1. **Análisis del Requerimiento:** Verificación de alineación con `.specs/CONSTITUTION.md` y `.specs/features/*.md`.
2. **Evaluación de Seguridad y Tipado:** Validación de aislamiento de variables de entorno, Signed URLs y tipado TypeScript.
3. **Control de Ámbito:** Confirmación de que NO se instalarán paquetes no autorizados ni se modificarán archivos ajenos al spec.
4. **Definición del Plan:** Estructura de archivos a modificar/crear para aprobación del usuario.
```
