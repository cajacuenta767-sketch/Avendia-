# SPEC-021: Login Directo por Correo Registrado (Fricción Cero)

- **ID:** `SPEC-021`
- **Fecha:** `2026-09-08`
- **Estado:** `IN_PROGRESS`
- **Módulo:** `auth-direct-login`
- **Prioridad:** `CRÍTICA`
- **Autor:** `Lead Architect & Senior Frontend Developer`

---

## 1. RESUMEN Y JUSTIFICACIÓN DE NEGOCIO

### 1.1 Contexto
La plataforma utilizaba un flujo en dos pasos con generación y envío obligatorio de códigos OTP de 4 dígitos a cuentas Gmail. Esto generaba fricción significativa (correos en spam, retrasos en la recepción, desconocimiento del PIN) y una carga diaria de entre 5 y 10 solicitudes de soporte por WhatsApp.

### 1.2 Objetivo
Permitir que los docentes registrados en **AVEND ESCALA** accedan inmediatamente a la plataforma ingresando únicamente su correo electrónico válido, sin requerir códigos PIN ni envíos obligatorios a Gmail.

### 1.3 Reglas de Negocio y Restricciones
1. **Validación de Docentes:** Si el correo electrónico existe en la base de datos y se encuentra activo, se emite inmediatamente la sesión (`setServerSession` + `saveDocenteSession`) y se redirige a `/cuadernillos`.
2. **Correos No Registrados:** Si el correo no existe en la base de datos, se rechaza la autenticación con el código `UNREGISTERED_EMAIL` y se provee enlace directo al WhatsApp oficial de soporte para registro.
3. **Blindaje Administrativo (Excepción de Seguridad):** Si el correo corresponde a una cuenta con permisos administrativos (`adminUser` o `OFFICIAL_ADMIN_ACCOUNTS`), el sistema NO permite el acceso directo por correo y exige obligatoriamente su PIN de acceso de Administrador.
4. **Preservación Cromática Estricta:** No alterar la paleta visual existente (Azul institucional `#1d6bf3`, Verde WhatsApp `#00a651`, Púrpura Admin `purple-600` y variantes de modo oscuro).

---

## 2. CHECKLIST DE IMPLEMENTACIÓN

- [ ] **Tarea 21.1:** Crear la Server Action `loginDirectoPorCorreoAction` en `src/services/usuariosService.ts`.
- [ ] **Tarea 21.2:** Rediseñar la tarjeta de acceso principal `src/components/auth/LoginForm.tsx` con los textos solicitados en el mockup.
- [ ] **Tarea 21.3:** Adaptar el modal `src/components/auth/DocenteAuthModal.tsx` con el flujo de ingreso directo.
- [ ] **Tarea 21.4:** Ejecutar pruebas de verificación automatizadas (docente registrado, docente no registrado, administrador protegido).
- [ ] **Tarea 21.5:** Verificar compilación TypeScript y funcionamiento en el entorno local.
