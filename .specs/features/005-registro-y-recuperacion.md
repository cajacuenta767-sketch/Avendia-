# SPEC-005: Módulo de Registro, Recuperación de PIN y Activación de Cuenta

- **ID:** `SPEC-005`
- **Fecha:** `2026-07-29`
- **Estado:** `COMPLETED`
- **Módulo:** `auth-modals`
- **Autor:** `Senior UX Architect & Lead Frontend Developer`

---

## 1. RESUMEN Y CRITERIOS DE ACEPTACIÓN

### 1.1 Resumen Ejecutivo
Esta especificación define los flujos de autenticación secundaria y gestión de identidad para docentes en AVEND ESCALA: el registro de nuevos usuarios, la recuperación asistida de PIN de 6 dígitos, la activación por primera vez y la integración fluida con la API de soporte por WhatsApp.

### 1.2 Criterios de Aceptación Funcionales

1. **Modal de Registro de Docente Nuevo ("Crear Cuenta"):**
   - **Formulario:** Nombres completos, DNI (exactamente 8 dígitos), Correo electrónico, Nivel Educativo (Inicial, Primaria, Secundaria) y PIN de 6 dígitos con confirmación.
   - **Validación:** Comprobación estricta de DNI de 8 números y coincidencia de PIN.
   - **Acción Post-registro:** Redirección automática al banco de cuadernillos con estado de sesión activo.

2. **Modal de Recuperación de PIN ("¿Olvidaste tu PIN?"):**
   - **Campo:** DNI o correo electrónico.
   - **Flujo Doble:** Opción de solicitar reset vía correo o generar un enlace directo asistido a WhatsApp con el mensaje predeterminado:
     `"Hola AVEND ESCALA, solicito el restablecimiento de mi PIN para el DNI [DNI_DOCENTE]"`

3. **Modal de Activación / Primera Vez ("Crear PIN"):**
   - Para docentes ya registrados en la base de datos oficial del MINEDU que ingresan por primera vez sin PIN asignado.
   - Verificación de DNI y asignación inmediata de su clave de 6 dígitos.

4. **Mejoras de Experiencia de Usuario (UI/UX Controls):**
   - Toggle de visibilidad de contraseña/PIN (icono de ojo `[show/hide]`).
   - Teclado numérico habilitado en dispositivos móviles (`inputmode="numeric"`).
   - Animaciones suaves de apertura/cierre de modales (`backdrop-blur`, `fade-in`).

---

## 2. ARQUITECTURA DE ESTADOS Y COMPONENTES

### 2.1 Definición de Estado de Modales (`src/components/auth/`)
Manejo centralizado de estados mediante el tipo `AuthModalType`:

```typescript
export type AuthModalType = 'NONE' | 'REGISTER' | 'FORGOT_PIN' | 'FIRST_TIME';
```

### 2.2 Componentes Creados
1. **`src/components/auth/RegisterModal.tsx`**:
   - Modal de registro de cuenta con selección de nivel pedagógico y creación de PIN.

2. **`src/components/auth/ForgotPasswordModal.tsx`**:
   - Modal de recuperación rápida con integración directa a WhatsApp y correo.

3. **`src/lib/whatsapp.ts`**:
   - Utilidad helper para generar URLs de WhatsApp dinámicas.

4. **Actualización en `src/components/auth/LoginForm.tsx`**:
   - Conexión de los enlaces hacia los nuevos modales y botón toggle de visibilidad del PIN.

---

## 3. PLAN DE TAREAS ATÓMICAS (Checklist de Implementación)

- [x] **Tarea 5.1:** Crear el componente modal `src/components/auth/RegisterModal.tsx` para nuevos registros docentes.
- [x] **Tarea 5.2:** Crear el componente modal `src/components/auth/ForgotPasswordModal.tsx` con soporte para restablecimiento por WhatsApp/Correo.
- [x] **Tarea 5.3:** Crear la utilidad `src/lib/whatsapp.ts` para generación de enlaces con mensajes dinámicos.
- [x] **Tarea 5.4:** Conectar los eventos de apertura de modales e inputs de PIN en `LoginForm.tsx` y `page.tsx`.
- [x] **Tarea 5.5:** Realizar la verificación de compilación y pruebas de validaciones de formulario.
