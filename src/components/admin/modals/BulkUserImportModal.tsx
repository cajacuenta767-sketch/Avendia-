// src/components/admin/modals/BulkUserImportModal.tsx
'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { parseUserImportRows } from '@/lib/userImportNormalizer';
import { importarUsuariosMasivoAction } from '@/services/usuariosService';
import type {
  BulkImportOptions,
  ImportColumnConfidence,
  ImportMembershipPolicy,
  ImportReport,
  ParsedUserImport,
  SpreadsheetCell,
  UserImportColumnField,
  UserImportColumnMapping,
} from '@/types/userImport';

interface BulkUserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminName?: string;
}

interface ImportProgress {
  current: number;
  total: number;
  percent: number;
  statusText: string;
}

const COLUMN_FIELD_OPTIONS: Array<{ value: UserImportColumnField; label: string }> = [
  { value: 'ignore', label: 'Ignorar columna' },
  { value: 'nombre', label: 'Nombre completo' },
  { value: 'email', label: 'Correo' },
  { value: 'telefono', label: 'WhatsApp / celular' },
  { value: 'dni', label: 'DNI' },
  { value: 'rol', label: 'Rol / plan' },
  { value: 'estado', label: 'Estado' },
  { value: 'fechaInicio', label: 'Fecha de registro' },
  { value: 'fechaFin', label: 'Fecha de vencimiento' },
  { value: 'tiposAcceso', label: 'Procesos / accesos' },
  { value: 'modalidad', label: 'Modalidad' },
  { value: 'nivel', label: 'Nivel' },
  { value: 'especialidad', label: 'Especialidad' },
  { value: 'region', label: 'Región' },
  { value: 'institucionEducativa', label: 'Institución educativa' },
  { value: 'pin', label: 'PIN de 4 dígitos' },
];

const CONFIDENCE_LABELS: Record<ImportColumnConfidence, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

function emptyReport(total: number, ambiguousColumns: number): ImportReport {
  return {
    totalLeidos: total,
    nuevosCreados: 0,
    actualizados: 0,
    promovidosAPremium: 0,
    premiumProtegidos: 0,
    noPromovidos: 0,
    duplicadosConsolidados: 0,
    nombresCorregidos: 0,
    telefonosCorregidos: 0,
    fechasRenovadas: 0,
    ambiguedadesDetectadas: ambiguousColumns,
    conflictos: [],
    errores: [],
  };
}

function mappingFromPreview(preview: ParsedUserImport): UserImportColumnMapping {
  const mapping = Object.fromEntries(
    preview.columns.map((column) => [String(column.index), column.selectedField]),
  );

  // La primera columna suele ser un índice, PIN u otro dato auxiliar de reportes
  // exportados. Se ignora inicialmente, pero el administrador puede reasignarla.
  if (preview.columns.some((column) => column.index === 0)) {
    mapping['0'] = 'ignore';
  }

  return mapping;
}

