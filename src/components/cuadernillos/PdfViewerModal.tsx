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

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, evaluacion, resourceType]);

  if (!isOpen || !evaluacion || !resourceType) {
    return null;
  }

  const meta = RESOURCE_TITLES[resourceType] || RESOURCE_TITLES.CUADERNILLO;

  // Determinar la clave de recurso o ruta del archivo
  const r2Key =
    resourceType === 'CUADERNILLO'
      ? evaluacion.resources.cuadernilloKey
      : resourceType === 'RESOLUCION'
      ? evaluacion.resources.resolucionKey
      : evaluacion.resources.clavesKey;

  // Resolver la ruta limpia del PDF (servida desde /public/uploads/ o URL externa)
  const previewPdfUrl = r2Key
    ? r2Key
    : '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf';

  const handleDownload = () => {
    if (previewPdfUrl) {
      window.open(previewPdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-3 pr-4 truncate">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide shrink-0 ${meta.badgeBg} ${meta.badgeText}`}
            >
              {meta.label}
            </span>
            <div className="truncate">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                {evaluacion.titulo}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Año {evaluacion.anio} · Código: {evaluacion.mineduCode}
              </p>
            </div>
          </div>

          {/* Botones de Acción Superiores */}
          <div className="flex items-center space-x-2 shrink-0">
            {previewPdfUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Descargar PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor de PDF */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
          {isLoading ? (
            /* Estado de Carga */
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Cargando documento PDF...
              </p>
            </div>
          ) : previewPdfUrl ? (
            /* Visor Nativo de PDF con fallback de iframe y objeto */
            <object
              data={previewPdfUrl}
              type="application/pdf"
              className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                title={`Previsualización de ${evaluacion.titulo}`}
              >
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Tu navegador no soporta la previsualización directa del documento.
                  </p>
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Abrir o Descargar PDF
                  </a>
                </div>
              </iframe>
            </object>
          ) : (
            /* Estado de Recurso No Disponible */
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3 max-w-md">
              <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Documento no disponible
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                El archivo de {meta.label.toLowerCase()} no se encuentra disponible.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
