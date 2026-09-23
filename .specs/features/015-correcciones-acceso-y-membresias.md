# SPEC-015: Correcciones de Acceso, Membresías y Búsqueda Administrativa

- **Estado:** APPROVED
- **Módulos:** `admin-backoffice`, `membresias`, `cuadernillos-rbac`
- **Aprobación:** El usuario autorizó la implementación, QA local y despliegue al VPS.

## Objetivo

Corregir los casos reportados por el cliente sin eliminar ni reemplazar usuarios, PDFs, recursos o datos existentes.

## Reglas de negocio

1. La búsqueda administrativa admite nombre, correo, teléfono y DNI. Las coincidencias exactas se muestran primero y cada cambio de filtro vuelve a la primera página.
2. Abrir la edición de un docente conserva exactamente `fechaInicio` y `fechaFin`; la fecha solo cambia por una acción explícita del administrador.
3. La importación Excel identifica por correo normalizado, no crea duplicados y permite promover una prueba o cuenta vencida a Premium.
4. Una fila Premium conserva la fecha explícita válida del Excel; si no existe, usa doce meses. Nunca reduce un Premium vigente.
5. Un docente con suscripción activa puede visualizar y descargar todos los cuadernillos oficiales MINEDU y sus claves oficiales, sin restricción por modalidad, nivel o especialidad.
6. Una resolución o solucionario de origen AVEND exige coincidencia con modalidad, nivel y especialidad del docente.
7. Administradores y superadministradores mantienen acceso total según su sesión firmada.
8. La autorización de los solucionarios AVEND debe verificarse también en el servidor antes de entregar la ruta del recurso o permitir la descarga.

## Archivos autorizados

- `[MODIFY] src/components/admin/views/UsuariosView.tsx`
- `[MODIFY] src/app/cuadernillos/page.tsx`
- `[MODIFY] src/services/evaluacionesService.ts`
- `[MODIFY] src/app/api/pdf-download/route.ts`
- `[MODIFY] src/app/api/pdf-stream/route.ts` si la verificación del visor lo requiere.
- `[MODIFY] src/components/cuadernillos/PdfViewerModal.tsx` y `UniversalDocViewer.tsx` solo si se requiere transportar metadatos de autorización al visor.

## Seguridad y datos

- No se modifica el esquema Prisma.
- No se instalan dependencias.
- No se borran usuarios, PDFs, evaluaciones, recursos ni registros reales.
- Las pruebas de reglas usan datos sintéticos o consultas de solo lectura.
- Toda autorización se basa en la sesión del servidor, no en parámetros de identidad enviados por el navegador.

## Criterios de aceptación

1. Un correo exacto aparece en primer lugar y la paginación no oculta el resultado.
2. Abrir y guardar un usuario sin cambiar fechas mantiene la vigencia existente.
3. El usuario de Comunicación puede abrir cuadernillos y claves MINEDU de cualquier especialidad, pero solo solucionarios AVEND correspondientes a su perfil.
4. La descarga directa de un solucionario AVEND ajeno responde con acceso denegado.
5. La importación Premium actualiza la cuenta existente sin duplicarla y respeta la vigencia más favorable.
6. Compilación, QA local, despliegue con respaldo y QA de producción completados sin pérdida de archivos ni datos.
