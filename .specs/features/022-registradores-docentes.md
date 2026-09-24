# SPEC-022: Registradores de Docentes con Alcance Propio y Ventana de Edición

- **ID:** `SPEC-022`
- **Fecha:** `2026-09-23`
- **Estado:** `IN_PROGRESS`
- **Módulo:** `admin-registradores`
- **Autor:** `Lead Software Architect`

---

## 1. Resumen Ejecutivo
El cliente necesita habilitar a personas externas ("registradores") que den de alta docentes desde un panel personal, sin acceso al resto de la consola ni a los docentes de otros registradores. El Superadministrador conserva la visibilidad total de todos los docentes y de quién los registró.

---

## 2. Requisitos Funcionales
- **RF-01:** Nuevo rol administrativo `REGISTRADOR` (tabla `admin_users`). Solo el `SUPERADMINISTRADOR` puede crear, editar o eliminar cuentas con este rol.
- **RF-02:** El registrador solo accede al módulo **Usuarios → Docentes**. No ve Inicio, Cuadernillos, Recursos, "Ver como docente", Importar Excel ni el Equipo Admin.
- **RF-03:** El registrador solo lista los docentes cuyo `creadoPorAdminId` es su `AdminUser.id`.
- **RF-04:** Durante **14 días desde la creación de cada docente** el registrador puede: editar datos, cambiar/regenerar PIN, pausar o reactivar y cambiar tipos de acceso. Pasado ese plazo el docente queda en **solo lectura** para él.
- **RF-05:** El registrador no define vigencias: al crear se aplica la duración estándar del plan (1 año Docente / 24 h Prueba) y en edición se ignoran `fechaInicio`, `fechaFin` y `renewSubscription`. No puede extender licencias ni eliminar docentes.
- **RF-06:** Si el correo ya existe, se rechaza con `DUPLICATE_USER` sin revelar datos del docente existente.
- **RF-07:** El registrador puede ver y copiar el PIN de sus docentes.
- **RF-08:** Superadministrador y administradores ven a todos los docentes; se añade el filtro "Registrado por".
- **RF-09:** Los docentes existentes (sin `creadoPorAdminId`) no pertenecen a ningún registrador.

---

## 3. Arquitectura Técnica y Componentes

### 3.1 Estructura de Archivos
- `[MODIFY] prisma/schema.prisma` — campo `UsuarioDocente.creadoPorAdminId` + índice.
- `[MODIFY] src/lib/serverSession.ts` — `requireUsuariosScope()`, `isWithinRegistradorEditWindow()`; las cookies legacy sin firma ya no otorgan roles administrativos.
- `[MODIFY] src/services/usuariosService.ts` — alcance `ALL`/`OWN` en listado, alta y mutaciones; guards en `importarDocentesDesdeExcelAction` y `updatePerfilDocenteAction`.
- `[MODIFY] src/services/adminService.ts` — permisos fijos del registrador en login; gestión de registradores exclusiva del Superadministrador.
- `[MODIFY] src/app/api/auth/session/route.ts` — expone `isRegistrador`.
- `[MODIFY] src/app/admin/page.tsx`, `src/components/admin/AdminSidebar.tsx` — navegación restringida.
- `[MODIFY] src/components/admin/views/UsuariosView.tsx`, `src/components/admin/modals/UserFormModal.tsx`, `src/components/admin/modals/AdminUserFormModal.tsx` — UI del registrador y filtro "Registrado por".

### 3.2 Modelo de Datos
```prisma
model UsuarioDocente {
  // ...
  creadoPorAdminId String?
  @@index([creadoPorAdminId])
}
```
Cambio aditivo y nullable: aplicar con `npx prisma db push` (el proyecto no usa carpeta de migraciones).

### 3.3 Seguridad
- `REGISTRADOR` **no** pertenece a `ADMIN_ROLES`: no supera `requireAdminSession`/`verifyAdminSession`, por lo que no puede invocar ninguna otra Server Action administrativa.
- El propietario (`creadoPorAdminId`) y el responsable (`creadoPor`/`modificadoPor`) se asignan en el servidor desde la sesión firmada, nunca desde el cliente.

---

## 4. Plan de Pruebas y Verificación
- [x] `tsc --noEmit` sin errores.
- [ ] Registrador A crea docente → lo ve; Registrador B no lo ve ni puede modificarlo (`FORBIDDEN`).
- [ ] Docente con `createdAt` > 14 días → acciones de edición devuelven `EDIT_WINDOW_EXPIRED` y la UI muestra "🔒 Solo lectura".
- [ ] Superadministrador ve a todos los docentes y filtra por "Registrado por".
- [ ] Registrador no puede invocar acciones de cuadernillos, recursos, importación ni eliminación.
