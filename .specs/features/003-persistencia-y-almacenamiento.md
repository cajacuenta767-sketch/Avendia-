# SPEC-003: Persistencia de Datos con Prisma ORM y Almacenamiento Cloudflare R2

- **ID:** `SPEC-003`
- **Fecha:** `2026-07-29`
- **Estado:** `COMPLETED`
- **Módulo:** `backend-persistence`
- **Autor:** `Senior Backend Engineer & Cloud Security Specialist`

---

## 1. RESUMEN Y CRITERIOS DE ACEPTACIÓN

### 1.1 Resumen Ejecutivo
Implementación de la infraestructura de base de datos relacional PostgreSQL con Prisma ORM y servicio de entrega de archivos en Cloudflare R2 con costo $0 de salida de datos (Egress).

---

## 2. PLAN DE TAREAS ATÓMICAS (Checklist de Implementación)

- [x] **Tarea 3.1:** Crear cliente R2 `src/lib/r2.ts` con generador de Signed URLs temporales.
- [x] **Tarea 3.2:** Implementar Server Actions en `src/services/evaluacionesService.ts`.
- [x] **Tarea 3.3:** Implementar Server Actions en `src/services/recursosService.ts`.
- [x] **Tarea 3.4:** Crear script de seed `prisma/seed.ts` para PostgreSQL.
- [x] **Tarea 3.5:** Conectar vistas públicas con Server Actions y presigned URLs.
