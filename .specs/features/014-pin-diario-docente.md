# SPEC-014: PIN diario para acceso docente

- **Estado:** APPROVED
- **Módulo:** `auth-docente`
- **Fecha:** `2026-08-29`

## Objetivo

Permitir que cada docente ingrese desde el formulario existente usando indistintamente el código temporal enviado por Gmail o un PIN personal de cuatro dígitos que cambia automáticamente cada día.

## Reglas de negocio

1. No se crea una pantalla, botón ni ruta adicional de acceso.
2. Los cuatro casilleros actuales aceptan el OTP de Gmail vigente o el PIN diario del docente.
3. El PIN diario cambia a las 00:00 de `America/Lima`; el PIN del día anterior deja de ser válido.
4. El PIN es personal: se deriva en el servidor de la identidad del docente, su semilla privada, la fecha peruana y un secreto estable del servidor.
5. Una sesión docente ya iniciada permanece activa hasta el cierre voluntario de sesión; la rotación del PIN no cierra sesiones.
6. Las altas manuales y por Excel reciben automáticamente una semilla privada de cuatro dígitos cuando no proporcionan una válida.
7. Las importaciones de usuarios existentes conservan su semilla y no duplican al docente.
8. El panel administrativo muestra solamente el PIN válido del día, oculto por defecto, con acciones para mostrar, copiar, enviar por WhatsApp y regenerar.
9. Regenerar reemplaza la semilla privada y, por tanto, invalida inmediatamente el PIN diario anterior.
10. Administradores y superadministradores conservan su flujo propio de código temporal más PIN administrativo.
11. No se elimina ni sobrescribe ningún usuario, PDF, recurso, membresía o archivo existente.

## Seguridad

- El cálculo se ejecuta exclusivamente en el servidor mediante HMAC-SHA256 de Node.js.
- El secreto procede de `DOCENTE_DAILY_PIN_SECRET` o, como clave estable ya configurada, `SESSION_SECRET`; nunca se expone al cliente.
- El ingreso exige correo registrado más cuatro dígitos y conserva el límite de intentos fallidos existente.
- La respuesta administrativa nunca expone la semilla privada almacenada: expone únicamente el PIN calculado para la fecha actual.

## Archivos autorizados

- `.specs/features/014-pin-diario-docente.md`
- `src/lib/dailyDocentePin.ts`
- `src/services/usuariosService.ts`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/DocenteAuthModal.tsx`
- `src/components/admin/views/UsuariosView.tsx`
- `src/components/admin/modals/UserFormModal.tsx`
- `src/lib/whatsapp.ts`
- `scripts/backfill-docente-pin-seeds.cjs`

## Criterios de aceptación

1. OTP vigente y PIN diario correcto permiten iniciar sesión desde los mismos casilleros.
2. PIN incorrecto y PIN del día anterior son rechazados.
3. La fecha se calcula con zona horaria peruana, independientemente de la zona del VPS o navegador.
4. El PIN mostrado, copiado y enviado por WhatsApp coincide con el validado por el servidor.
5. Un alta manual y un alta de Excel reciben PIN sin intervención adicional.
6. La edición normal de nombre, membresía o accesos no cambia el PIN.
7. La regeneración intencional sí cambia el PIN de hoy.
8. Las sesiones existentes y el acceso administrativo no presentan regresiones.
9. El proyecto supera comprobación TypeScript y compilación Next.js.

