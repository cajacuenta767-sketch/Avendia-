# FEATURE SPECIFICATION: [Nombre de la Funcionalidad]

- **ID:** `SPEC-XXX`
- **Fecha:** `YYYY-MM-DD`
- **Estado:** `DRAFT` | `APPROVED` | `IN_PROGRESS` | `COMPLETED`
- **Autor:** `Lead Software Architect`

---

## 1. Resumen Ejecutivo
Descripción concisa del objetivo de la funcionalidad, propuesta de valor para el docente y componentes involucrados.

---

## 2. Requisitos Funcionales y Casos de Uso
- **RF-01:** Descripción del requisito 1.
- **RF-02:** Descripción del requisito 2.
- **RF-03:** Caso de uso específico (docente descarga cuadernillo, filtra por nivel/especialidad, etc.).

---

## 3. Arquitectura Técnica y Componentes

### 3.1 Estructura de Archivos a Crear/Modificar
- `[NEW] src/app/...`
- `[NEW] src/components/...`
- `[MODIFY] src/services/...`

### 3.2 Modelo de Datos y Prisma Schema (Si aplica)
```prisma
// Extracto de modelos Prisma requeridos
```

### 3.3 Integración con Cloudflare R2 / S3 (Si aplica)
- Operaciones R2: `getObject`, `getSignedUrl`.
- Estrategia de egreso $0 USD.

---

## 4. Requisitos de Seguridad y Rendimiento
- **Variables de Entorno:** `.env.local` únicamente.
- **Validación Input:** Esquema Zod en Server Action.
- **Rendimiento:** Server Components para renderizado inicial < 1.2s LCP.

---

## 5. Plan de Pruebas y Verificación
- [ ] Verificación de tipado estricto (`tsc --noEmit`).
- [ ] Prueba manual de descarga/filtrado.
- [ ] Verificación de cero fugas de secretos en el bundle cliente.
