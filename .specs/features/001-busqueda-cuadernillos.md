# SPEC-001: Módulo de Filtros y Banco de Evaluaciones MINEDU

- **ID:** `SPEC-001`
- **Fecha:** `2026-07-29`
- **Estado:** `COMPLETED`
- **Módulo:** `cuadernillos-filtros`
- **Autor:** `Lead Architect & Product Owner`

---

## 1. RESUMEN Y CRITERIOS DE ACEPTACIÓN

### 1.1 Resumen Ejecutivo
El Módulo de Banco de Evaluaciones (`src/app/cuadernillos/page.tsx`) es el núcleo del sistema AVEND ESCALA. Permite a los docentes buscar, filtrar y acceder a cuadernillos oficiales, soluciones explicadas y hojas de claves de exámenes del MINEDU.

### 1.2 Criterios de Aceptación Funcionales
1. **Selector Principal de Proceso (Tabs):**
   - Debe permitir conmutar entre *Nombramiento Docente*, *Ascenso de Escala* y *Acceso a Cargos Directivos*.
2. **Filtros en Cascada (Cascading Filters):**
   - Selectores interactivos para: *Modalidad* (EBR, EBA, EBE), *Nivel* (Inicial, Primaria, Secundaria, Superior), *Especialidad / Área* y *Año de Evaluación*.
   - Los valores de los selectores secundarios deben actualizarse según el proceso seleccionado.
3. **Rejilla de Tarjetas de Evaluación (Evaluation Card Grid):**
   - Cada tarjeta debe mostrar: Código MINEDU, Título, Proceso, Especialidad, Año y estado del recurso.
   - 3 Botones de Acción principales:
     - `[VER CUADERNILLO]` (Abre modal visor PDF / Descarga).
     - `[VER RESOLUCIÓN]` (Disponible en verde si existe solucionario).
     - `[VER CLAVES]` (Disponible en naranja si existen claves).
4. **Visor de PDF Integrado (PdfViewerModal):**
   - Modal accesible con iframe / visor embebido para previsualizar el PDF antes de descargar.

---

## 2. PLAN DE TAREAS ATÓMICAS (Checklist de Implementación)

- [x] **Tarea 1.1:** Definir tipos e interfaces en `src/types/evaluacion.ts`.
- [x] **Tarea 1.2:** Crear dataset mock representativo en `src/data/mockEvaluaciones.ts`.
- [x] **Tarea 1.3:** Crear el componente `ProcessSelector.tsx` (Tabs de Nombramiento, Ascenso, Directivos).
- [x] **Tarea 1.4:** Crear el componente `CascadingFilters.tsx` para filtrado reactivo.
- [x] **Tarea 1.5:** Crear el componente `EvaluationCard.tsx` con soporte para abrir recursos.
- [x] **Tarea 1.6:** Crear el modal `PdfViewerModal.tsx` con iframe embebido.
- [x] **Tarea 1.7:** Ensamblar e integrar la vista principal `src/app/cuadernillos/page.tsx`.
- [x] **Tarea 1.8:** Verificación de compilación y pruebas QA de tipos TypeScript.
