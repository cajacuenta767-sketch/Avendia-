// src/components/admin/AdminSidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export type AdminTab = 'inicio' | 'usuarios' | 'cuadernillos' | 'recursos';
interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange, onLogout }) => {
  const resolveAdminName = (parsed: any): string => {
    const email = (parsed?.email || '').toLowerCase();
    if (email === 'cajacuenta767@gmail.com' || email === 'cajacuenta767') {
      return 'Bryan';
    }
    return parsed?.name || parsed?.usuario || 'Administrador';
  };

  const [adminUser, setAdminUser] = useState<{ name: string; email: string; role: string }>(() => {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          const email = (parsed.email || '').toLowerCase();
          const superList = ['cajacuenta767@gmail.com', 'avendoficial@gmail.com', 'avendocente@gmail.com', 'cajacuenta767', 'avendoficial', 'avendocente'];
          const isSuper = superList.includes(email);
          const finalName = resolveAdminName(parsed);

          // Si el nombre guardado era el antiguo, actualizar el storage
          if (parsed.name !== finalName) {
            parsed.name = finalName;
            localStorage.setItem('admin_auth_session', JSON.stringify(parsed));
          }

          return {
            name: finalName,
            email: parsed.email || '',
            role: isSuper ? 'SUPERADMINISTRADOR' : (parsed.role || 'ADMINISTRADOR'),
          };
        } catch {}
      }
    }
    return {
      name: 'Administrador',
      email: '',
      role: 'ADMINISTRADOR',
    };
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [permissions, setPermissions] = useState({
    permisoUsuarios: true,
    permisoCuadernillos: true,
    permisoRecursos: true,
    permisoMetricas: true,
  });

  useEffect(() => {
    const updateSession = () => {
      const sessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          const email = (parsed.email || '').toLowerCase();
          const superList = ['cajacuenta767@gmail.com', 'avendocente@gmail.com', 'cajacuenta767', 'avendocente'];
          const isSuper = superList.includes(email);
          const finalName = resolveAdminName(parsed);

          if (parsed.name !== finalName) {
            parsed.name = finalName;
            localStorage.setItem('admin_auth_session', JSON.stringify(parsed));
          }

          setAdminUser({
            name: finalName,
            email: parsed.email || '',
            role: isSuper ? 'SUPERADMINISTRADOR' : (parsed.role || 'ADMINISTRADOR'),
          });
          if (isSuper) {
            setPermissions({
              permisoUsuarios: true,
              permisoCuadernillos: true,
              permisoRecursos: true,
              permisoMetricas: true,
            });
          } else {
            setPermissions({
              permisoUsuarios: parsed.permisoUsuarios ?? true,
              permisoCuadernillos: parsed.permisoCuadernillos ?? true,
              permisoRecursos: parsed.permisoRecursos ?? true,
              permisoMetricas: parsed.permisoMetricas ?? true,
            });
          }
        } catch {}
      }
    };

    updateSession();
    window.addEventListener('admin_session_change', updateSession);
    return () => window.removeEventListener('admin_session_change', updateSession);
  }, []);

  const initials = adminUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSelectTab = (tab: AdminTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const handleVerComoDocente = () => {
    try {
      let currentName = adminUser.name;
      let currentEmail = adminUser.email;

      const rawSession = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession);
          if (parsed.name) currentName = parsed.name;
          if (parsed.email) currentEmail = parsed.email;
        } catch {}
      }

      localStorage.setItem(
        'docente_session',
        JSON.stringify({
          id: 'admin-preview-session',
          nombre: currentName,
          email: currentEmail,
          fechaFin: '2099-12-31',
        })
      );
      window.dispatchEvent(new Event('docente_session_change'));
    } catch {}
  };

  return (
    <>
      {/* HEADER MOBILE (< lg) */}
      <header className="lg:hidden w-full bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
            AE
          </div>
          <div>
            <h1 className="font-black text-xs tracking-tight leading-none text-white">
              AVEND ESCALA
            </h1>
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
              PANEL ADMIN
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* DROPDOWN MENU MOBILE (< lg) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-3 sticky top-[53px] z-40 animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectTab('inicio')}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'inicio' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('usuarios')}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Usuarios</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('cuadernillos')}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'cuadernillos' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Cuadernillos</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('recursos')}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'recursos' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Recursos</span>
            </button>

            {/* Ver como docente en menú desplegable móvil */}
            <Link
              href="/cuadernillos"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleVerComoDocente();
              }}
              className="col-span-2 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-300 bg-blue-950/60 border border-blue-800/60 transition-all hover:bg-blue-900/60 cursor-pointer"
            >
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Ver como docente</span>
            </Link>
          </nav>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs">
                {initials}
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[150px]">{adminUser.name}</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR DESKTOP (lg:) */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 left-0 bg-slate-900 text-white flex-col justify-between p-5 shrink-0 z-40">
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
            {permissions.permisoUsuarios ? (
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
            ) : (
              <div
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-900/50 cursor-not-allowed opacity-60"
                title="Módulo 1: Gestión de Usuarios bloqueado para tu perfil"
              >
                <div className="flex items-center space-x-3">
                  <span>🔒</span>
                  <span className="line-through">Usuarios</span>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-500">Sin Permiso</span>
              </div>
            )}

            {/* Banco de cuadernillos */}
            {permissions.permisoCuadernillos ? (
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
            ) : (
              <div
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-900/50 cursor-not-allowed opacity-60"
                title="Módulo 2: Banco de Cuadernillos bloqueado para tu perfil"
              >
                <div className="flex items-center space-x-3">
                  <span>🔒</span>
                  <span className="line-through">Cuadernillos</span>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-500">Sin Permiso</span>
              </div>
            )}

            {/* Recursos */}
            {permissions.permisoRecursos ? (
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
            ) : (
              <div
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-900/50 cursor-not-allowed opacity-60"
                title="Módulo 3: Recursos Didácticos bloqueado para tu perfil"
              >
                <div className="flex items-center space-x-3">
                  <span>🔒</span>
                  <span className="line-through">Recursos</span>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-500">Sin Permiso</span>
              </div>
            )}

            {/* Ver como docente */}
            <Link
              href="/cuadernillos"
              onClick={handleVerComoDocente}
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

        {/* Bloque inferior dinámico con perfil de usuario conectado y Cerrar Sesión */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
              {initials}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{adminUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{adminUser.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-950/60 border border-rose-900/40 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
