# SPEC-016: Importación Universal, Membresías y PIN Persistente

- **Estado:** APPROVED
- **Módulos:** `admin-backoffice`, `membresias`, `auth-docente`, `cuadernillos-rbac`
- **Fecha:** `2026-08-30`
- **Aprobación:** El usuario aprobó expresamente el PEP para implementación y QA local.

## Objetivo

Corregir la importación flexible de usuarios y las transiciones de prueba/cliente a Premium, conservar fechas y PIN existentes salvo cambios explícitos, reemplazar el PIN diario por un PIN persistente y completar las reglas de acceso documental sin alterar usuarios ni archivos reales.

## Reglas de importación y membresía

1. El correo normalizado identifica de forma única al docente.
2. El importador detecta la fila de encabezados y reconoce alias aunque las columnas estén desordenadas o existan columnas adicionales.
3. Solo una indicación reconocible de `PREMIUM` o `DOCENTE` concede Premium; una celda vacía o desconocida no lo concede.
4. Una fila Premium promueve una prueba activa, prueba vencida o cuenta Cliente sin crear duplicados.
5. Una fila no Premium nunca degrada un Premium vigente, reduce su fecha, elimina sus accesos ni reemplaza su PIN.
6. Una prueba activa no Premium conserva su vencimiento original; una prueba vencida no se reinicia.
7. Las filas repetidas se consolidan dando prioridad a Premium y a la fecha válida más favorable.
8. Una fecha final explícita válida se respeta. Si Premium no trae fecha final válida, se conceden doce meses desde la fecha de inicio efectiva.
9. Un PIN vacío conserva el existente; un PIN explícito válido de cuatro dígitos lo actualiza.
10. El informe distingue creados, actualizados, promovidos, Premium protegidos, no promovidos, consolidados y errores.

## PIN persistente

1. Esta especificación reemplaza la rotación diaria definida por SPEC-014.
2. Los mismos cuatro casilleros aceptan el OTP temporal enviado por correo o el PIN persistente asignado al docente.
3. El PIN tiene exactamente cuatro dígitos y puede ser compartido por varias cuentas; el correo sigue siendo obligatorio para identificar la cuenta.
4. El PIN se conserva hasta que un administrador lo cambie o regenere explícitamente.
5. Iniciar sesión con PIN no activa ni extiende una membresía.
6. El PIN no se registra en consola, trazas ni mensajes de error.

## Fechas administrativas

1. Abrir y guardar un docente conserva `fechaInicio` y `fechaFin` reales.
2. La duración sugerida solo se utiliza al crear o cuando el administrador elige expresamente una duración.
3. Editar nombre, perfil, accesos o PIN no restablece seis ni doce meses.

## Acceso documental

1. Todo docente con suscripción activa puede visualizar y descargar cuadernillos y claves oficiales MINEDU sin restricción de modalidad, nivel o especialidad.
2. Las resoluciones AVEND de Nombramiento y Ascenso exigen coincidencia de modalidad, nivel y especialidad.
3. El proceso Directivos permite acceso general a sus documentos, incluidas resoluciones, sin restricción por especialidad.
4. Las mismas reglas se aplican antes de emitir rutas firmadas, en el visor y en la descarga directa.

## Seguridad y datos

- Las acciones de importación y edición requieren sesión administrativa firmada.
- Las entradas se validan con Zod en el servidor.
- No se modifica el esquema Prisma ni se instalan dependencias.
- No se borran o reemplazan usuarios, administradores, PDFs, recursos o datos reales.
- La QA usa exactamente diez usuarios sintéticos con prefijo único y los elimina por IDs verificados al finalizar.
- Los archivos de R2 continúan privados y las rutas firmadas conservan un TTL máximo de 300 segundos.

## Archivos autorizados

- `[NEW] src/lib/docentePin.ts`
- `[NEW] src/lib/userImportNormalizer.ts`
- `[NEW] src/types/userImport.ts`
- `[MODIFY] src/services/usuariosService.ts`
- `[MODIFY] src/components/admin/modals/BulkUserImportModal.tsx`
- `[MODIFY] src/components/admin/modals/UserFormModal.tsx`
- `[MODIFY] src/components/admin/views/UsuariosView.tsx`
- `[MODIFY] src/components/auth/LoginForm.tsx`
- `[MODIFY] src/components/auth/DocenteAuthModal.tsx`
- `[MODIFY] src/lib/whatsapp.ts`
- `[MODIFY] src/app/cuadernillos/page.tsx`
- `[MODIFY] src/services/evaluacionesService.ts`
- `[MODIFY] src/app/api/pdf-download/route.ts`
- `[MODIFY] src/app/api/pdf-stream/route.ts`

## Matriz QA local

1. Prueba vencida + Premium => promovido.
2. Prueba vencida + no Premium => continúa bloqueado.
3. Prueba activa + Premium => promovido.
4. Prueba activa + no Premium => conserva prueba y fecha.
5. Premium + rol vacío => Premium protegido.
6. Premium + Cliente => no degradado.
7. Cliente + Premium con fecha exacta => activado hasta esa fecha.
8. Cliente + no Premium => continúa bloqueado.
9. Nuevo Premium con PIN => creado y autenticable por PIN.
10. Correo repetido prueba/Premium => un registro Premium consolidado.

## Criterios de aceptación

1. Las diez pruebas producen el resultado esperado sin duplicados.
2. La columna Premium se reconoce con encabezados alternativos y en cualquier posición.
3. El PIN persiste entre días y solo cambia por una acción explícita.
4. Guardar una edición sin cambiar fechas conserva la vigencia exacta.
5. MINEDU es transversal, AVEND respeta perfil excepto Directivos.
6. TypeScript, build, navegador local y verificaciones de servidor finalizan sin errores relevantes.
7. Tras la limpieza no quedan usuarios ni archivos temporales de QA y los conteos reales permanecen iguales.
