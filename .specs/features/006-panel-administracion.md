# SPEC-006: Panel de Administración Seguro (Backoffice Admin)

- **ID:** `SPEC-006`
- **Fecha:** `2026-07-29`
- **Estado:** `COMPLETED`
- **Módulo:** `admin-backoffice`
- **Autor:** `Senior Security Engineer & Frontend Architect`

---

## 1. RESUMEN Y CRITERIOS DE ACEPTACIÓN

### 1.1 Resumen Ejecutivo
El Panel de Administración (Backoffice Admin) en `/admin` proporciona una consola protegida para la gestión integral del banco de materiales MINEDU (cuadernillos, soluciones, claves y fichas didácticas). Garantiza un control de acceso por roles (**RBAC**) infalible donde solo los usuarios autenticados con rol `ADMIN` pueden realizar mutaciones o solicitar URLs de subida a Cloudflare R2.

### 1.2 Criterios de Aceptación de Seguridad & RBAC
1. **Control de Acceso Estricto (Zero Backdoor):**
   - **Middleware:** Toda petición a `/admin/*` o `/api/admin/*` verifica la sesión y rechaza inmediatamente solicitudes de usuarios no autenticados o con rol `DOCENTE` / `GUEST` mediante redirección a `/login`.
   - **Server Actions:** Cada Server Action en `src/services/adminService.ts` ejecuta `verifyAdminSession()` antes de procesar o interactuar con Prisma ORM o Cloudflare R2.

2. **Subida Segura a Cloudflare R2 (Presigned Upload URLs):**
   - La subida directa de archivos PDF de hasta 20 MB se realiza mediante URLs firmadas de subida (`PutObjectCommand`) emitidas exclusivamente por el servidor a administradores verificados.
   - Validación estricta en servidor de tipo MIME (`application/pdf`) y extensión `.pdf`.

3. **Gestión de Evaluaciones (CRUD):**
   - **Lectura:** Tabla con paginación, filtros por proceso y buscador por código MINEDU.
   - **Creación/Edición:** Modal interactivo `EvaluationFormModal.tsx` con barras de progreso de carga de PDF para Cuadernillo, Resolución y Claves.
   - **Eliminación:** Confirmación con diálogo modal y eliminación en cascada en PostgreSQL y desvinculación en R2.

---

## 2. ARQUITECTURA DE COMPONENTES CREADOS

1. **`src/services/adminService.ts`** (Capa de Servicios Protegida)
   - `verifyAdminSession()`: Guardián de seguridad que comprueba el rol `ADMIN`.
   - `getAdminEvaluacionesAction()`: Obtención de todas las evaluaciones para la consola.
   - `createEvaluationAction(data)`: Creación de nueva evaluación en PostgreSQL via Prisma.
   - `deleteEvaluationAction(id)`: Eliminación segura.
   - `generateR2UploadUrlAction(fileName, contentType)`: Emisión de Presigned URL de subida R2 (`PutObjectCommand`).

2. **`src/components/admin/AdminSidebar.tsx`**
   - Menú de navegación lateral del panel (Dashboard, Evaluaciones, Recursos, Logs de Auditoría).

3. **`src/components/admin/EvaluationsTable.tsx`**
   - Tabla interactiva con estado de archivos R2, badges de proceso y opciones de eliminación.

4. **`src/components/admin/EvaluationFormModal.tsx`**
   - Formulario modal para ingesta de material con selectores de Proceso, Modalidad, Nivel, Área y subida de archivos PDF <= 20 MB a R2.

5. **`src/app/admin/page.tsx`**
   - Dashboard principal del módulo administrativo.

---

## 3. PLAN DE TAREAS ATÓMICAS (Checklist de Implementación)

- [x] **Tarea 6.1:** Crear el servicio administrativo seguro `src/services/adminService.ts` con protección de rol `ADMIN` en todas sus funciones.
- [x] **Tarea 6.2:** Construir el componente de navegación lateral `src/components/admin/AdminSidebar.tsx`.
- [x] **Tarea 6.3:** Construir la tabla de gestión de material `src/components/admin/EvaluationsTable.tsx` con badges de R2 y opciones CRUD.
- [x] **Tarea 6.4:** Construir el modal de creación y edición `src/components/admin/EvaluationFormModal.tsx` con validación de archivos PDF <= 20 MB.
- [x] **Tarea 6.5:** Ensamblar la consola de administración en `src/app/admin/page.tsx` conectada a los Server Actions.
- [x] **Tarea 6.6:** Realizar pruebas de auditoría de seguridad y verificación de tipos en TypeScript.
