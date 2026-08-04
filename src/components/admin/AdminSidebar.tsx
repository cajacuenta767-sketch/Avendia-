// src/components/admin/AdminSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export type AdminTab = 'inicio' | 'usuarios' | 'cuadernillos' | 'recursos';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-64 h-screen sticky top-0 left-0 bg-slate-900 text-white flex flex-col justify-between p-5 shrink-0 z-40">
      <div className="space-y-6">
        {/* Header con Logo de marca oficial */}
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md">
            AE
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none text-white">
              AVEND ESCALA
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              PANEL ADMINISTRADOR
            </span>
          </div>
        </div>

        {/* Menú de Navegación Lateral */}
        <nav className="space-y-1">
          {/* Inicio */}
          <button
            type="button"
            onClick={() => onTabChange('inicio')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'inicio'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Inicio</span>
          </button>

          {/* Usuarios */}
          <button
            type="button"
            onClick={() => onTabChange('usuarios')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'usuarios'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Usuarios</span>
          </button>

          {/* Banco de cuadernillos */}
          <button
            type="button"
            onClick={() => onTabChange('cuadernillos')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'cuadernillos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Banco de cuadernillos</span>
          </button>

          {/* Recursos */}
          <button
            type="button"
            onClick={() => onTabChange('recursos')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'recursos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Recursos</span>
          </button>

          {/* Ver como docente */}
          <Link
            href="/cuadernillos"
            className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Ver como docente</span>
          </Link>
        </nav>
      </div>

      {/* Bloque inferior con Avatar Superadministrador */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
            JA
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate">Juan Avend</p>
            <p className="text-[10px] text-slate-400 truncate">Superadministrador</p>
          </div>
        </div>

        <Link
          href="/"
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Salir</span>
        </Link>
      </div>
    </aside>
  );
};
