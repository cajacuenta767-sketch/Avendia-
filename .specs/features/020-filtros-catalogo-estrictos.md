# SPEC-020: Filtros estrictos y sincronizados del catálogo

- **ID:** `SPEC-020`
- **Fecha:** `2026-09-04`
- **Estado:** `APPROVED`
- **Módulo:** `cuadernillos-filtros`

## 1. Problema confirmado

Los cuadernillos de tipo **Habilidades Generales** omiten actualmente la coincidencia de especialidad. Esto hace que una selección como `EBR / PRIMARIA / Educación Física` incluya registros de `Primaria` y `Profesor de Innovación Pedagógica`. La misma excepción afecta los años dinámicos y puede reproducirse en otros niveles con áreas múltiples.

También existen respuestas asíncronas sin control de vigencia: una consulta antigua puede sobrescribir los resultados o años de una selección más reciente.

## 2. Reglas funcionales

1. Proceso, modalidad, nivel, especialidad y año son filtros acumulativos.
2. `Habilidades Generales` es un tipo de cuadernillo y nunca omite modalidad, nivel o especialidad.
3. Las pestañas de subprueba operan únicamente sobre el conjunto ya filtrado.
4. PIP/AIP admite solo alias históricos expresamente declarados.
5. Los niveles históricos de EBA y CETPRO se aceptan solo dentro de su modalidad correspondiente.
6. EBE y Directivos conservan sus reglas sin filtros docentes inaplicables.
7. Los años disponibles usan exactamente la misma regla de coincidencia que las tarjetas.
8. Solo la respuesta asíncrona más reciente puede actualizar tarjetas, años o recursos didácticos.
9. Al cambiar un filtro padre, los resultados anteriores se ocultan durante la carga.
10. No se modifican ni eliminan registros de evaluaciones, PDFs, docentes o membresías.
11. En niveles de clasificación única, el área visible es una etiqueta de navegación y no una especialidad excluyente. Esto aplica a `EBR / INICIAL`, `EBA / EBA_INICIAL_INTERMEDIO`, `EBE / NO_APLICA` y `CETPRO / CETPRO_TECNICO`.
12. Los registros históricos de esos niveles se muestran en su nivel real aunque el campo `area` contenga valores heredados como `General` o `Profesor de Innovación Pedagógica`.
13. En niveles con múltiples especialidades (`EBR / PRIMARIA`, `EBR / SECUNDARIA` y `EBA / EBA_AVANZADO`) la coincidencia de especialidad continúa siendo estricta.

## 3. Contratos y seguridad

- Los parámetros de `getEvaluacionesAction` y `getAniosAction` se validan con Zod.
- `includeDrafts` exige una sesión administrativa válida.
- Los errores de validación se devuelven como `ActionResponse` sin detalles internos.
- No se agregan dependencias ni variables de entorno.

## 4. Archivos autorizados

- `[NEW] src/lib/evaluacionFilters.ts`
- `[MODIFY] src/types/evaluacion.ts`
- `[MODIFY] src/services/evaluacionesService.ts`
- `[MODIFY] src/app/cuadernillos/page.tsx`
- `[MODIFY] src/components/cuadernillos/CascadingFilters.tsx`
- `[MODIFY] src/app/recursos/page.tsx`
- `[NEW] tests/testsprite/03-cuadernillos-filtros/05_aislamiento_especialidades_ebr_primaria.json`
- `[NEW] tests/testsprite/03-cuadernillos-filtros/06_concurrencia_filtros_y_anios.json`

## 5. Criterios de aceptación

- Primaria, Educación Física y PIP no comparten tarjetas entre sí.
- EBR Secundaria y EBA Avanzado no reciben Habilidades Generales de otras áreas.
- EBR Inicial muestra todos los cuadernillos publicados de su nivel, incluidos los históricos con área `General` o PIP, sin incorporar Primaria ni Secundaria.
- EBA Inicial/Intermedio muestra todos los cuadernillos publicados de su nivel sin incorporar EBA Avanzado.
- Los años pertenecen a la combinación activa.
- Cambios rápidos no restauran resultados anteriores.
- Los buscadores y filtros administrativos conservan su comportamiento.
- TypeScript y la compilación de producción finalizan correctamente.
- La QA visual cubre móvil, tableta y escritorio con capturas reales.
