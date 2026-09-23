# SPEC-019: Mensajes de WhatsApp por Estado de Cuenta

- **Estado:** APPROVED
- **Módulos:** `auth-docente`, `membresias`, `cuadernillos-rbac`
- **Fecha:** `2026-09-01`
- **Aprobación:** El usuario aprobó implementación, QA y despliegue al VPS.

## Objetivo

Mostrar mensajes y solicitudes de WhatsApp diferentes según el motivo real por el que un docente solicita acceso, incorporando siempre el correo escrito o registrado.

## Estados y mensajes

1. `LOGIN_ACCESS`: solicitud general desde el inicio.
2. `UNREGISTERED`: correo que no pertenece todavía a la plataforma.
3. `WAITING`: cuenta registrada con rol `CLIENTE`, pendiente de activación.
4. `PAUSED`: acceso suspendido administrativamente (`accesoGranted=false`).
5. `EXPIRED`: la fecha de una suscripción terminó sin pausa administrativa.
6. `TRIAL_EXPIRED`: concluyó la prueba gratuita de 24 horas.

Cada mensaje incluye el correo y utiliza el generador central de WhatsApp. Los modales deben explicar el estado y ofrecer un botón de activación, reactivación o renovación coherente.

## Archivos autorizados

- `[MODIFY] src/lib/whatsapp.ts`
- `[MODIFY] src/services/usuariosService.ts`
- `[MODIFY] src/components/auth/LoginForm.tsx`
- `[MODIFY] src/app/cuadernillos/page.tsx`
- `[MODIFY] src/components/cuadernillos/ResourceNoticeModal.tsx`
- `[MODIFY] src/components/cuadernillos/TrialCountdownHeader.tsx`
- `[MODIFY] src/components/cuadernillos/RestrictedAccessModal.tsx`

## Seguridad y datos

- No se modifica el esquema Prisma.
- No se crean, editan ni eliminan usuarios durante la implementación o QA.
- No se cambian roles, fechas, permisos ni membresías.
- El correo se transmite a WhatsApp solamente cuando el usuario pulsa el enlace.

## Criterios de aceptación

1. Cada estado produce un mensaje distinto y el texto contiene el correo correcto.
2. Una cuenta `CLIENTE` se identifica como pendiente aunque su fecha sea antigua.
3. Una prueba vencida se identifica antes que una pausa genérica.
4. Una pausa explícita se distingue de un vencimiento natural.
5. TypeScript, build, QA local y verificación de producción finalizan correctamente.
