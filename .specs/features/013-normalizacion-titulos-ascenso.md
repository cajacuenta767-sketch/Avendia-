# SPEC-013: Normalización Visual de Títulos de Ascenso

- **ID:** `SPEC-013`
- **Fecha:** `2026-08-29`
- **Estado:** `APPROVED`
- **Módulo:** `cuadernillos-presentacion`
- **Alcance:** Banco de cuadernillos, visor documental y superficies administrativas de solo lectura

---

## 1. Resumen

El identificador técnico `ASCENSO_ESCALAFON` es necesario para rutas, filtros, consultas y persistencia, pero no debe mostrarse literalmente a docentes ni administradores. En títulos y etiquetas visibles se debe presentar como `ASCENSO`.

## 2. Reglas funcionales

1. Normalizar únicamente la presentación de estas variantes:
   - `ASCENSO_ESCALAFON`
   - `ASCENSO ESCALAFON`
   - `Ascenso Escalafón`
2. El resultado visible de dichas variantes será `ASCENSO`, respetando el resto del título.
3. No modificar el identificador interno `ASCENSO_ESCALAFON`.
4. No modificar registros existentes, rutas, filtros, contratos API, archivos PDF ni nombres almacenados en PostgreSQL/R2.
5. Los formularios de edición conservarán el valor original para impedir escrituras accidentales derivadas del formato visual.

## 3. Archivos autorizados

- `src/lib/evaluationPresentation.ts`
- `src/components/cuadernillos/PdfViewerModal.tsx`
- `src/components/admin/EvaluationsTable.tsx`
- `src/components/admin/views/CuadernillosView.tsx`
- `src/components/admin/views/BancoCuadernillosView.tsx`

## 4. Criterios de aceptación

1. El visor muestra `Prueba Única Nacional ASCENSO 2025 - INICIAL` en lugar de `Prueba Única Nacional ASCENSO_ESCALAFON 2025 - INICIAL`.
2. Las tablas, alertas y resúmenes administrativos de solo lectura no exponen `ASCENSO_ESCALAFON` como texto visible.
3. El cuadernillo, las claves y la resolución siguen abriendo el archivo existente sin alterarlo.
4. Las rutas continúan usando `proceso=ASCENSO_ESCALAFON` cuando corresponde.
5. TypeScript y la compilación de producción finalizan correctamente.
6. La comprobación visual se realiza en el navegador local con evidencia mediante capturas.
