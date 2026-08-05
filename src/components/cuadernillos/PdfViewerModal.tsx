// src/components/cuadernillos/PdfViewerModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Evaluacion } from '@/types/evaluacion';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluacion: Evaluacion | null;
  resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES' | null;
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

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  evaluacion,
  resourceType,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Detector de tecla ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, evaluacion, resourceType]);

  if (!isOpen || !evaluacion || !resourceType) {
    return null;
  }

  const isRecursoGenerico = evaluacion.mineduCode?.startsWith('MINEDU-REC') || false;
  const defaultMeta = RESOURCE_TITLES[resourceType] || RESOURCE_TITLES.CUADERNILLO;
  
  const meta = isRecursoGenerico
    ? {
        label: 'RECURSO',
        badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
        badgeText: 'text-purple-700 dark:text-purple-300',
      }
    : defaultMeta;

  // Determinar la clave/URL del recurso
  const rawKey =
    resourceType === 'CUADERNILLO'
      ? evaluacion.resources.cuadernilloKey
      : resourceType === 'RESOLUCION'
      ? evaluacion.resources.resolucionKey
      : evaluacion.resources.clavesKey;

  // URL del PDF con fallback a archivo muestra existente
  const previewPdfUrl = rawKey || '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf';

  // Descarga Directa Automática sin abrir nuevas pestañas
  const handleDownload = async () => {
    if (!previewPdfUrl || isDownloading) return;
    setIsDownloading(true);

    const filename = `${(evaluacion.titulo || 'recurso-minedu')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')}.pdf`;

    try {
      const response = await fetch(previewPdfUrl);
      if (!response.ok) throw new Error('Error al descargar');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback nativo directo de descarga
      const link = document.createElement('a');
      link.href = previewPdfUrl;
      link.download = filename;
      link.setAttribute('target', '_self');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center space-x-2 truncate pr-4">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 tracking-wider uppercase bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-800/50">
              {isRecursoGenerico ? 'RECURSOS' : 'EVALUACIÓN'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 font-bold">·</span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {evaluacion.titulo}
            </h3>
          </div>

          {/* Botón de Cierre 'X' */}
          <button
            type="button"
            onClick={onClose}
            title="Cerrar (ESC)"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Visor de PDF (Previsualización Directa Integrada) */}
        <div className="relative flex-1 bg-slate-200/60 dark:bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Cargando previsualización del documento PDF...
              </p>
            </div>
          ) : (
            /* Visualizador Nativo de PDF Integrado */
            <iframe
              src={`${previewPdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner"
              title={`Previsualización de ${evaluacion.titulo}`}
            />
          )}
        </div>

        {/* Pie Inferior del Modal (Información + Botón de Descarga Directa Automática) */}
        <div className="p-3.5 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${meta.badgeBg} ${meta.badgeText}`}>
              {meta.label}
            </span>
            <span>· Año {evaluacion.anio}</span>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>DESCARGANDO...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>DESCARGAR RECURSO</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
