// src/components/recursos/ResourceCard.tsx
'use client';

import React from 'react';
import { ColorTheme, Recurso } from '@/types/recurso';

interface ResourceCardProps {
  recurso: Recurso;
  onOpenPdf: (recurso: Recurso) => void;
}

// Mapa de temas de color Tailwind CSS (fondos pastel y acentos)
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
  const theme = THEME_STYLES[recurso.colorTheme] || THEME_STYLES.purple;
  const numFormatted = String(recurso.numero).padStart(2, '0');

  return (
    <article
      className={`group relative flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${theme.cardBorder}`}
    >
      {/* 1. Franja Superior de Color Temático */}
      <div className={`h-3 w-full ${theme.headerBg}`} />

      {/* 2. Cuerpo de la Tarjeta */}
      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Fila de Badges */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wider uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              RECURSO #{numFormatted}
            </span>

            <div className="flex items-center space-x-2">
              {recurso.isPopular && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  🔥 Destacado
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
                {recurso.paginas} págs
              </span>
            </div>
          </div>

          {/* Título Principal */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {recurso.titulo}
          </h3>

          {/* Descripción Corta */}
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {recurso.descripcion}
          </p>

          {/* Categoria Badge */}
          <div className="pt-1">
            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {recurso.categoriaLabel}
            </span>
          </div>
        </div>

        {/* 3. Botón de Acción Principal */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => onOpenPdf(recurso)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl ${theme.btnBg} ${theme.btnText} ${theme.btnHoverBg} text-xs font-bold transition-all border border-gray-200/50 dark:border-gray-800`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>VER FICHA PEDAGÓGICA</span>
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
