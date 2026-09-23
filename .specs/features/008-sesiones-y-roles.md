# SPEC-008: Sesiones Seguras y Roles Consistentes

- **Estado:** APPROVED
- **Módulo:** `auth-rbac`

## Objetivo

Mantener una única sesión firmada por el servidor para docentes, administradores y superadministradores; la interfaz solo mostrará privilegios que el servidor haya confirmado.

## Reglas

1. Las mutaciones y vistas administrativas requieren una sesión `avend_session` firmada y vigente.
2. El navegador puede conservar datos visuales de perfil, pero no concede permisos por sí mismo.
3. La vista docente no reemplaza una sesión administrativa firmada.
4. Cerrar sesión elimina la sesión firmada y las referencias visuales locales.
5. Las sesiones antiguas no firmadas deben renovarse una única vez mediante el inicio de sesión normal.
6. No se modifica ni elimina ningún usuario, PDF, recurso ni registro de base de datos.

## Archivos autorizados

- `src/app/api/auth/session/route.ts`
- `src/app/admin/page.tsx`
- `src/lib/serverSession.ts`
