// src/components/admin/views/RegistradoresPanels.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ampliarEdicionRegistradorAction,
  getAltasSemanalesAction,
  getAuditoriaDocenteAction,
  getReporteRegistradoresAction,
  reasignarDocenteRegistradorAction,
  type AltasSemanalesReporte,
  type AuditoriaDocenteItem,
  type ReporteRegistradorItem,
} from '@/services/usuariosService';

const ACCION_LABELS: Record<string, string> = {
  CREAR: 'Registro',
  EDITAR: 'Edición de datos',
  PAUSAR: 'Pausa de suscripción',
  REACTIVAR: 'Reactivación',
  PIN: 'Regeneración de PIN',
  TIPO_ACCESO: 'Cambio de tipo de acceso',
  EXTENDER: 'Extensión de licencia',
  ELIMINAR: 'Eliminación',
  REASIGNAR: 'Reasignación de registrador',
  AMPLIAR_EDICION: 'Ampliación de plazo de edición',
};

function formatFechaPE(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' });
}

function describeDetalle(detalle: string | null): string[] {
  if (!detalle) return [];
  try {
    const parsed = JSON.parse(detalle) as Record<string, unknown>;
    return Object.entries(parsed).map(([campo, valor]) => {
      if (valor && typeof valor === 'object' && 'antes' in valor && 'despues' in valor) {
        const cambio = valor as { antes: unknown; despues: unknown };
        return `${campo}: ${String(cambio.antes ?? '—')} → ${String(cambio.despues ?? '—')}`;
      }
      return `${campo}: ${typeof valor === 'string' ? valor : JSON.stringify(valor)}`;
    });
  } catch {
    return [];
  }
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function exportReporteCsv(rows: ReporteRegistradorItem[], desde: string, hasta: string): void {
  const headers = ['REGISTRADOR', 'CORREO', 'ESTADO CUENTA', 'ALTAS EN PERIODO', 'TOTAL DOCENTES', 'ACTIVOS', 'VENCIDOS / PAUSADOS'];
  const body = rows.map((r) => [r.nombre, r.email, r.estado, r.altasPeriodo, r.totalDocentes, r.activos, r.vencidos].map(csvCell).join(','));
  const csv = '﻿' + headers.join(',') + '\n' + body.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_registradores_${desde || 'inicio'}_${hasta || 'hoy'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const SEMANAS_OPCIONES = [4, 8, 12, 26] as const;

/** "21–27 sep 2026" en hora de Perú. */
function formatSemanaPE(inicioIso: string, finIso: string): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima', ...opts }).replace('.', '');
  const inicioMes = fmt(inicioIso, { month: 'short' });
  const finMes = fmt(finIso, { month: 'short' });
  const inicio = inicioMes === finMes ? fmt(inicioIso, { day: 'numeric' }) : fmt(inicioIso, { day: 'numeric', month: 'short' });
  return `${inicio}–${fmt(finIso, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function exportAltasSemanalesCsv(reporte: AltasSemanalesReporte): void {
  const headers = ['SEMANA (LUN-DOM)', ...reporte.columnas.map((c) => c.nombre.toUpperCase()), 'TOTAL'];
  const body = reporte.semanas.map((s) =>
    [formatSemanaPE(s.inicio, s.fin), ...reporte.columnas.map((c) => s.conteos[c.id] || 0), s.total].map(csvCell).join(',')
  );
  const csv = '\uFEFF' + headers.map(csvCell).join(',') + '\n' + body.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `altas_semanales_${reporte.semanas.length}_semanas.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Conteo semanal de docentes agregados por registrador (lunes a domingo, hora de Perú). */
export const AltasSemanalesPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [semanas, setSemanas] = useState<(typeof SEMANAS_OPCIONES)[number]>(8);
  const [reporte, setReporte] = useState<AltasSemanalesReporte | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void getAltasSemanalesAction(semanas).then((res) => {
      if (!active) return;
      setIsLoading(false);
      if (res.success) setReporte(res.data);
      else onToast(`❌ ${res.error.message}`);
    });
    return () => { active = false; };
    // onToast no es estable entre renders; solo se recarga al cambiar el rango de semanas.
  }, [semanas]);

  const totalGeneral = reporte ? reporte.semanas.reduce((sum, s) => sum + s.total, 0) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 border-b border-gray-100 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Altas por semana</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Docentes agregados de lunes a domingo (hora de Perú).</p>
        </div>
        <div className="sm:ml-auto grid grid-cols-2 sm:flex items-center gap-2">
          <select
            value={semanas}
            onChange={(e) => setSemanas(Number(e.target.value) as (typeof SEMANAS_OPCIONES)[number])}
            aria-label="Cantidad de semanas"
            className="min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
          >
            {SEMANAS_OPCIONES.map((n) => (
              <option key={n} value={n}>Últimas {n} semanas</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => (reporte ? exportAltasSemanalesCsv(reporte) : onToast('ℹ️ No hay datos para exportar.'))}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer whitespace-nowrap"
          >
            📊 Exportar Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <th className="p-3 whitespace-nowrap">Semana (lun–dom)</th>
              {reporte?.columnas.map((c) => (
                <th key={c.id} className="p-3 text-right whitespace-nowrap">
                  {c.nombre}
                  {c.estado === 'PAUSADO' && <span className="ml-1 text-slate-400 normal-case">(pausado)</span>}
                </th>
              ))}
              <th className="p-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {!reporte || reporte.semanas.length === 0 ? (
              <tr>
                <td colSpan={(reporte?.columnas.length || 0) + 2} className="p-6 text-center text-slate-400 font-bold">
                  {isLoading ? 'Cargando…' : 'Sin datos.'}
                </td>
              </tr>
            ) : (
              reporte.semanas.map((s) => (
                <tr key={s.inicio} className={s.esActual ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {formatSemanaPE(s.inicio, s.fin)}
                    {s.esActual && (
                      <span className="ml-2 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">Semana actual</span>
                    )}
                  </td>
                  {reporte.columnas.map((c) => (
                    <td key={c.id} className={`p-3 text-right font-mono font-bold ${s.conteos[c.id] ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                      {s.conteos[c.id] || 0}
                    </td>
                  ))}
                  <td className="p-3 text-right font-mono font-black text-indigo-700 dark:text-indigo-300">{s.total}</td>
                </tr>
              ))
            )}
          </tbody>
          {reporte && reporte.semanas.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 font-black">
                <td className="p-3 text-[10px] uppercase tracking-wider text-slate-500">Total {reporte.semanas.length} semanas</td>
                {reporte.columnas.map((c) => (
                  <td key={c.id} className="p-3 text-right font-mono text-slate-900 dark:text-white">
                    {reporte.semanas.reduce((sum, s) => sum + (s.conteos[c.id] || 0), 0)}
                  </td>
                ))}
                <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-300">{totalGeneral}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

/** Resumen compacto para el REGISTRADOR: sus altas de esta semana y la anterior. */
export const MisAltasSemanalesResumen: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [reporte, setReporte] = useState<AltasSemanalesReporte | null>(null);

  useEffect(() => {
    let active = true;
    void getAltasSemanalesAction(4).then((res) => {
      if (active && res.success) setReporte(res.data);
    });
    return () => { active = false; };
  }, [refreshKey]);

  if (!reporte) return null;
  const [actual, anterior] = reporte.semanas;
  const ultimas4 = reporte.semanas.reduce((sum, s) => sum + s.total, 0);
  const items = [
    { label: 'Esta semana', value: actual?.total ?? 0, detail: actual ? formatSemanaPE(actual.inicio, actual.fin) : '' },
    { label: 'Semana pasada', value: anterior?.total ?? 0, detail: anterior ? formatSemanaPE(anterior.inicio, anterior.fin) : '' },
    { label: 'Últimas 4 semanas', value: ultimas4, detail: 'lunes a domingo' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {item.value} <span className="text-xs font-bold text-slate-500">alta{item.value === 1 ? '' : 's'}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.detail}</p>
        </div>
      ))}
    </div>
  );
};

/** Reporte de altas por registrador en un rango de fechas (para control y comisiones). */
export const RegistradoresReportPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const [desde, setDesde] = useState(firstOfMonth);
  const [hasta, setHasta] = useState(today);
  const [rows, setRows] = useState<ReporteRegistradorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    const res = await getReporteRegistradoresAction(desde, hasta);
    setIsLoading(false);
    if (res.success) setRows(res.data);
    else onToast(`❌ ${res.error.message}`);
  }, [desde, hasta, onToast]);

  useEffect(() => {
    void loadReport();
    // Solo la carga inicial; los cambios de fecha se aplican con "Actualizar".
  }, []);

  const totalAltas = rows.reduce((sum, r) => sum + r.altasPeriodo, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span className="block">Desde</span>
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
          />
        </label>
        <label className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span className="block">Hasta</span>
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadReport()}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl cursor-pointer"
        >
          {isLoading ? 'Cargando…' : 'Actualizar'}
        </button>
        <button
          type="button"
          onClick={() => (rows.length ? exportReporteCsv(rows, desde, hasta) : onToast('ℹ️ No hay registradores para exportar.'))}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer"
        >
          📊 Exportar Excel
        </button>
        <p className="sm:ml-auto text-xs font-bold text-slate-500">
          Altas en el periodo: <span className="text-slate-900 dark:text-white font-black">{totalAltas}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <th className="p-3">Registrador</th>
              <th className="p-3">Cuenta</th>
              <th className="p-3 text-right">Altas en periodo</th>
              <th className="p-3 text-right">Total docentes</th>
              <th className="p-3 text-right">Activos</th>
              <th className="p-3 text-right">Vencidos / pausados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                  {isLoading ? 'Cargando reporte…' : 'Aún no hay registradores creados.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.registradorId}>
                  <td className="p-3">
                    <p className="font-extrabold text-slate-900 dark:text-white">{r.nombre}</p>
                    <p className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{r.email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      r.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-indigo-700 dark:text-indigo-300">{r.altasPeriodo}</td>
                  <td className="p-3 text-right font-bold">{r.totalDocentes}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">{r.activos}</td>
                  <td className="p-3 text-right font-bold text-rose-700">{r.vencidos}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface DocenteAuditoriaPanelProps {
  docenteId: string;
  creadoPorAdminId?: string | null;
  isSuperAdmin: boolean;
  registradores: { id: string; nombre: string }[];
  onChanged: () => Promise<void> | void;
  onToast: (msg: string) => void;
}

/** Historial de cambios del docente y herramientas del Superadministrador sobre su registrador. */
export const DocenteAuditoriaPanel: React.FC<DocenteAuditoriaPanelProps> = ({
  docenteId,
  creadoPorAdminId,
  isSuperAdmin,
  registradores,
  onChanged,
  onToast,
}) => {
  const [historial, setHistorial] = useState<AuditoriaDocenteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registradorSeleccionado, setRegistradorSeleccionado] = useState(creadoPorAdminId || '');
  const [diasAmpliacion, setDiasAmpliacion] = useState(7);

  const loadHistorial = useCallback(async () => {
    setIsLoading(true);
    const res = await getAuditoriaDocenteAction(docenteId);
    setIsLoading(false);
    if (res.success) setHistorial(res.data);
  }, [docenteId]);

  useEffect(() => {
    void loadHistorial();
  }, [loadHistorial]);

  const handleReasignar = async () => {
    const res = await reasignarDocenteRegistradorAction(docenteId, registradorSeleccionado || null);
    if (res.success) {
      onToast('✅ Registrador del docente actualizado.');
      await onChanged();
      await loadHistorial();
    } else {
      onToast(`❌ ${res.error.message}`);
    }
  };

  const handleAmpliar = async () => {
    const res = await ampliarEdicionRegistradorAction(docenteId, diasAmpliacion);
    if (res.success) {
      onToast(`✅ Plazo de edición ampliado hasta ${formatFechaPE(res.data.edicionHasta)}.`);
      await onChanged();
      await loadHistorial();
    } else {
      onToast(`❌ ${res.error.message}`);
    }
  };

  return (
    <div className="space-y-3">
      {isSuperAdmin && (
        <div className="p-4 bg-amber-50/70 dark:bg-slate-800/40 rounded-2xl border border-amber-200/80 dark:border-slate-700 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Registrador asignado</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={registradorSeleccionado}
              onChange={(e) => setRegistradorSeleccionado(e.target.value)}
              aria-label="Registrador asignado"
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white"
            >
              <option value="">Sin registrador (solo administradores)</option>
              {registradores.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleReasignar()}
              disabled={registradorSeleccionado === (creadoPorAdminId || '')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl cursor-pointer"
            >
              Reasignar
            </button>
          </div>
          {creadoPorAdminId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Ampliar plazo de edición del registrador:</label>
              <select
                value={diasAmpliacion}
                onChange={(e) => setDiasAmpliacion(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white"
              >
                {[3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>+{d} días</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAmpliar()}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Ampliar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Historial de cambios</p>
        {isLoading ? (
          <p className="text-[11px] text-slate-400 font-bold">Cargando historial…</p>
        ) : historial.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-bold">Sin cambios registrados desde que se activó el historial.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {historial.map((h) => (
              <li key={h.id} className="text-[11px] border-l-2 border-indigo-300 pl-2.5">
                <p className="font-extrabold text-slate-800 dark:text-slate-100">
                  {ACCION_LABELS[h.accion] || h.accion}
                  <span className="font-bold text-slate-400"> · {formatFechaPE(h.createdAt)}</span>
                </p>
                <p className="text-slate-500">{h.actorEmail} ({h.actorRol})</p>
                {describeDetalle(h.detalle).map((line) => (
                  <p key={line} className="font-mono text-[10px] text-slate-500 break-all">{line}</p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
