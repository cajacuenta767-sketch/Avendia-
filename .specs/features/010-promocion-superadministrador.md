# SPEC-010: Promoción segura a superadministrador

- **Estado:** APPROVED
- **Módulo:** `auth-rbac`

## Objetivo

Conceder acceso de superadministrador a una cuenta docente existente conservando su perfil, suscripción y demás información.

## Reglas

1. Se crea o actualiza exclusivamente el registro administrativo de la cuenta autorizada.
2. El PIN se almacena mediante hash criptográfico y no se revela en respuestas ni registros.
3. La cuenta docente, suscripción, PDFs y el resto de usuarios quedan sin cambios.
4. El nuevo administrador recibe todos los permisos administrativos.
5. El acceso usa correo, código temporal y PIN administrativo.

## Verificación

- Confirmar que existe un administrador activo con rol `SUPERADMINISTRADOR` y permisos completos.
- Confirmar que el registro docente original sigue existiendo.
