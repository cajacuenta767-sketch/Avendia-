// src/components/common/Navbar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

function getInitials(name: string): string {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Modal Mi Perfil
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);

  const [docenteSession, setDocenteSession] = useState<{
    id?: string;
    nombre: string;
    email: string;
    fechaFin?: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkSession = () => {
    try {
      const raw = localStorage.getItem('docente_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email || parsed.id || parsed.nombre)) {
          setDocenteSession(parsed);
          return;
        }
      }
      setDocenteSession(null);
    } catch {
      setDocenteSession(null);
    }
  };

  useEffect(() => {
    checkSession();
    setMounted(true);

    window.addEventListener('storage', checkSession);
    window.addEventListener('docente_session_change', checkSession);
    return () => {
      window.removeEventListener('storage', checkSession);
      window.removeEventListener('docente_session_change', checkSession);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (e: React.MouseEvent, targetPath: string) => {
    if (!docenteSession) {
      e.preventDefault();
      if (pathname === '/') {
        const loginEl = document.getElementById('login-form');
        if (loginEl) {
          loginEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      router.push('/#login-form');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('docente_session');
    setDocenteSession(null);
    setProfileDropdownOpen(false);
    window.dispatchEvent(new Event('docente_session_change'));
    router.push('/');
  };

  const isHomePage = pathname === '/';

  const [profileRegion, setProfileRegion] = useState('');
  const [profileIE, setProfileIE] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isPerfilModalOpen && docenteSession) {
      setProfileRegion((docenteSession as any).region || 'Lima');
      setProfileIE((docenteSession as any).institucionEducativa || '');
      setSaveSuccess(false);
    }
  }, [isPerfilModalOpen, docenteSession]);

  const handleSaveProfile = () => {
    if (!docenteSession) return;
    setIsSavingProfile(true);
    const updated = {
      ...docenteSession,
      region: profileRegion,
      institucionEducativa: profileIE,
    };
    localStorage.setItem('docente_session', JSON.stringify(updated));
    setDocenteSession(updated);
    window.dispatchEvent(new Event('docente_session_change'));
    setIsSavingProfile(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsPerfilModalOpen(false);
    }, 600);
  };

  const REGIONES_PERU = [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
    'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
    'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
    'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo oficial */}
        <Logo />

        {/* Navegación Desktop Restringida -> Dirige al Formulario Unico del Inicio */}
        <nav className="hidden md:flex items-center space-x-2">
          <Link
            href="/cuadernillos"
            onClick={(e) => handleNavClick(e, '/cuadernillos')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Banco de Cuadernillos</span>
          </Link>

          <Link
            href="/recursos"
            onClick={(e) => handleNavClick(e, '/recursos')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Recursos Didácticos</span>
          </Link>

          {/* ESTADO Y ACCIONES DE USUARIO */}
          {mounted && !isHomePage && (
            <>
              {!docenteSession ? (
                <button
                  type="button"
                  onClick={() => router.push('/#login-form')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Iniciar Sesión</span>
                </button>
              ) : (
                /* DROPDOWN ESTILIZADO DE USUARIO */
                <div className="relative ml-2" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                      {getInitials(docenteSession.nombre)}
                    </div>

                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                      SUSCRIPCIÓN PREMIUM
                    </span>

                    <svg className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* MENÚ DESPLEGABLE DE USUARIO */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 z-50">
                      {/* Cabecera de Identidad */}
                      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 mb-1.5">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                          {docenteSession.nombre}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono truncate">
                          {docenteSession.email}
                        </p>

                        <div className="pt-1">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>SUSCRIPCIÓN PREMIUM</span>
                          </span>
                        </div>
                      </div>

                      {/* Acciones de Cuenta */}
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setIsPerfilModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Mi Perfil</span>
                        </button>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left group cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-rose-500 group-hover:text-rose-700 dark:text-rose-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Botón Menú Mobile */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            <Link
              href="/cuadernillos"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleNavClick(e, '/cuadernillos');
              }}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Banco de Cuadernillos</span>
            </Link>

            <Link
              href="/recursos"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleNavClick(e, '/recursos');
              }}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Recursos Didácticos</span>
            </Link>
          </div>

          {docenteSession ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{docenteSession.nombre}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{docenteSession.email}</p>
                </div>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  PREMIUM
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsPerfilModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
                >
                  Mi Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/#login-form');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL MI PERFIL VIA PORTAL REDISEÑADO CON REGION E INSTITUCION EDUCATIVA */}
      {mounted && isPerfilModalOpen && docenteSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Perfil del Docente</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsPerfilModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 text-center animate-in fade-in">
                ✓ ¡Datos de perfil guardados correctamente!
              </div>
            )}

            <div className="space-y-3">
              {/* 1. Nombre Completo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Nombre Completo
                </span>
                <p className="font-black text-xs text-slate-900 dark:text-white">
                  {docenteSession.nombre}
                </p>
              </div>

              {/* 2. Correo Electrónico */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Correo Electrónico
                </span>
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {docenteSession.email}
                </p>
              </div>

              {/* 3. NUEVO CAMPO: Región (Desplegable) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
                  Región de Procedencia
                </label>
                <select
                  value={profileRegion}
                  onChange={(e) => setProfileRegion(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">-- Seleccionar Región --</option>
                  {REGIONES_PERU.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. NUEVO CAMPO: Institución Educativa (Input Horizontal) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
                  Institución Educativa
                </label>
                <input
                  type="text"
                  value={profileIE}
                  onChange={(e) => setProfileIE(e.target.value)}
                  placeholder="Ej: I.E. 1234 Pedro Paulet"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400"
                />
              </div>

              {/* 5. Estado del Plan */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Estado del Plan
                </span>

                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>SUSCRIPCIÓN PREMIUM</span>
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPerfilModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>{isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