export function BulkUserImportModal({
  isOpen,
  onClose,
  onSuccess,
  adminName = 'Administrador',
}: BulkUserImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<SpreadsheetCell[][]>([]);
  const [columnMapping, setColumnMapping] = useState<UserImportColumnMapping>({});
  const [preview, setPreview] = useState<ParsedUserImport | null>(null);
  const [membershipPolicy, setMembershipPolicy] = useState<ImportMembershipPolicy>('LEGACY_ACTIVE_IS_PREMIUM');
  const [mappingConfirmed, setMappingConfirmed] = useState(true);
  const [legacyConfirmed, setLegacyConfirmed] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  if (!isOpen) return null;

  const parsedRecords = preview?.records ?? [];
  const mappingIsValid = Boolean(
    preview?.hasEmailColumn
      && preview.summary.conflictosMapeo === 0
      && parsedRecords.length > 0,
  );
  const canImport = mappingIsValid
    && mappingConfirmed
    && (membershipPolicy !== 'LEGACY_ACTIVE_IS_PREMIUM' || legacyConfirmed)
    && !isProcessing;

  const refreshPreview = (
    rows: SpreadsheetCell[][],
    policy: ImportMembershipPolicy,
    mapping?: UserImportColumnMapping,
  ): ParsedUserImport => {
    const parsed = parseUserImportRows(rows, {
      membershipPolicy: policy,
      columnMapping: mapping,
    });
    setPreview(parsed);
    return parsed;
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setReport(null);
    setMappingConfirmed(true);
    setLegacyConfirmed(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileData = event.target?.result;
        if (!(fileData instanceof ArrayBuffer)) {
          throw new Error('No fue posible leer el archivo seleccionado.');
        }
        const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
        if (!worksheet) throw new Error('El archivo no contiene una hoja válida.');

        const rows = XLSX.utils.sheet_to_json<SpreadsheetCell[]>(worksheet, {
          header: 1,
          defval: '',
          raw: true,
        });
        if (rows.length === 0) throw new Error('El archivo no contiene filas de datos.');

        setRawRows(rows);
        const detectedPreview = refreshPreview(rows, membershipPolicy);
        const initialMapping = mappingFromPreview(detectedPreview);
        const parsed = refreshPreview(rows, membershipPolicy, initialMapping);
        setColumnMapping(initialMapping);
        if (parsed.records.length === 0) {
          setErrorMessage('No se detectaron correos válidos. Revisa el mapeo de columnas.');
        }
      } catch (error: unknown) {
        setRawRows([]);
        setColumnMapping({});
        setPreview(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al leer el archivo Excel/CSV. Verifica que el formato sea válido.',
        );
      }
    };
    reader.onerror = () => {
      setErrorMessage('No fue posible abrir el archivo seleccionado.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePolicyChange = (policy: ImportMembershipPolicy) => {
    setMembershipPolicy(policy);
    setLegacyConfirmed(false);
    setMappingConfirmed(false);
    if (rawRows.length > 0) refreshPreview(rawRows, policy, columnMapping);
  };

  const handleMappingChange = (columnIndex: number, field: UserImportColumnField) => {
    const nextMapping = { ...columnMapping, [String(columnIndex)]: field };
    setColumnMapping(nextMapping);
    setMappingConfirmed(false);
    refreshPreview(rawRows, membershipPolicy, nextMapping);
  };

  const handleConfirmMapping = () => {
    if (!mappingIsValid) {
      setErrorMessage('Corrige el mapeo: debe existir un solo correo y no deben repetirse campos.');
      return;
    }
    setErrorMessage(null);
    setMappingConfirmed(true);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Correo: 'docente.ejemplo@gmail.com',
        'Nombre Completo': 'María Rosa Pérez',
        WhatsApp: '987654321',
        Estado: 'ACTIVA',
        'Rol / Plan': 'PREMIUM',
        Región: 'Lima',
        Modalidad: 'EBR',
        Nivel: 'INICIAL',
        Especialidad: 'Inicial',
        'Tipo de Acceso': 'Ascenso, Nombramiento, Directivo',
        'PIN / Clave': '2026',
        'Fecha Inicio': '31/08/2026',
        'Fecha Fin / Vigencia': '31/08/2027',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 15 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 35 },
      { wch: 14 }, { wch: 16 }, { wch: 22 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Docentes');
    XLSX.writeFile(workbook, 'plantilla_importacion_docentes.xlsx');
  };

  const handleStartImport = async () => {
    if (!preview || !canImport) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const total = preview.records.length;
    const chunkSize = 150;
    const accumulatedReport = emptyReport(total, preview.summary.columnasAmbiguas);
    const options: BulkImportOptions = {
      membershipPolicy,
      mappingConfirmed: true,
      dateAmbiguitiesResolved: true,
      columnMapping,
      ambiguousColumns: preview.summary.columnasAmbiguas,
    };

    setProgress({
      current: 0,
      total,
      percent: 0,
      statusText: `Iniciando importación de ${total.toLocaleString()} docentes...`,
    });

    try {
      for (let index = 0; index < total; index += chunkSize) {
        const chunk = preview.records.slice(index, index + chunkSize);
        const currentEnd = Math.min(index + chunkSize, total);
        const percent = Math.round((currentEnd / total) * 100);
        setProgress({
          current: currentEnd,
          total,
          percent,
          statusText: `Procesando ${currentEnd.toLocaleString()} de ${total.toLocaleString()} registros...`,
        });

        const response = await importarUsuariosMasivoAction(chunk, options, adminName);
        if (!response.success) {
          throw new Error(response.error.message);
        }
        accumulatedReport.nuevosCreados += response.data.nuevosCreados;
        accumulatedReport.actualizados += response.data.actualizados;
        accumulatedReport.promovidosAPremium += response.data.promovidosAPremium;
        accumulatedReport.premiumProtegidos += response.data.premiumProtegidos;
        accumulatedReport.noPromovidos += response.data.noPromovidos;
        accumulatedReport.duplicadosConsolidados += response.data.duplicadosConsolidados;
        accumulatedReport.nombresCorregidos += response.data.nombresCorregidos;
        accumulatedReport.telefonosCorregidos += response.data.telefonosCorregidos;
        accumulatedReport.fechasRenovadas += response.data.fechasRenovadas;
        accumulatedReport.conflictos.push(...response.data.conflictos);
        accumulatedReport.errores.push(...response.data.errores);
      }

      setReport(accumulatedReport);
      setProgress(null);
      setIsProcessing(false);
      onSuccess();
    } catch (error: unknown) {
      setProgress(null);
      setIsProcessing(false);
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado durante la importación.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setRawRows([]);
    setColumnMapping({});
    setPreview(null);
    setMappingConfirmed(false);
    setLegacyConfirmed(false);
    setErrorMessage(null);
    setReport(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const reportCards = report ? [
    ['Total leídos', report.totalLeidos, 'bg-blue-50 border-blue-200 text-blue-900'],
    ['Nuevos', report.nuevosCreados, 'bg-emerald-50 border-emerald-200 text-emerald-900'],
    ['Actualizados', report.actualizados, 'bg-violet-50 border-violet-200 text-violet-900'],
    ['Promovidos', report.promovidosAPremium, 'bg-amber-50 border-amber-200 text-amber-900'],
    ['Premium protegidos', report.premiumProtegidos, 'bg-cyan-50 border-cyan-200 text-cyan-900'],
    ['Nombres corregidos', report.nombresCorregidos, 'bg-indigo-50 border-indigo-200 text-indigo-900'],
    ['Teléfonos corregidos', report.telefonosCorregidos, 'bg-teal-50 border-teal-200 text-teal-900'],
    ['Fechas renovadas', report.fechasRenovadas, 'bg-orange-50 border-orange-200 text-orange-900'],
  ] as const : [];

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="responsive-modal-panel relative flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-lg">📊</div>
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600">Carga masiva segura</span>
              <h2 className="truncate text-base font-black text-slate-900 dark:text-white sm:text-lg">Importación Excel / CSV con vista previa</h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar importador"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-4 sm:p-6">
          {!isProcessing && !report && (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wide text-emerald-800">Plantilla estructurada</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-600">Es opcional: el importador también reconoce columnas desordenadas o sin encabezados.</p>
              </div>
              <button type="button" onClick={handleDownloadTemplate} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700">
                Descargar plantilla (.xlsx)
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}

          {isProcessing && progress ? (
            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="text-4xl">⚡</div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Importando docentes</h3>
                <p className="mt-1 text-xs text-slate-500">{progress.statusText}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex justify-between text-xs font-black text-slate-600 dark:text-slate-300">
                  <span>{progress.current} / {progress.total}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500">No cierres esta ventana hasta terminar.</p>
            </section>
          ) : report ? (
            <section className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {reportCards.map(([label, value, color]) => (
                  <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
                    <span className="block text-[10px] font-black uppercase">{label}</span>
                    <span className="mt-1 block text-2xl font-black">{value}</span>
                  </div>
                ))}
              </div>

              {(report.conflictos.length > 0 || report.errores.length > 0) ? (
                <div className="space-y-3">
                  {report.conflictos.length > 0 && (
                    <IssueTable title="Conflictos protegidos" issues={report.conflictos} tone="amber" />
                  )}
                  {report.errores.length > 0 && (
                    <IssueTable title="Filas omitidas" issues={report.errores} tone="rose" />
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800">
                  ✅ Todos los registros se procesaron sin conflictos.
                </div>
              )}

              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <button type="button" onClick={handleReset} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-extrabold text-slate-700">Importar otro archivo</button>
                <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white">Cerrar</button>
              </div>
            </section>
          ) : (
            <section className="space-y-5">
              <div
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800/50 sm:p-8"
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl">📁</div>
                <p className="mt-3 break-all text-xs font-extrabold text-slate-800 dark:text-slate-200">{selectedFile?.name ?? 'Selecciona o arrastra un archivo Excel / CSV'}</p>
                <p className="mt-1 text-[11px] text-slate-400">.xlsx, .xls o .csv · Procesamiento masivo sin límite de filas</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700">
                  Seleccionar archivo
                </button>
              </div>

              {preview && (
                <>
                  <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">1. Elige cómo interpretar la membresía</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Nada se guardará hasta confirmar esta regla y el mapeo.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <PolicyCard
                        checked={membershipPolicy === 'STRICT_EXPLICIT'}
                        title="Modo estricto"
                        description="Solo PREMIUM o DOCENTE escrito en el archivo concede Premium."
                        onSelect={() => handlePolicyChange('STRICT_EXPLICIT')}
                      />
                      <PolicyCard
                        checked={membershipPolicy === 'LEGACY_ACTIVE_IS_PREMIUM'}
                        title="Reporte antiguo / legacy"
                        description="Si el rol está vacío y el estado dice ACTIVO o ACTIVA, se concede Premium."
                        onSelect={() => handlePolicyChange('LEGACY_ACTIVE_IS_PREMIUM')}
                      />
                    </div>
                    {membershipPolicy === 'LEGACY_ACTIVE_IS_PREMIUM' && (
                      <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                        <input type="checkbox" checked={legacyConfirmed} onChange={(event) => setLegacyConfirmed(event.target.checked)} className="mt-0.5" />
                        Confirmo que este archivo proviene del reporte antiguo y que ACTIVO/ACTIVA sin rol significa Premium.
                      </label>
                    )}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">2. Revisa el mapeo de columnas</h3>
                        <p className="mt-1 text-[11px] text-slate-500">Confianza, ejemplos reales del archivo y selector para corregir cada columna.</p>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                        {preview.headerRowIndex >= 0 ? `Encabezado en fila ${preview.headerRowIndex + 1}` : 'Sin encabezados'}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {preview.columns.map((column) => (
                        <div key={column.index} className={`rounded-2xl border p-3 ${column.requiresConfirmation ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-black text-slate-900">{column.sourceLabel}</span>
                              <span className="mt-0.5 block text-[10px] font-bold text-slate-500">Confianza {CONFIDENCE_LABELS[column.confidence]} · {Math.round(column.confidenceScore * 100)}%</span>
                            </div>
                            {column.requiresConfirmation && <span className="rounded-full bg-amber-200 px-2 py-1 text-[9px] font-black text-amber-900">REVISAR</span>}
                          </div>
                          <select
                            aria-label={`Mapeo de ${column.sourceLabel}`}
                            value={columnMapping[String(column.index)] ?? column.selectedField}
                            onChange={(event) => handleMappingChange(column.index, event.target.value as UserImportColumnField)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                          >
                            {COLUMN_FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{column.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {column.examples.map((example) => <span key={example} className="max-w-full truncate rounded-md bg-white px-2 py-1 text-[9px] font-medium text-slate-600">{example}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[11px] font-medium text-slate-600 flex-1">
                        {preview.warnings.length > 0 ? (
                          <div className="space-y-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                            {preview.warnings.map((w, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span>⚠️</span>
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold">✓ El mapeo no presenta advertencias.</span>
                        )}
                      </div>
                      <button type="button" onClick={handleConfirmMapping} disabled={!mappingIsValid} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {mappingConfirmed ? '✓ Mapeo confirmado' : 'Confirmar mapeo'}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">3. Comprueba la vista previa</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                      <PreviewStat label="Correos" value={preview.summary.filasConCorreo} />
                      <PreviewStat label="Nombres" value={preview.summary.nombresDetectados} />
                      <PreviewStat label="WhatsApp" value={preview.summary.telefonosDetectados} />
                      <PreviewStat label="Fechas" value={preview.summary.fechasDetectadas} />
                      <PreviewStat label="Premium" value={preview.summary.premiumDetectados} tone="emerald" />
                      <PreviewStat label="Sin promoción" value={preview.summary.sinPromocion} />
                      <PreviewStat label="Ambiguas" value={preview.summary.columnasAmbiguas} tone="amber" />
                      <PreviewStat label="Conflictos" value={preview.summary.conflictosMapeo} tone="rose" />
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-[760px] w-full text-left text-[10px]">
                        <thead className="bg-slate-100 font-black uppercase text-slate-600">
                          <tr><th className="p-2">Fila</th><th className="p-2">Nombre</th><th className="p-2">Correo</th><th className="p-2">WhatsApp</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Registro</th><th className="p-2">Vencimiento</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRecords.slice(0, 5).map((record) => (
                            <tr key={`${record.fila}-${record.email}`}>
                              <td className="p-2 font-bold">{record.fila}</td>
                              <td className="p-2">{record.nombre || '—'}</td>
                              <td className="p-2 font-mono text-blue-700">{record.email}</td>
                              <td className="p-2">{record.telefono || '—'}</td>
                              <td className="p-2">{record.rol || '—'}</td>
                              <td className="p-2">{record.estado || '—'}</td>
                              <td className="p-2">{record.fechaInicio || '—'}</td>
                              <td className="p-2">{record.fechaFin || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              <div className="flex flex-col justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-extrabold text-slate-700">Cancelar</button>
                <button type="button" onClick={handleStartImport} disabled={!canImport} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                  Importar {parsedRecords.length > 0 ? `${parsedRecords.length} registros` : ''}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyCard({
  checked,
  title,
  description,
  onSelect,
}: {
  checked: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className={`rounded-2xl border p-4 text-left transition ${checked ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <span className="flex items-center gap-2 text-xs font-black text-slate-900"><span className={`h-3 w-3 rounded-full border ${checked ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`} />{title}</span>
      <span className="mt-2 block text-[11px] leading-relaxed text-slate-600">{description}</span>
    </button>
  );
}

function PreviewStat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  return <div className={`rounded-xl border p-2 text-center ${colors[tone]}`}><span className="block text-lg font-black">{value}</span><span className="block text-[9px] font-bold uppercase">{label}</span></div>;
}

function IssueTable({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ImportReport['errores'];
  tone: 'amber' | 'rose';
}) {
  const colors = tone === 'amber'
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : 'border-rose-200 bg-rose-50 text-rose-900';
  return (
    <div className={`overflow-hidden rounded-2xl border ${colors}`}>
      <h4 className="px-3 py-2 text-xs font-black uppercase">{title} ({issues.length})</h4>
      <div className="max-h-48 overflow-auto bg-white/60">
        <table className="min-w-[580px] w-full text-left text-[10px]">
          <thead><tr><th className="p-2">Fila</th><th className="p-2">Correo</th><th className="p-2">Detalle</th></tr></thead>
          <tbody className="divide-y divide-current/10">{issues.map((issue, index) => <tr key={`${issue.fila}-${issue.correo}-${index}`}><td className="p-2 font-black">{issue.fila}</td><td className="p-2 font-mono">{issue.correo}</td><td className="p-2">{issue.motivo}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
