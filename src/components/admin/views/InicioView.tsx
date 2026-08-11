// src/components/admin/views/InicioView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardStatsAction, DashboardStats } from '@/services/dashboardService';

interface InicioViewProps {
  onNavigateTab: (tab: 'usuarios' | 'cuadernillos' | 'recursos') => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    accesosActivos: 0,
    proximosAVencer: 0,
    accesosVencidos: 0,
    totalRecursos: 0,
    totalCuadernillos: 0,
  });

  const [loading, setLoading] = useState(true);
  const [permisoMetricas, setPermisoMetricas] = useState(true);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('es-PE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadStats() {
      const res = await getDashboardStatsAction();
      if (res.success) {
        setStats(res.data);
      }
      setLoading(false);
    }

    const sessionStr = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session')) : null;
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed.role && parsed.role.toUpperCase().includes('SUPER')) {
          setPermisoMetricas(true);
        } else {
          setPermisoMetricas(parsed.permisoMetricas ?? true);
        }
      } catch {}
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Saludo Banner con Reloj en Tiempo Real y Fecha Actual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-2xs">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            SISTEMA DE GESTIÓN Y TRAZABILIDAD AVEND
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            ¡Bienvenido de nuevo, Administrador!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen general de actividad, licencias y materiales cargados en AVEND ESCALA.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-indigo-50/70 dark:bg-slate-800 p-3.5 rounded-2xl border border-indigo-100 dark:border-slate-700 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block tracking-wide font-mono">
              ⏰ {currentTime || 'Cargando hora...'}
            </span>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 capitalize block">
              📅 {currentDate || 'Cargando fecha...'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas Top (Controladas por Módulo 4: permisoMetricas) */}
      {!permisoMetricas ? (
        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center space-x-3">
          <span className="text-2xl">🔒</span>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
              Muestras e Indicadores SaaS Bloqueados
            </h4>
            <p className="text-[11px] text-slate-500">
              Tu perfil de Administrador no cuenta con permisos para el Módulo 4 (Visualización de Métricas e Indicadores). Contacta al Superadministrador.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: USUARIOS REGISTRADOS */}
          <div
            onClick={() => onNavigateTab('usuarios')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 hover:border-blue-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                USUARIOS REGISTRADOS
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : stats.totalUsuarios}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Docentes inscritos en plataforma</p>
          </div>

          {/* Card 2: ACCESOS ACTIVOS */}
          <div
            onClick={() => onNavigateTab('usuarios')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                ACCESOS ACTIVOS
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : stats.accesosActivos}
            </div>
            <p className="text-[11px] text-emerald-600 font-bold">Licencias PREMIUM vigentes</p>
          </div>

          {/* Card 3: PRÓXIMOS A VENCER */}
          <div
            onClick={() => onNavigateTab('usuarios')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                PRÓXIMOS A VENCER
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? '...' : stats.proximosAVencer}
            </div>
            <p className="text-[11px] text-amber-600 font-bold">Vencen en los próximos 7 días</p>
          </div>

          {/* Card 4: ACCESOS VENCIDOS */}
          <div
            onClick={() => onNavigateTab('usuarios')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                ACCESOS VENCIDOS
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-slate-800 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {loading ? '...' : stats.accesosVencidos}
            </div>
            <p className="text-[11px] text-rose-600 font-bold">Suscripciones caducadas</p>
          </div>
        </div>
      )}

      {/* Accesos Directos Inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div
          onClick={() => onNavigateTab('usuarios')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 flex items-center justify-center font-bold">
            👤
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Gestionar Docentes</h3>
          <p className="text-xs text-slate-500">Registra nuevos docentes, actualiza fechas de vigencia y administra licencias.</p>
          <div className="text-xs font-bold text-blue-600 flex items-center space-x-1">
            <span>Ir a Usuarios</span>
            <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('cuadernillos')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 flex items-center justify-center font-bold">
            📄
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Banco de Cuadernillos</h3>
          <p className="text-xs text-slate-500">Publica nuevos exámenes MINEDU con solucionarios y claves oficiales.</p>
          <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1">
            <span>Ir a Cuadernillos</span>
            <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('recursos')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 flex items-center justify-center font-bold">
            💡
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Recursos Didácticos</h3>
          <p className="text-xs text-slate-500">Sube fichas descargables, nemotecnias y resúmenes pedagógicos.</p>
          <div className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
            <span>Ir a Recursos</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
};
