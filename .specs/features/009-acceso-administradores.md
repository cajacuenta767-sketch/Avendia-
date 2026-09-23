# SPEC-009: Corrección de acceso para administradores

- **Estado:** APPROVED
- **Módulo:** `auth-rbac`

## Objetivo

Permitir que superadministradores y administradores activos ingresen usando su correo o usuario y su PIN administrativo, sin exponer ni modificar credenciales existentes.

## Reglas

1. El código temporal enviado al correo y el PIN administrativo son pasos distintos.
2. Un hash de contraseña nunca se compara directamente como texto contra un código temporal.
3. La pantalla administrativa permite indicar el correo o usuario de la cuenta que inicia sesión.
4. El PIN existente se valida únicamente en servidor mediante su verificación criptográfica.
5. No se modifica ni elimina ningún usuario, PIN, permiso, PDF, recurso ni dato de base de datos.

## Archivos autorizados

- `src/services/usuariosService.ts`
- `src/components/admin/AdminLoginForm.tsx`
