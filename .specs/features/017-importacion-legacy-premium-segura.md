# SPEC-017: Importación Legacy Premium Segura y Mapeo Confirmable

- **Estado:** APPROVED
- **Módulos:** `admin-backoffice`, `importacion-excel`, `membresias`
- **Fecha:** `2026-08-31`
- **Aprobación:** El usuario aprobó expresamente el PEP y ordenó la implementación local con “hazlo”.

## Objetivo

Corregir la importación de archivos Excel/CSV exportados por sistemas anteriores, incluso cuando no incluyen encabezados o sus columnas están desordenadas, sin degradar membresías existentes ni sobrescribir datos válidos con celdas vacías. Antes de escribir en la base de datos, el administrador debe visualizar y confirmar el mapeo detectado y la política de membresía.

## Políticas de membresía

El mismo modal ofrecerá dos políticas explícitas:

1. `STRICT_EXPLICIT`: solamente `PREMIUM` o `DOCENTE` concede Premium.
2. `LEGACY_ACTIVE_IS_PREMIUM`: si la fila no contiene un rol explícito y su estado es `ACTIVO` o `ACTIVA`, se interpreta como Premium.

La precedencia será:

1. `PREMIUM` o `DOCENTE` explícito.
2. `PRUEBA`, `24H`, `TRIAL` o `GRATIS` explícito.
3. `CLIENTE`, `SIN PLAN` o `SIN SUSCRIPCIÓN` explícito.
4. Rol vacío + política legacy + estado `ACTIVO/ACTIVA` => Premium.
5. `INACTIVO`, `VENCIDO`, `EXPIRADO` o `BLOQUEADO` nunca se promociona por inferencia legacy.

## Vigencia y protección contra degradación

1. Para Premium legacy, una fecha final futura válida se respeta.
2. Una fecha final igual al día de importación permanece activa hasta las 23:59:59 de Perú.
3. Premium legacy sin fecha final, con fecha inválida o pasada recibe doce meses desde la importación.
4. Una fila Premium promueve Cliente, prueba activa o prueba vencida sin crear duplicados.
5. Un Premium vigente nunca se degrada, pierde accesos, cambia de PIN ni reduce su vencimiento por una fila inferior o vacía.
6. Si el Premium existente vence después que la fila importada, se conserva la fecha más favorable.
7. Una celda vacía nunca borra nombre, teléfono/DNI, región, institución, modalidad, nivel, especialidad, procesos, PIN o fechas existentes.

## Detección de columnas

1. Se utilizará un único normalizador compartido; se elimina el lector alternativo del modal.
2. Con encabezados se aceptan alias en cualquier orden y columnas adicionales.
3. Sin encabezados se analiza el comportamiento de toda la columna:
   - Correo: mayoría de valores con formato de correo.
   - WhatsApp: nueve dígitos que empiezan en `9`, u once que empiezan en `519`; se normaliza a nueve dígitos nacionales.
   - Valores numéricos de siete a doce dígitos que no cumplan la regla anterior quedan ambiguos.
   - DNI: ocho dígitos; PIN: cuatro dígitos; ambos deben distinguirse del teléfono.
   - Fechas: objetos Date, seriales Excel y formatos textuales reconocibles.
   - Nombre: texto humano que no sea estado, plan, proceso, región ni ruido administrativo.
4. Con dos columnas de fechas y orden coherente, la anterior se propone como registro y la posterior como vencimiento.
5. Con una sola fecha o columnas de fecha ambiguas, la importación queda bloqueada hasta confirmación manual del mapeo.
6. El administrador puede cambiar cada columna a otro campo o marcarla como `Ignorar`.

## Vista previa obligatoria

Después de seleccionar el archivo, el modal mostrará:

