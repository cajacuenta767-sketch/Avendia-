# SPEC-023: Endurecimiento del Panel Administrativo y Control de Registradores

- **ID:** `SPEC-023`
- **Fecha:** `2026-09-23`
- **Estado:** `IN_PROGRESS`
- **Módulo:** `admin-seguridad-registradores`
- **Autor:** `Lead Software Architect`

---

## 1. Resumen Ejecutivo
Con cuentas externas (registradores, SPEC-022) entrando al panel, se endurece la autenticación administrativa y se agregan herramientas de control para el Superadministrador: historial de cambios, reporte por registrador, reasignación y ampliación del plazo de edición.

---

## 2. Requisitos Funcionales

### Seguridad
- **RF-01 Revocación inmediata:** toda sesión de panel (administradores y registradores) se valida contra `admin_users` en cada acción: la cuenta debe seguir `ACTIVO` y con el mismo rol. Pausar, eliminar o cambiar de rol revoca el acceso al instante. Las cuentas oficiales por variables de entorno quedan exentas.
- **RF-02 Duración de sesión:** las sesiones de administradores, registradores y docentes no expiran: permanecen abiertas hasta que el usuario cierre sesión. La única excepción es RF-01 (cuenta de panel pausada, eliminada o con rol cambiado).
- **RF-03 Contraseñas:** se elimina la contraseña por defecto `Admin2026!`. Al crear (y al cambiar) una contraseña de administrador se exige un mínimo de 10 caracteres; el modal incluye un generador aleatorio.
- **RF-04 Login administrativo:** el usuario/correo es obligatorio (se elimina el acceso con solo la contraseña). Límite de 5 intentos fallidos por cuenta y 20 por IP cada 15 minutos.
- **RF-05 Roles restringidos:** solo el Superadministrador puede crear, editar o eliminar cuentas `SUPERADMINISTRADOR` o `REGISTRADOR`.
- **RF-06 OTP:** el código OTP se genera con `crypto.randomInt`.
- **RF-07 PDFs:** se elimina `Access-Control-Allow-Origin: *` de `/api/pdf-stream`.
- **RF-08 UI:** el panel toma el rol y los permisos exclusivamente de `/api/auth/session` (sesión firmada), no de listas de correos ni de `localStorage`.

### Control de registradores
- **RF-09 Historial:** tabla `auditoria_docentes` con cada alta, edición (campos antes → después; PIN enmascarado), pausa, reactivación, cambio de PIN, tipo de acceso, extensión, eliminación, reasignación y ampliación. Visible para administradores en la ficha del docente.
- **RF-10 Reporte:** pestaña "📈 Registradores" (Superadministrador) con altas por rango de fechas, total, activos y vencidos por registrador; exportable a Excel (CSV).
- **RF-11 Reasignación:** el Superadministrador puede asignar un docente a otro registrador o dejarlo sin registrador.
- **RF-12 Ampliación de plazo:** el Superadministrador puede ampliar +3/7/14/30 días la ventana de edición de un docente (`edicionHasta`).
- **RF-13 Correo duplicado:** si un registrador intenta registrar un correo existente, se crea una notificación `SOLICITUD_REGISTRADOR` en la campanita del administrador sin revelar datos al registrador.

---

## 3. Arquitectura Técnica

### 3.1 Archivos
- `[NEW] src/lib/adminPolicy.ts` — reglas puras (roles, ventana de edición, contraseñas, limitador de intentos).
- `[NEW] src/components/admin/views/RegistradoresPanels.tsx` — reporte e historial/herramientas.
- `[NEW] tests/unit/adminPolicy.test.mjs` — `npm run test:unit` (runner nativo de Node, sin dependencias).
- `[MODIFY] prisma/schema.prisma`, `src/lib/serverSession.ts`, `src/services/adminService.ts`, `src/services/usuariosService.ts`, `src/app/api/auth/session/route.ts`, `src/app/api/{recursos,evaluaciones}/upload/route.ts`, `src/app/api/pdf-stream/route.ts`, `src/app/admin/page.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/admin/views/UsuariosView.tsx`, `src/components/admin/modals/AdminUserFormModal.tsx`.

### 3.2 Modelo de Datos
```prisma
model UsuarioDocente {
  // ...
  edicionHasta DateTime?
}

model AuditoriaDocente {
  id           String   @id @default(cuid())
  docenteId    String
  docenteEmail String
  actorId      String
  actorEmail   String
  actorRol     String
  accion       String
  detalle      String?
  createdAt    DateTime @default(now())
  @@map("auditoria_docentes")
}
```
Cambios aditivos: aplicar con `npx prisma db push`.

### 3.3 Limitaciones conocidas
- El limitador de intentos vive en memoria de cada instancia (suficiente para el despliegue actual en un solo contenedor; en varias instancias debe moverse a la base de datos o Redis).

---

## 4. Fuera de alcance (requiere decisión)
- Control de altas PREMIUM por registradores (aprobación, cupo o solo pruebas 24 h).
- Login de docentes solo con correo (definido por SPEC-021).
- Registro de descargas en `DownloadLog` (el modelo actual referencia tablas que la aplicación no usa).

---

## 5. Plan de Pruebas
- [x] `tsc --noEmit` y `next build` sin errores.
- [x] `npm run test:unit`: roles, ventana de edición, contraseñas y limitador.
- [ ] Pausar a un registrador con sesión abierta → su siguiente acción devuelve `UNAUTHORIZED`.
- [ ] 6.º intento fallido de login admin → `TOO_MANY_ATTEMPTS`.
- [ ] Un ADMINISTRADOR no puede crear un SUPERADMINISTRADOR ni un REGISTRADOR.
- [ ] Reporte, reasignación, ampliación e historial desde la cuenta de Superadministrador.
