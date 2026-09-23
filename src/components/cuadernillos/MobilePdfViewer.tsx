// src/components/cuadernillos/MobilePdfViewer.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MobilePdfViewerProps {
  fileUrl: string;
  fileName?: string;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Subcomponente de Página Individual con ciclo de vida aislado
const PdfPageItem: React.FC<{
  pdfDoc: any;
  pageNum: number;
  scale: number;
  total: number;
}> = ({ pdfDoc, pageNum, scale, total }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function drawPage() {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const defaultViewport = page.getViewport({ scale: 1 });
        const ratio = defaultViewport.height / defaultViewport.width;
        setAspectRatio(ratio);

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Calcular ancho disponible
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
        const baseWidth = Math.min(screenWidth - 24, 760);
        const targetWidth = baseWidth * scale;
        const computedScale = targetWidth / defaultViewport.width;

        const viewport = page.getViewport({ scale: computedScale });
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Aviso renderizando página ${pageNum}:`, err);
        }
      }
    }

    drawPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700/70 my-2 max-w-full"
      style={{ minHeight: isRendered ? 'auto' : '400px' }}
    >
      {!isRendered && (
        <div
          style={{ width: '100%', minWidth: '280px', aspectRatio: `1 / ${aspectRatio}` }}
          className="flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-6"
        >
          <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-[11px] font-bold">Cargando página {pageNum} de {total}...</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full block bg-white transition-opacity duration-200 ${
          isRendered ? 'opacity-100' : 'opacity-0 absolute'
        }`}
      />
      <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black rounded-lg pointer-events-none shadow-md">
        {pageNum} / {total}
      </div>
    </div>
  );
};

export const MobilePdfViewer: React.FC<MobilePdfViewerProps> = ({ fileUrl, fileName }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});

  // 1. Cargar la librería Mozilla PDF.js dinámicamente
  const loadPdfJsScript = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('No se pudo inicializar pdfjsLib'));
        }
      };
      script.onerror = () => reject(new Error('Error al cargar motor de PDF'));
      document.head.appendChild(script);
    });
  }, []);

  // 2. Cargar documento PDF
  useEffect(() => {
    let isCancelled = false;

    async function initPdf() {
      if (!fileUrl) return;

      try {
        setIsLoading(true);
        setError(null);

        const pdfjs = await loadPdfJsScript();
        const streamUrl = `/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`;

        const loadingTask = pdfjs.getDocument({
          url: streamUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('❌ Error cargando PDF en móvil:', err);
          setError('No se pudo procesar el documento PDF.');
          setIsLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, loadPdfJsScript]);

  // 3. Detectar página visible en el scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current || numPages === 0) return;
    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    for (let i = 1; i <= numPages; i++) {
      const pageEl = pageRefs.current[i];
      if (pageEl) {
        const offsetTop = pageEl.offsetTop - container.offsetTop;
        const height = pageEl.offsetHeight;
        if (offsetTop <= containerTop + containerHeight / 3 && offsetTop + height > containerTop) {
          setCurrentPage(i);
          break;
        }
      }
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.75));
  const handleResetZoom = () => setScale(1.0);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[460px] w-full select-none">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-blue-500/20" />
        <p className="text-sm font-black text-white tracking-wide">
          Cargando cuadernillo completo...
        </p>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Preparando páginas para lectura continua
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-center w-full min-h-[420px] text-white">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <h4 className="text-sm font-black text-white mb-2">Previsualización Móvil</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">{error}</p>
        <a
          href={`/api/pdf-stream?url=${encodeURIComponent(fileUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
        >
          <span>Abrir enlace directo</span>
        </a>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#1e222d] overflow-hidden select-none">
      {/* Barra Superior con Contador de Página en Vivo y Zoom */}
      <div className="sticky top-0 z-30 w-full px-3.5 py-2 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shadow-lg">
        {/* Indicador de Página en Vivo */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-black tracking-wide">
            Página {currentPage} de {numPages}
          </span>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.75}
            title="Reducir Zoom"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 flex items-center justify-center font-bold text-base transition-colors border border-slate-700"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Restablecer"
            className="px-2 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.0}
            title="Aumentar Zoom"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 flex items-center justify-center font-bold text-base transition-colors border border-slate-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Lectura Continua: Todas las Hojas Apiladas Verticalmente */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 flex flex-col items-center space-y-3 sm:space-y-4 scroll-smooth bg-[#1e222d]"
      >
        {pdfDoc &&
          numPages > 0 &&
          Array.from({ length: numPages }, (_, idx) => idx + 1).map((pNum) => (
            <div
              key={pNum}
              ref={(el) => {
                pageRefs.current[pNum] = el;
              }}
              className="w-full flex justify-center"
            >
              <PdfPageItem
                pdfDoc={pdfDoc}
                pageNum={pNum}
                scale={scale}
                total={numPages}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

