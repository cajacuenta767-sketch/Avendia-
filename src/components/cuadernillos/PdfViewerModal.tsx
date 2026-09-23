// src/components/cuadernillos/PdfViewerModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Evaluacion } from '@/types/evaluacion';
import { formatEvaluationTitle } from '@/lib/evaluationPresentation';
import { UniversalDocViewer } from './UniversalDocViewer';
import { checkDocenteSpecialtyAccess, getAccountStateFromSession } from '@/utils/badgeUtils';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluacion: Evaluacion | null;
  resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES' | null;
  directPdfUrl?: string;
}

const RESOURCE_TITLES: Record<string, { label: string; badgeBg: string; badgeText: string }> = {
  CUADERNILLO: {
    label: 'Cuadernillo de Evaluación',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  RESOLUCION: {
    label: 'Resolución Explicada',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  CLAVES: {
    label: 'Tabla de Claves Oficiales',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
  },
};

// Función para verificar si el docente actual puede descargar la resolución
const checkCanDownloadResolution = (
  evaluacion: Evaluacion | null,
  resourceType: string | null
): boolean => {
  if (!evaluacion) return false;

  // 1. Cuadernillos y Claves MINEDU son siempre descargables
  if (resourceType !== 'RESOLUCION') return true;

  // 2. Resoluciones oficiales MINEDU son siempre descargables
  if (String(evaluacion.resources?.origenResolucion || 'AVEND').toUpperCase() === 'MINEDU') {
    return true;
  }

  // 3. Cargos Directivos son siempre descargables
  if (evaluacion.proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
    return true;
  }

  // 4. Administrador tiene acceso total
  const adminSession = typeof window !== 'undefined'
    ? localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session')
    : null;
  if (adminSession) return true;

  // 5. Docente: validar sesión y coincidencia de especialidad mediante motor unificado
  const docenteSessionStr = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
  if (!docenteSessionStr) return false;

  try {
    const session = JSON.parse(docenteSessionStr);
    if (!session || !session.id) return false;

    if (getAccountStateFromSession(session) !== 'ACTIVA') {
      return false;
    }

    return checkDocenteSpecialtyAccess(session, evaluacion).hasAccess;
  } catch {
    return false;
  }
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  evaluacion,
  resourceType,
  directPdfUrl,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Formateador de URL
  const formatPdfUrl = useCallback((url?: string): string => {
    if (!url || !url.trim()) {
      return '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf';
    }
    const clean = url.trim();
    if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    let formatted = clean.replace(/^\/?public\//i, '/');
    if (!formatted.startsWith('/')) {
      formatted = '/' + formatted;
    }
    return formatted;
  }, []);

  const rawKey = directPdfUrl || (
    resourceType === 'CUADERNILLO'
      ? evaluacion?.resources?.cuadernilloKey
      : resourceType === 'RESOLUCION'
      ? evaluacion?.resources?.resolucionKey
      : evaluacion?.resources?.clavesKey
  );

  const previewPdfUrl = formatPdfUrl(rawKey);

  // Determinar permisos de descarga
  const canDownload = checkCanDownloadResolution(evaluacion, resourceType);

  // Datos de usuario para autorización en API de descarga
  const docenteSessionStr = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
  let userEmailParam = '';
  if (docenteSessionStr) {
    try {
      const parsedSession = JSON.parse(docenteSessionStr);
      if (parsedSession?.email) {
        userEmailParam = `&userEmail=${encodeURIComponent(parsedSession.email)}`;
      }
    } catch {}
  }
  const adminSessionStr = typeof window !== 'undefined' ? localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session') : null;
  const adminAuthParam = adminSessionStr ? '&isAdmin=true' : '';

  const displayTitle = formatEvaluationTitle(evaluacion?.titulo) || 'Evaluación MINEDU';
  const pdfDownloadEndpointUrl = `/api/pdf-download?url=${encodeURIComponent(previewPdfUrl)}&name=${encodeURIComponent(displayTitle)}&resourceType=${encodeURIComponent(resourceType || 'CUADERNILLO')}&evalId=${encodeURIComponent(evaluacion?.id || '')}${userEmailParam}${adminAuthParam}`;

  useEffect(() => {
    const maxAge = 10 * 365 * 24 * 60 * 60;
    const adminSession = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    const docenteSession = localStorage.getItem('docente_session');
    if (adminSession) {
      document.cookie = `admin_auth_session=${encodeURIComponent(adminSession)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    if (docenteSession) {
      document.cookie = `docente_session=${encodeURIComponent(docenteSession)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || (!evaluacion && !directPdfUrl)) {
    return null;
  }

  const isRecursoGenerico = evaluacion?.mineduCode?.startsWith('MINEDU-REC') || false;
  const defaultMeta = (resourceType && RESOURCE_TITLES[resourceType]) || RESOURCE_TITLES.CUADERNILLO;
  
  const meta = isRecursoGenerico
    ? {
        label: 'RECURSO PEDAGÓGICO',
        badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
        badgeText: 'text-purple-700 dark:text-purple-300',
      }
    : defaultMeta;

  const rawTitle = displayTitle;
  const cleanTitle = rawTitle
    .replace(/\s*-\s*NO_APLICA/gi, '')
    .replace(/\s*NO_APLICA/gi, '')
    .replace(/\s*-\s*No Aplica/gi, '')
    .replace(/\s*No Aplica/gi, '')
    .replace(/\s*-\s*undefined/gi, '')
    .replace(/\s*undefined/gi, '')
    .replace(/\s*-\s*null/gi, '')
    .replace(/\s*null/gi, '')
    .replace(/\s*-\s*—/g, '')
    .replace(/\s*—\s*/g, ' ')
    .replace(/\s+-\s*$/, '')
    .trim() || 'Evaluación MINEDU';

  const handleDownload = () => {
    if (!canDownload) return;
    const link = document.createElement('a');
    link.href = pdfDownloadEndpointUrl;
    link.download = `${cleanTitle.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = async () => {
    if (!canDownload) return;
    setIsPrinting(true);

    try {
      const streamUrl = `/api/pdf-stream?url=${encodeURIComponent(previewPdfUrl)}`;

      // 1. Obtener Blob PDF puro para evitar que el navegador imprima el viewport HTML
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error('Error al obtener stream del PDF');
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);

      // 2. Limpiar iframe de impresión anterior si existiera
      const oldIframe = document.getElementById('pdf-print-hidden-iframe');
      if (oldIframe) oldIframe.remove();

      // 3. Crear iframe con el Blob URL del PDF puro
      const printIframe = document.createElement('iframe');
      printIframe.id = 'pdf-print-hidden-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      printIframe.style.width = '1px';
      printIframe.style.height = '1px';
      printIframe.style.opacity = '0';
      printIframe.src = blobUrl;

      printIframe.onload = () => {
        setIsPrinting(false);
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.open(blobUrl, '_blank');
        }
      };

      document.body.appendChild(printIframe);

      setTimeout(() => {
        setIsPrinting(false);
      }, 4000);
    } catch {
      setIsPrinting(false);
      window.open(`/api/pdf-stream?url=${encodeURIComponent(previewPdfUrl)}`, '_blank');
    }
  };

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Contenedor Principal Modal */}
      <div
        className={`responsive-modal-panel bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[92dvh] sm:h-[92vh]'
        }`}
      >
        
        {/* 1. Cabecera Compacta */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 gap-3 no-print">
          <div className="flex items-center space-x-3 min-w-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${meta.badgeBg} ${meta.badgeText}`}>
              {meta.label}
            </span>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md md:max-w-xl" title={cleanTitle}>
              {cleanTitle}
            </h3>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Alternar Pantalla Completa */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restaurar tamaño' : 'Maximizar'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0M4 4l0 5m11-1l5 5m0 0l-5 0m5 0l0-5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              title="Cerrar (ESC)"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Cuerpo del Visor Universal en Vivo */}
        <div id="pdf-viewer-print-container" className="relative flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-0 sm:p-3">
          <div className="w-full max-w-5xl h-full rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <UniversalDocViewer fileUrl={previewPdfUrl} fileName={cleanTitle} />
          </div>
        </div>

        {/* 3. Pie del Visor y Botón de Descarga Condicional */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {meta.label}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Concurso {evaluacion?.anio || '2025'}
              </span>
            </div>
            {resourceType === 'RESOLUCION' ? (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                🔒 Recurso exclusivo de AVEND ESCALA. Prohibida su reventa, reproducción y distribución no autorizada.
              </p>
            ) : (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                📄 Documento oficial del MINEDU. AVEND ESCALA facilita su visualización y descarga.
              </p>
            )}
          </div>

          {canDownload ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Imprimir documento original en alta resolución"
              >
                {isPrinting ? (
                  <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                )}
                <span>{isPrinting ? 'PREPARANDO...' : 'IMPRIMIR'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>
                  {(() => {
                    const clean = previewPdfUrl.toLowerCase().split('?')[0];
                    if (clean.endsWith('.xlsx') || clean.endsWith('.xls') || clean.endsWith('.csv')) return 'DESCARGAR EXCEL';
                    if (clean.endsWith('.pptx') || clean.endsWith('.ppt')) return 'DESCARGAR POWERPOINT';
                    if (clean.endsWith('.docx') || clean.endsWith('.doc')) return 'DESCARGAR WORD';
                    if (clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.webp')) return 'DESCARGAR IMAGEN';
                    return resourceType === 'RESOLUCION' ? 'DESCARGAR RESOLUCIÓN' : 'DESCARGAR PDF';
                  })()}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                disabled
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center space-x-2 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                title="Descarga disponible únicamente para docentes registrados en esta especialidad"
              >
                <span>🔒</span>
                <span>DESCARGA RESTRINGIDA A TU ESPECIALIDAD</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PdfViewerModal;
