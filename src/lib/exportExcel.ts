// src/lib/exportExcel.ts
// AVEND ESCALA - Utilidad de exportación CSV/Excel compatible con UTF-8

import { UsuarioDocenteItem } from '@/services/usuariosService';
import { AdminUserItem } from '@/services/adminService';

/**
 * Exportar lista de Usuarios Docentes a Excel (.csv UTF-8 con BOM)
 */
export function exportDocentesToExcel(
  docentes: UsuarioDocenteItem[],
  filename?: string
): boolean {
  if (!docentes || docentes.length === 0) {
    return false;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `docentes_avend_escala_${dateStr}.csv`;

  // Encabezados oficiales de la tabla Docentes
  const headers = [
    'DNI / CÓDIGO',
    'CELULAR / WHATSAPP',
    'NOMBRE COMPLETO',
    'CORREO ELECTRÓNICO',
    'PIN DE ACCESO',
    'ROL',
    'ESTADO SUSCRIPCIÓN',
    'MODALIDAD',
    'NIVEL EDUCATIVO',
    'ÁREAS / ESPECIALIDAD',
    'TIPOS DE ACCESO',
    'REGIÓN',
    'INSTITUCIÓN EDUCATIVA',
    'FECHA INICIO',
    'FECHA VENCIMIENTO',
    'CREADO POR',
    'MODIFICADO POR',
  ];

  const rows = docentes.map((item) => [
    `"${(item.dni || '').replace(/"/g, '""')}"`,
    `"${(item.telefono || (item.dni && !item.dni.startsWith('USR-') ? item.dni : '')).replace(/"/g, '""')}"`,
    `"${(item.nombre || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(item.pin || '').replace(/"/g, '""')}"`,
    `"${(item.rol || 'DOCENTE').replace(/"/g, '""')}"`,
    `"${(item.estado || 'PREMIUM').replace(/"/g, '""')}"`,
    `"${(item.modalidad || 'EBR').replace(/"/g, '""')}"`,
    `"${(item.nivel || 'INICIAL').replace(/"/g, '""')}"`,
    `"${((item.areas || []).join('; ') || 'General').replace(/"/g, '""')}"`,
    `"${((item.tiposAcceso || []).join('; ') || 'Ninguno').replace(/"/g, '""')}"`,
    `"${(item.region || 'No especificada').replace(/"/g, '""')}"`,
    `"${(item.institucionEducativa || 'No especificada').replace(/"/g, '""')}"`,
    `"${(item.fechaInicio ? item.fechaInicio.substring(0, 10) : '').replace(/"/g, '""')}"`,
    `"${(item.fechaFin ? item.fechaFin.substring(0, 10) : '').replace(/"/g, '""')}"`,
    `"${(item.creadoPor || 'Administrador').replace(/"/g, '""')}"`,
    `"${(item.modificadoPor || item.creadoPor || 'Administrador').replace(/"/g, '""')}"`,
  ]);

  // Constante UTF-8 BOM (\uFEFF) para MS Excel
  const csvContent =
    '\uFEFF' +
    headers.join(',') +
    '\n' +
    rows.map((e) => e.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Exportar lista de Equipo Administrador a Excel (.csv UTF-8 con BOM)
 */
export function exportAdminsToExcel(
  admins: AdminUserItem[],
  filename?: string
): boolean {
  if (!admins || admins.length === 0) {
    return false;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `administradores_avend_escala_${dateStr}.csv`;

  const headers = [
    'NOMBRE',
    'CORREO ELECTRÓNICO',
    'USUARIO / LOGIN',
    'ROL',
    'ESTADO',
    'MÓDULO USUARIOS',
    'MÓDULO CUADERNILLOS',
    'MÓDULO RECURSOS',
    'MÓDULO MÉTRICAS',
    'CREADO POR',
    'MODIFICADO POR',
    'FECHA CREACIÓN',
  ];

  const rows = admins.map((item) => [
    `"${(item.nombre || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(item.usuario || '').replace(/"/g, '""')}"`,
    `"${(item.rol || 'ADMINISTRADOR').replace(/"/g, '""')}"`,
    `"${(item.estado || 'ACTIVO').replace(/"/g, '""')}"`,
    `"${item.permisoUsuarios ? 'SI' : 'NO'}"`,
    `"${item.permisoCuadernillos ? 'SI' : 'NO'}"`,
    `"${item.permisoRecursos ? 'SI' : 'NO'}"`,
    `"${item.permisoMetricas ? 'SI' : 'NO'}"`,
    `"${(item.creadoPor || 'Sistema AVEND').replace(/"/g, '""')}"`,
    `"${(item.modificadoPor || item.creadoPor || 'Sistema AVEND').replace(/"/g, '""')}"`,
    `"${(item.createdAt ? item.createdAt.substring(0, 10) : '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    '\uFEFF' +
    headers.join(',') +
    '\n' +
    rows.map((e) => e.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
