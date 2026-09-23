// src/components/cuadernillos/UniversalDocViewer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { MobilePdfViewer } from './MobilePdfViewer';

interface UniversalDocViewerProps {
  fileUrl: string;
  fileName?: string;
  isAdmin?: boolean;
}

export const UniversalDocViewer: React.FC<UniversalDocViewerProps> = ({
  fileUrl,
  fileName,
  isAdmin = false,
}) => {
  const [docType, setDocType] = useState<'EXCEL' | 'WORD' | 'IMAGE' | 'PDF' | 'PPT' | 'OTHER'>('PDF');
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [userViewerMode, setUserViewerMode] = useState<'AUTO' | 'MOBILE' | 'DESKTOP'>('AUTO');

  // Detectar automáticamente si es celular o tablet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTouchOrMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768 ||
        (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && window.innerWidth < 1024);
      setIsMobileDevice(isTouchOrMobile);
    }
  }, []);

  // Estados para Excel
  const [sheets, setSheets] = useState<{ [name: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [excelSearch, setExcelSearch] = useState<string>('');

  // Estado para Word
  const [wordHtml, setWordHtml] = useState<string>('');

  // Estados de control
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processFile() {
      if (!fileUrl) {
        setIsLoading(false);
        try {
          const { registrarReporteRecursoFaltanteAction } = await import('@/services/notificacionesService');
          await registrarReporteRecursoFaltanteAction({
            tipoRecurso: 'RECURSO_PDF',
            tituloEvaluacion: fileName || 'Recurso Pedagógico',
          });
          window.dispatchEvent(new Event('admin_notif_refresh'));
        } catch {}
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const clean = fileUrl.toLowerCase().split('?')[0].split('#')[0];
        const ext = clean.split('.').pop() || '';

        // 1. Identificar Tipo de Documento
        if (['xlsx', 'xls', 'csv'].includes(ext)) {
          setDocType('EXCEL');
          const streamUrl = `/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`;
          const res = await fetch(streamUrl);
          if (!res.ok) throw new Error('Error al cargar archivo de hoja de cálculo');
          const buffer = await res.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });

          const parsedSheets: { [name: string]: any[][] } = {};
          workbook.SheetNames.forEach((name) => {
            const worksheet = workbook.Sheets[name];
            parsedSheets[name] = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: '',
              blankrows: false,
            }) as any[][];
          });

          if (isMounted) {
            setSheets(parsedSheets);
            setSheetNames(workbook.SheetNames);
            setActiveSheet(workbook.SheetNames[0] || '');
          }
        } else if (['docx', 'doc'].includes(ext)) {
          setDocType('WORD');
          const streamUrl = `/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`;
          const res = await fetch(streamUrl);
          if (!res.ok) throw new Error('Error al cargar documento Word');
          const buffer = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (isMounted) {
            setWordHtml(result.value);
          }
        } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) || fileUrl.startsWith('data:image/')) {
          setDocType('IMAGE');
        } else if (['pptx', 'ppt'].includes(ext)) {
          setDocType('PPT');
        } else {
          setDocType('PDF');
        }

        if (isMounted) setIsLoading(false);
      } catch (err: any) {
        if (isMounted) {
          console.error('❌ Error en UniversalDocViewer:', err);
          setError('No se pudo procesar la previsualización directa del archivo.');
          setIsLoading(false);
        }
      }
    }

    processFile();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, fileName]);

  // Pantalla de Carga
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[420px] w-full">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-300">Cargando documento en vivo...</p>
        <p className="text-[11px] text-slate-500 mt-1">Renderizando contenido multi-formato</p>
      </div>
    );
  }

  // Pantalla Flotante Estilizada si no hay PDF o hubo un error
  if (!fileUrl || fileUrl.trim() === '' || error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-950 text-center w-full min-h-[420px] select-none">
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur-lg opacity-35 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center text-4xl shadow-inner">
            📄
          </div>
        </div>

        <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
          DOCUMENTO EN PROCESO DE CARGA
        </span>

        <h3 className="text-base sm:text-lg font-black text-white max-w-md mb-2 leading-snug">
          {fileName || 'Archivo Digital No Disponible'}
        </h3>

        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
          El archivo digital de este recurso aún no ha sido cargado o no se completó la subida física al servidor.
        </p>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 max-w-md text-left flex items-start space-x-3.5 shadow-xl">
          <span className="text-xl shrink-0">🔔</span>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-200">Aviso Automático Enviado</p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Se ha emitido una alerta a la campanita del panel de administración para regularizar la carga de este material.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 1. VISOR DE EXCEL / CSV EN VIVO (.xlsx, .xls, .csv)
  if (docType === 'EXCEL') {
    const rawRows = sheets[activeSheet] || [];
    const filteredRows = excelSearch.trim()
      ? rawRows.filter((row, idx) =>
          idx === 0 ||
          row.some((cell) =>
            String(cell || '')
              .toLowerCase()
              .includes(excelSearch.toLowerCase().trim())
          )
        )
      : rawRows;

    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-200 w-full">
        {/* Barra Superior de Excel: Pestañas de Hojas y Buscador Rápido */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-xl">
            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md mr-1 shrink-0">
              📊 Excel en Vivo
            </span>
            {sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheet(name)}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer shrink-0 ${
                  activeSheet === name
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={excelSearch}
              onChange={(e) => setExcelSearch(e.target.value)}
              placeholder="🔍 Filtrar en hoja..."
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-white outline-none focus:border-emerald-500 w-36 sm:w-48"
            />
            <span className="text-[10px] font-bold text-slate-400">
              {filteredRows.length} filas
            </span>
          </div>
        </div>

        {/* Tabla Cuadrícula Excel Interactiva */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {filteredRows.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">
              No se encontraron datos en esta hoja de cálculo.
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <tbody>
                {filteredRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`border-b border-slate-200 dark:border-slate-800 ${
                      rowIndex === 0
                        ? 'bg-slate-200/90 dark:bg-slate-800/95 font-black text-slate-900 dark:text-white sticky top-0 shadow-2xs z-10'
                        : rowIndex % 2 === 0
                        ? 'bg-white dark:bg-slate-900/90 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    <td className="w-10 px-2 py-1.5 text-center text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-800 select-none">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell: any, colIndex: number) => (
                      <td
                        key={colIndex}
                        className={`px-3 py-2 border-r border-slate-200/80 dark:border-slate-800/60 font-medium ${
                          rowIndex === 0 ? 'font-black' : ''
                        }`}
                      >
                        {String(cell !== undefined && cell !== null ? cell : '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // 2. VISOR DE WORD EN VIVO (.docx, .doc)
  if (docType === 'WORD') {
    return (
      <div className="flex-1 overflow-auto p-6 sm:p-10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 rounded-md">
              📝 Documento Word Formateado
            </span>
            <span className="text-xs font-bold text-slate-400">
              {fileName || 'documento.docx'}
            </span>
          </div>

          <div
            className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-3"
            dangerouslySetInnerHTML={{ __html: wordHtml }}
          />
        </div>
      </div>
    );
  }

  // 3. VISOR DE IMÁGENES (.png, .jpg, .webp, .svg)
  if (docType === 'IMAGE') {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 overflow-auto w-full h-full">
        <img
          src={fileUrl.startsWith('data:') ? fileUrl : `/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`}
          alt={fileName || 'Previsualización'}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-slate-800"
        />
      </div>
    );
  }

  // 4. VISOR DE POWERPOINT (.pptx, .ppt)
  if (docType === 'PPT') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 text-center w-full min-h-[420px]">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/10 mb-4 animate-bounce">
          📽️
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-700 mb-2">
          PRESENTACIÓN POWERPOINT
        </span>
        <h4 className="text-base font-black text-white mb-1.5">{fileName || 'Diapositivas PowerPoint'}</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Este archivo contiene diapositivas y presentaciones pedagógicas en formato nativo de <strong>Microsoft PowerPoint (.pptx)</strong>.
        </p>
        <a
          href={`/api/pdf-download?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName || 'presentacion.pptx')}${isAdmin ? '&isAdmin=true' : ''}`}
          download
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer transition-all active:scale-95 flex items-center space-x-2"
        >
          <span>📥</span>
          <span>Descargar y abrir diapositivas</span>
        </a>
      </div>
    );
  }

  // 5. VISOR ADAPTATIVO DE PDF (.pdf)
  const shouldUseMobileViewer =
    userViewerMode === 'MOBILE' || (userViewerMode === 'AUTO' && isMobileDevice);

  if (shouldUseMobileViewer) {
    return (
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Toggle para cambiar a visor nativo si el usuario está en PC o lo desea */}
        {!isMobileDevice && (
          <div className="absolute top-2 right-2 z-40">
            <button
              type="button"
              onClick={() => setUserViewerMode('DESKTOP')}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-[10.5px] font-bold border border-slate-700 shadow-md cursor-pointer transition-colors"
            >
              🖥️ Cambiar a visor nativo PC
            </button>
          </div>
        )}
        <MobilePdfViewer fileUrl={fileUrl} fileName={fileName} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <iframe
        src={`/api/pdf-stream?url=${encodeURIComponent(fileUrl)}#toolbar=1&navpanes=0&view=FitH`}
        className="w-full h-full border-0 bg-white dark:bg-slate-900 rounded-xl"
        title={fileName || 'Documento PDF'}
      />
    </div>
  );
};

export default UniversalDocViewer;