1. Número/nombre de columna, campo detectado, confianza y tres ejemplos.
2. Selector para corregir o ignorar cada columna.
3. Selector de política de membresía con explicación y confirmación expresa para legacy.
4. Resumen de correos, nombres, teléfonos, fechas, Premium, filas sin promoción, ambigüedades y conflictos.
5. Cinco filas normalizadas de muestra.
6. El botón de importar permanecerá deshabilitado hasta que exista una columna de correo, se elija una política y se resuelvan las fechas ambiguas.

## Upsert seguro

1. El correo normalizado es la identidad única del docente.
2. Un nombre válido del archivo puede reemplazar un nombre inferido desde el correo.
3. Un WhatsApp válido puede reemplazar un `dni` sintético `USR-*` y completar `observacion`.
4. Si el teléfono ya pertenece a otro correo, se registra conflicto y no se reasigna; las demás filas continúan.
5. Filas repetidas se consolidan por correo respetando la membresía y fecha de mayor prioridad.
6. El servidor valida con Zod los registros, la política y el mapeo confirmado.
7. El informe final agrega nombres corregidos, teléfonos corregidos, fechas renovadas, ambigüedades y conflictos.

## Modelo de datos y dependencias

- No se modifica `schema.prisma`.
- No se agregan paquetes.
- Se reutilizan `xlsx`, `zod`, Prisma y los componentes existentes.

## Archivos autorizados

- `[NEW] .specs/features/017-importacion-legacy-premium-segura.md`
- `[MODIFY] src/types/userImport.ts`
- `[MODIFY] src/lib/userImportNormalizer.ts`
- `[MODIFY] src/components/admin/modals/BulkUserImportModal.tsx`
- `[MODIFY] src/services/usuariosService.ts`
- `[NEW] tests/testsprite/10-admin-import-export/03_importacion_legacy_premium_segura.json`

## Matriz QA local aislada

Se crearán exactamente diez usuarios sintéticos con un prefijo único y se eliminarán por sus IDs verificados al finalizar:

1. Cliente vencido + legacy activo => Premium por doce meses.
2. Prueba vencida + legacy activo => Premium.
3. Prueba activa + legacy activo => Premium.
4. Premium activo + rol vacío => conserva Premium.
5. Premium con vencimiento posterior => conserva el vencimiento mayor.
6. Legacy activo con fecha futura => respeta la fecha.
7. Legacy activo con vencimiento hoy => activo hasta fin del día Perú.
8. Estado inactivo => no se promociona.
9. Nombre inferido y teléfono vacío => corrige nombre y WhatsApp.
10. Teléfono perteneciente a otro correo => reporta conflicto y no corrompe datos.

La matriz se repetirá con un Excel sintético sin encabezados en el orden `Nombre, WhatsApp, Correo, Estado, Registro, Vencimiento`, y se comprobarán también columnas mezcladas, fechas invertidas, una sola fecha ambigua, alias de encabezado, columnas extra, correos duplicados, celdas vacías, DNI de ocho dígitos, PIN de cuatro dígitos, teléfono `+51`, y serial de fecha Excel.

## Seguridad y protección de datos

- Toda importación exige sesión administrativa firmada.
- La QA no usa el Excel real del cliente ni toca usuarios, PDFs, archivos R2 o administradores reales.
- Antes y después de la QA se comparan los conteos no sintéticos.
- No se despliega al VPS dentro de esta especificación; producción requiere autorización posterior explícita.

## Criterios de aceptación

1. Existe un solo normalizador y no hay retorno temprano que omita columnas.
2. El modo estricto no promociona `ACTIVA` sin rol; el modo legacy sí lo hace tras confirmación.
3. La vista previa muestra y permite corregir el mapeo antes de importar.
4. Los diez casos producen el resultado esperado sin degradar Premium ni sobrescribir datos con vacíos.
5. Los conflictos de teléfono se reportan y no detienen las demás filas.
6. TypeScript, build, pruebas locales de servicio y recorrido de navegador finalizan sin errores atribuibles al cambio.
7. Tras la limpieza no quedan usuarios sintéticos y los datos no sintéticos conservan sus conteos.
