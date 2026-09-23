# SPEC-018: WhatsApp de Activación con Correo Docente

- **Estado:** APPROVED
- **Módulo:** `cuadernillos-membresias`
- **Fecha:** `2026-09-01`
- **Aprobación:** El usuario aprobó expresamente el PEP y solicitó su implementación.

## Objetivo

Reemplazar el texto genérico del botón de activación por WhatsApp mostrado a una cuenta sin suscripción activa e incluir automáticamente el correo de la sesión docente.

## Mensaje requerido

```text
Hola 👋, deseo activar mi acceso a Cuadernillos AVEND ESCALA.

📧 Mi correo registrado es: [correo electrónico].
```

El marcador se reemplaza por el correo normalizado de la sesión docente. Si la sesión no contiene un correo válido, se conserva el marcador visible y nunca se inventa una identidad.

## Archivos autorizados

- `[MODIFY] src/app/cuadernillos/page.tsx`
- `[MODIFY] src/components/cuadernillos/ResourceNoticeModal.tsx`

## Seguridad y datos

- No se modifica la base de datos ni el esquema Prisma.
- No se crean, editan o eliminan usuarios.
- El correo solo se incorpora al enlace cuando el docente pulsa expresamente el botón de WhatsApp.
- El texto se codifica mediante el generador central de enlaces de WhatsApp.

## Criterios de aceptación

1. El mensaje anterior deja de generarse desde el modal de cuenta en espera.
2. El mensaje nuevo mantiene exactamente el saludo, separación de párrafos y etiqueta de correo solicitados.
3. El correo incluido coincide con el de la sesión docente.
4. TypeScript y la compilación de producción finalizan sin errores.
