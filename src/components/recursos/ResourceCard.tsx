// src/components/recursos/ResourceCard.tsx
'use client';

import React, { useState } from 'react';
import { ColorTheme, Recurso } from '@/types/recurso';

interface ResourceCardProps {
  recurso: Recurso;
  onOpenPdf: (recurso: Recurso) => void;
}

const THEME_STYLES: Record<
  ColorTheme,
  {
    headerBg: string;
    cardBorder: string;
    badgeBg: string;
    badgeText: string;
    btnBg: string;
    btnText: string;
    btnHoverBg: string;
  }
> = {
  purple: {
    headerBg: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    cardBorder: 'hover:border-purple-300 dark:hover:border-purple-800',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/70',
    badgeText: 'text-purple-700 dark:text-purple-300',
    btnBg: 'bg-purple-50 dark:bg-purple-950/60',
    btnText: 'text-purple-700 dark:text-purple-200',
    btnHoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/60',
  },
  emerald: {
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    cardBorder: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    btnBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    btnText: 'text-emerald-700 dark:text-emerald-200',
    btnHoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
  },
  blue: {
    headerBg: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    cardBorder: 'hover:border-blue-300 dark:hover:border-blue-800',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
    badgeText: 'text-blue-700 dark:text-blue-300',
    btnBg: 'bg-blue-50 dark:bg-blue-950/60',
    btnText: 'text-blue-700 dark:text-blue-200',
    btnHoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/60',
  },
  amber: {
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    cardBorder: 'hover:border-amber-300 dark:hover:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    btnBg: 'bg-amber-50 dark:bg-amber-950/60',
    btnText: 'text-amber-800 dark:text-amber-200',
    btnHoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/60',
  },
  indigo: {
    headerBg: 'bg-gradient-to-r from-indigo-600 to-blue-600',
    cardBorder: 'hover:border-indigo-300 dark:hover:border-indigo-800',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    btnBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    btnText: 'text-indigo-700 dark:text-indigo-200',
    btnHoverBg: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
  },
  rose: {
    headerBg: 'bg-gradient-to-r from-rose-600 to-pink-600',
    cardBorder: 'hover:border-rose-300 dark:hover:border-rose-800',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
    badgeText: 'text-rose-700 dark:text-rose-300',
    btnBg: 'bg-rose-50 dark:bg-rose-950/60',
    btnText: 'text-rose-700 dark:text-rose-200',
    btnHoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-900/60',
  },
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ recurso, onOpenPdf }) => {
  const [imageError, setImageError] = useState(false);
  const theme = THEME_STYLES[recurso.colorTheme] || THEME_STYLES.purple;
  const numFormatted = String(recurso.numero).padStart(2, '0');

  const resolvedImageUrl = recurso.urlImagen
    ? (recurso.urlImagen.startsWith('data:') || recurso.urlImagen.startsWith('http')
        ? recurso.urlImagen
        : `/api/pdf-stream?url=${encodeURIComponent(recurso.urlImagen)}`)
    : undefined;

  const hasValidImage = Boolean(resolvedImageUrl) && !imageError;

  return (
    <article
      className={`group relative flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${theme.cardBorder}`}
    >
      {/* 1. Cabecera con Miniatura Visual (Imagen Subida o Formato Automático AVEND ESCALA) */}
      {hasValidImage ? (
        <div className="relative w-full h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={resolvedImageUrl}
            alt={recurso.titulo}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute top-3 left-3 text-[10px] font-black uppercase text-white bg-slate-900/70 backdrop-blur-xs px-2.5 py-1 rounded-full tracking-wider">
            RECURSO #{numFormatted}
          </span>
        </div>
      ) : (
        <div className={`relative w-full h-36 ${theme.headerBg} flex flex-col justify-between p-4 overflow-hidden`}>
          {/* Fondo vectorial estilizado AVEND */}
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xs pointer-events-none" />

          <div className="flex items-center justify-between text-white/90 z-10">
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/20">
              RECURSO #{numFormatted}
            </span>
            <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-widest">AVEND</span>
          </div>

          <div className="flex items-center justify-center z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xs">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          <div className="flex justify-end z-10">
            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">AVEND ESCALA</span>
          </div>
        </div>
      )}

      {/* 2. Cuerpo de la Tarjeta */}
      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Fila de Badges */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {recurso.categoriaLabel}
            </span>

            <div className="flex items-center space-x-1.5">
              {recurso.isPopular && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  🔥 Destacado
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
                {recurso.paginas} págs
              </span>
            </div>
          </div>

          {/* Título Principal */}
          <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {recurso.titulo}
          </h3>

          {/* Descripción Corta */}
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {recurso.descripcion}
          </p>
        </div>

        {/* 3. Botón de Acción Principal */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            disabled={!recurso.urlPdf}
            onClick={() => recurso.urlPdf && onOpenPdf(recurso)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl ${
              recurso.urlPdf
                ? `${theme.btnBg} ${theme.btnText} ${theme.btnHoverBg} cursor-pointer`
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
            } text-xs font-bold transition-all border border-gray-200/50 dark:border-gray-800`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{recurso.urlPdf ? 'VER RECURSO' : 'PDF NO DISPONIBLE'}</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 dark:bg-black/30 shadow-xs">
              PDF
            </span>
          </button>
        </div>
      </div>
    </article>
  );
};
