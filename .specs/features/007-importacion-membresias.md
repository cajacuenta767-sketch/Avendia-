# SPEC-007: Importación de Membresías por Excel

- **Estado:** APPROVED
- **Módulo:** `admin-backoffice`

## Objetivo

Actualizar usuarios existentes por correo electrónico durante la importación masiva, respetando el plan y la vigencia informados en el Excel, sin eliminar datos existentes.

## Reglas de negocio

1. El correo normalizado identifica al usuario y evita duplicados.
2. `PREMIUM` o `DOCENTE` concede Premium por doce meses cuando no hay `FechaFin` válida.
3. Una `FechaFin` válida del Excel se respeta, salvo que reduzca la vigencia de un Premium vigente: en ese caso se conserva la fecha más lejana.
4. Prueba, cliente, vencido o inactivo no reducen una membresía Premium vigente.
5. Una fila Premium promueve automáticamente una prueba o una cuenta vencida.
6. Filas repetidas del mismo correo se consolidan conservando el acceso y vencimiento más favorables.
7. No se borran usuarios, PDFs, recursos ni registros existentes.

## Archivos autorizados

- `src/components/admin/modals/BulkUserImportModal.tsx`
- `src/services/usuariosService.ts`

## Validación

Se validará el tipado y los casos de Premium, prueba, fecha manual, protección de Premium y promoción desde prueba mediante datos temporales.
