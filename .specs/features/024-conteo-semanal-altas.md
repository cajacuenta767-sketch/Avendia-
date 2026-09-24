# SPEC-024: Conteo Semanal de Altas por Registrador

- **ID:** `SPEC-024`
- **Fecha:** `2026-09-23`
- **Estado:** `COMPLETED`
- **Módulo:** `admin-registradores`
- **Autor:** `Lead Software Architect`

---

## 1. Resumen Ejecutivo
El cliente confirmó que las altas de los registradores son **directas** (sin aprobación del superadmin; comportamiento ya vigente) y pidió que **se contabilice por semana cuántos docentes se agregan**.

---

## 2. Requisitos Funcionales
- **RF-01:** Semanas de **lunes 00:00 a domingo 23:59, hora de Perú** (UTC-05:00, sin horario de verano).
- **RF-02:** Superadmin y administradores ven, en la pestaña **Registradores**, el bloque "Altas por semana": una fila por semana (la más reciente primero, resaltada), una columna por registrador, la columna **Administración** (docentes sin registrador) y el total. Fila final con totales del rango.
- **RF-03:** Rango seleccionable: 4, 8 (por defecto), 12 o 26 semanas. Exportable a Excel (CSV).
- **RF-04:** El REGISTRADOR ve solo su propio conteo: tarjetas "Esta semana", "Semana pasada" y "Últimas 4 semanas" sobre su tabla.
- **RF-05:** Los docentes de un registrador eliminado se agrupan en la columna "Registradores eliminados" (solo si existen).

---

## 3. Arquitectura Técnica
- `[MODIFY] src/lib/adminPolicy.ts` — funciones puras `getPeruWeekStart`, `buildSemanasAltas`, `getSemanaIndex`.
- `[MODIFY] src/services/usuariosService.ts` — `getAltasSemanalesAction(semanas)` (Zod: 4 | 8 | 12 | 26; alcance `ALL`/`OWN` vía `requireUsuariosScope`).
- `[MODIFY] src/components/admin/views/RegistradoresPanels.tsx` — `AltasSemanalesPanel` y `MisAltasSemanalesResumen`.
- `[MODIFY] src/components/admin/views/UsuariosView.tsx` — integración en la pestaña Registradores y en la vista del registrador.
- Sin cambios de base de datos (usa `createdAt` y `creadoPorAdminId`). Sin dependencias nuevas.

---

## 4. Plan de Pruebas y Verificación
- [x] `tsc --noEmit` sin errores y `next build` correcto.
- [x] Tests unitarios de límites de semana en hora de Perú (`npm run test:unit`).
- [x] Verificación visual: superadmin (8 y 4 semanas, móvil) y registrador (escritorio y móvil); los conteos coinciden entre ambas vistas.
