// src/lib/exportExcel.ts
// AVEND ESCALA - Utilidad ligera de exportación CSV/Excel compatible con UTF-8

export interface ExportUserItem {
  name: string;
  email: string;
  role: string;
  modalidad: string;
  nivel: string;
  area: string;
  startDate: string;
  endDate: string;
  lastModified: string;
}

/**
 * Genera un archivo CSV con BOM UTF-8 para garantizar la correcta visualización de tildes y caracteres en MS Excel.
 * @param usuariosData Lista de registros de usuarios a exportar
 * @param filename Nombre predeterminado del archivo descargado
 */
export function exportUsuariosToExcel(
  usuariosData: ExportUserItem[],
  filename: string = 'avend_escala_usuarios.csv'
): void {
  if (!usuariosData || usuariosData.length === 0) {
    alert('No hay registros de usuarios disponibles para exportar.');
    return;
  }

  // Encabezados oficiales de la tabla
  const headers = [
    'USUARIO',
    'CORREO',
    'ROL',
    'MODALIDAD',
    'NIVEL',
    'ÁREA / ESPECIALIDAD',
    'FECHA INICIO',
    'FECHA FIN',
    'ÚLTIMA MODIFICACIÓN',
  ];

  // Construcción de filas escapando comillas para evitar errores de formato CSV
  const rows = usuariosData.map((item) => [
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.email.replace(/"/g, '""')}"`,
    `"${item.role.replace(/"/g, '""')}"`,
    `"${item.modalidad.replace(/"/g, '""')}"`,
    `"${item.nivel.replace(/"/g, '""')}"`,
    `"${item.area.replace(/"/g, '""')}"`,
    `"${item.startDate.replace(/"/g, '""')}"`,
    `"${item.endDate.replace(/"/g, '""')}"`,
    `"${item.lastModified.replace(/"/g, '""')}"`,
  ]);

  // Constante UTF-8 BOM (\uFEFF) para MS Excel
  const csvContent =
    '\uFEFF' +
    headers.join(',') +
    '\n' +
    rows.map((e) => e.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Crear enlace temporal de descarga
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
