// src/components/admin/AdminHeader.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getNotificacionesAdminAction,
  marcarNotificacionLeidaAction,
  marcarTodasNotificacionesLeidasAction,
  eliminarNotificacionAction,
} from '@/services/notificacionesService';
import { useRouter } from 'next/navigation';

export const AdminHeader: React.FC = () => {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotificaciones = async () => {
    try {
      const res = await getNotificacionesAdminAction();
      if (res.success && res.data) {
        setNotificaciones(res.data.notificaciones);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('⚠️ [AdminHeader] Error al cargar notificaciones:', err);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 25000); // Polling cada 25s
    const handleRefresh = () => fetchNotificaciones();
    window.addEventListener('admin_notif_refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('admin_notif_refresh', handleRefresh);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarcarTodas = async () => {
    setIsLoading(true);
    await marcarTodasNotificacionesLeidasAction();
    await fetchNotificaciones();
    setIsLoading(false);
  };

  const handleMarcarLeida = async (id: string) => {
    await marcarNotificacionLeidaAction(id);
    await fetchNotificaciones();
  };

  const handleEliminar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await eliminarNotificacionAction(id);
    await fetchNotificaciones();
  };

  const handleIrACargarPdf = (notif: any) => {
    handleMarcarLeida(notif.id);
    setIsOpen(false);
    const searchTerm = notif.codigo || notif.area || notif.titulo || '';
    router.push(`/admin?tab=cuadernillos&search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs sticky top-0 z-40">
      {/* Título de Sección */}
      <div className="flex items-center space-x-3">
        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Panel de Control
        </span>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold border border-blue-200 dark:border-blue-800">
          AVEND ESCALA
        </span>
      </div>

      {/* Acciones de Cabecera (Campana de Notificaciones) */}
      <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
        {/* Botón de Campana */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-inner focus:outline-hidden"
          title="Notificaciones de material solicitado por docentes"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {/* Badge Contador Rojo */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panel Desplegable de Notificaciones */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] max-w-96 max-h-[min(500px,calc(100dvh-5rem))] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header del Dropdown */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">Alertas de Material</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold border border-rose-200 dark:border-rose-800">
                    {unreadCount} pendientes
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarcarTodas}
                  disabled={isLoading}
                  className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Marcar todas
                </button>
              )}
            </div>

            {/* Listado de Alertas */}
            <div className="overflow-y-auto p-3 space-y-2 flex-1 max-h-[380px]">
              {notificaciones.length === 0 ? (
                <div className="py-10 text-center space-y-2 text-slate-400">
                  <div className="text-3xl">🎉</div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay alertas de material pendientes</p>
                  <p className="text-[10px] text-slate-400">Todo el contenido solicitado se encuentra al día.</p>
                </div>
              ) : (
                notificaciones.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      !n.leido
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 shadow-2xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">⚠️</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {n.titulo}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                      {n.mensaje}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <span className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                        👤 {n.docenteNombre || n.docenteEmail}
                      </span>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleIrACargarPdf(n)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-extrabold shadow-xs transition-colors cursor-pointer"
                        >
                          Cargar PDF
                        </button>
                        {!n.leido ? (
                          <button
                            type="button"
                            onClick={() => handleMarcarLeida(n.id)}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                            title="Marcar como leída"
                          >
                            ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleEliminar(n.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg text-[10px] cursor-pointer"
                            title="Eliminar notificación"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
