// src/components/common/Navbar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { DocenteAuthModal } from '@/components/auth/DocenteAuthModal';
import { validarAccesoDocenteAction, updateUsuarioAction } from '@/services/usuariosService';

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Modales adicionales
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [nuevoPin, setNuevoPin] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const [docenteSession, setDocenteSession] = useState<{
    id?: string;
    dni: string;
    nombre: string;
    email?: string;
    fechaFin?: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkSession = () => {
    try {
      const raw = localStorage.getItem('docente_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.dni || parsed.id || parsed.nombre)) {
          setDocenteSession(parsed);

          if (parsed.dni) {
            validarAccesoDocenteAction(parsed.dni, 'ANY')
              .then((res) => {
                if (res.success && res.data?.fechaFin) {
                  const updated = { ...parsed, fechaFin: res.data.fechaFin, nombre: res.data.nombre };
                  setDocenteSession(updated);
                  localStorage.setItem('docente_session', JSON.stringify(updated));
                }
              })
              .catch(() => {});
          }
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
      setRestrictedModalOpen(true);
    }
  };

  const handleRestrictedLoginClick = () => {
    setRestrictedModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('docente_session');
    setDocenteSession(null);
    setProfileDropdownOpen(false);
    window.dispatchEvent(new Event('docente_session_change'));
    router.push('/');
  };

  const handleAuthSuccess = (docente: any) => {
    setDocenteSession(docente);
    window.dispatchEvent(new Event('docente_session_change'));
  };

  const isPremium = Boolean(
    docenteSession?.fechaFin && new Date(docenteSession.fechaFin) >= new Date()
  );

  const isHomePage = pathname === '/';

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteSession?.id) return;
    if (!nuevoPin || nuevoPin.trim().length < 4) {
      setPinMessage('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    const res = await updateUsuarioAction(docenteSession.id, { pin: nuevoPin });
    if (res.success) {
      setPinMessage('¡PIN actualizado correctamente!');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setPinMessage(null);
        setNuevoPin('');
      }, 1500);
    } else {
      setPinMessage(res.error.message);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo oficial */}
        <Logo />

        {/* Navegación Desktop */}
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

          {/* ESTADO Y ACCIONES DE USUARIO (En la home se mantiene limpio) */}
          {mounted && !isHomePage && (
            <>
              {/* Botón Adquiere Premium */}
              {docenteSession && !isPremium && (
                <a
                  href="https://wa.me/51900000000?text=Hola,%20deseo%20adquirir%20el%20Plan%20Premium%20de%20AVEND%20ESCALA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-500 transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 text-amber-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Adquiere Premium</span>
                </a>
              )}

              {/* ESTADO DE USUARIO */}
              {!docenteSession ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
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

                    {isPremium ? (
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                        FREE
                      </span>
                    )}

                    <svg className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* MENÚ DESPLEGABLE REDISEÑADO */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 z-50">
                      {/* Cabecera de Identidad */}
                      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 mb-1.5">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                          {docenteSession.nombre}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono truncate">
                          {docenteSession.email || `DNI: ${docenteSession.dni}`}
                        </p>

                        <div className="pt-1">
                          {isPremium ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                              <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Plan Premium Activo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                              <svg className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>Suscripción Gratuita</span>
                            </span>
                          )}
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

                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setIsPinModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
                          </svg>
                          <span>Cambiar PIN de Acceso</span>
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
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

      {/* MODAL ACCESO RESTRINGIDO VIA REACT PORTAL */}
      {mounted && restrictedModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider border border-amber-100 dark:border-slate-700 flex items-center space-x-1.5">
                <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Acceso Restringido</span>
              </span>
              <button
                type="button"
                onClick={() => setRestrictedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Inicia sesión para explorar el material
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Para acceder al Banco de Cuadernillos y Recursos Didácticos oficiales, necesitas iniciar sesión o registrarte como docente.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestrictedModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestrictedLoginClick}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Iniciar Sesión / Registrarse
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL MI PERFIL VIA PORTAL REDISEÑADO */}
      {mounted && isPerfilModalOpen && docenteSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
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

            {/* Filas de Datos Estilizadas */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Nombre Completo
                </span>
                <p className="font-black text-xs text-slate-900 dark:text-white">
                  {docenteSession.nombre}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    DNI
                  </span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                    {docenteSession.dni}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Rol Registrado
                  </span>
                  <p className="font-bold text-xs text-blue-600 dark:text-blue-400">
                    DOCENTE
                  </p>
                </div>
              </div>

              {docenteSession.email && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Correo Electrónico
                  </span>
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                    {docenteSession.email}
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Estado del Plan
                </span>

                {isPremium ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>PLAN PREMIUM</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <span>SUSCRIPCIÓN FREE</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPerfilModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CAMBIAR PIN VIA PORTAL REDISEÑADO */}
      {mounted && isPinModalOpen && docenteSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
                  </svg>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Cambiar PIN de Acceso</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {pinMessage && (
              <p className="text-xs font-bold p-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700">
                {pinMessage}
              </p>
            )}

            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nuevo PIN (mín. 4 dígitos)
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Actualizar PIN
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <DocenteAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </header>
  );
};
