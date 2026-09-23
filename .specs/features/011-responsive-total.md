# SPEC-011: Adaptación responsive integral

- **Estado:** APPROVED
- **Módulo:** `ui-responsive`

## Objetivo

Adaptar las vistas públicas, docentes y administrativas de AVEND ESCALA a teléfonos, tablets y pantallas de escritorio, preservando las funciones y los datos existentes.

## Límites

1. Solo se modifican estilos, estructura visual y comportamiento de presentación responsive.
2. No se modifica ninguna mutación, permiso, sesión, PIN, suscripción, PDF, archivo subido ni dato de base de datos.
3. No se agregan dependencias.
4. Las tablas conservan sus datos y, en móvil, usan un contenedor de desplazamiento horizontal controlado cuando no puedan reducirse de manera legible.
5. Los modales conservan acciones accesibles dentro del alto y ancho de la pantalla.

## Archivos autorizados

- `src/app/globals.css`
- `src/app/admin/page.tsx`
- `src/app/cuadernillos/page.tsx`
- `src/app/recursos/page.tsx`
- `src/components/admin/AdminHeader.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/EvaluationFormModal.tsx`
- `src/components/admin/EvaluationsTable.tsx`
- `src/components/admin/modals/AdminUserFormModal.tsx`
- `src/components/admin/modals/BulkUserImportModal.tsx`
- `src/components/admin/modals/EditEvaluationModal.tsx`
- `src/components/admin/modals/UserFormModal.tsx`
- `src/components/admin/views/InicioView.tsx`
- `src/components/admin/views/UsuariosView.tsx`
- `src/components/admin/views/BancoCuadernillosView.tsx`
- `src/components/admin/views/CuadernillosView.tsx`
- `src/components/admin/views/RecursosAdminView.tsx`
- `src/components/auth/*.tsx`
- `src/components/common/*.tsx`
- `src/components/home/*.tsx`
- `src/components/cuadernillos/*.tsx`
- `src/components/recursos/*.tsx`

## Validación

- Comprobación TypeScript.
- Prueba visual local en móvil, tablet y escritorio.
- Sin desplazamiento horizontal accidental; controles y acciones esenciales visibles.
