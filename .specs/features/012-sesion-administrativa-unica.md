# SPEC-012: Sesión administrativa única

- **Estado:** APPROVED
- **Módulo:** `auth-rbac`

## Objetivo

Completar el acceso administrativo mediante correo, código temporal y PIN en un único flujo. Una vez validado, el administrador o superadministrador no volverá a ver el formulario de PIN hasta que cierre sesión explícitamente.

## Reglas

1. El código temporal confirma la identidad, pero no habilita permisos administrativos sin validar el PIN.
2. La validación correcta del PIN crea una sesión HTTP-only firmada por el servidor.
3. La firma de sesión debe usar una clave estable de entorno; nunca una clave temporal generada durante la ejecución.
4. La pantalla de PIN permanece solo como alternativa al ingreso directo al panel sin sesión vigente.
5. No se modifica ni elimina ningún usuario, PIN, permiso, PDF, recurso ni registro de base de datos.

## Archivos autorizados

- `.env` (solo entorno local; no versionado)
- `src/lib/serverSession.ts`
- `src/services/usuariosService.ts`
- `src/components/auth/LoginForm.tsx`

## Criterios de aceptación

1. Correo + código temporal + PIN correcto redirige directamente a `/admin`.
2. Recargar `/admin` y navegar entre panel y vista docente conserva la sesión hasta cerrar sesión.
3. Una persona sin sesión válida que abra `/admin` sigue viendo el acceso administrativo.
