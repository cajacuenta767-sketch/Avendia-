// src/components/auth/DocenteAuthModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loginDocenteAction, registrarseDocenteAction } from '@/services/usuariosService';
import { checkIsAdminEmailAction } from '@/services/adminService';

interface DocenteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export const DocenteAuthModal: React.FC<DocenteAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Formulario Login
  const [emailLogin, setEmailLogin] = useState('');
  const [pinLogin, setPinLogin] = useState('');

  // Formulario Registro
  const [nombreReg, setNombreReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [pinReg, setPinReg] = useState('');
  const [modalidadReg, setModalidadReg] = useState('EBR');
  const [nivelReg, setNivelReg] = useState('INICIAL');
  const [areaReg, setAreaReg] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = await loginDocenteAction(emailLogin, pinLogin);
    setIsLoading(false);

    if (res.success) {
      if (res.data.isAdmin) {
        localStorage.removeItem('admin_auth_session');
        sessionStorage.removeItem('admin_auth_session');
        onClose();
        window.location.href = `/admin?email=${encodeURIComponent(res.data.email)}`;
        return;
      }

      const docenteData = {
        id: res.data.id,
        nombre: res.data.nombre,
        email: res.data.email,
        fechaFin: res.data.fechaFin,
      };
      localStorage.setItem('docente_session', JSON.stringify(docenteData));
      onSuccess(docenteData);
      onClose();
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = await registrarseDocenteAction({
      nombre: nombreReg,
      email: emailReg,
      pin: pinReg,
    });

    setIsLoading(false);

    if (res.success) {
      const docenteData = {
        id: res.data.id,
        nombre: res.data.nombre,
        email: res.data.email,
        fechaFin: res.data.fechaFin,
      };
      localStorage.setItem('docente_session', JSON.stringify(docenteData));
      onSuccess(docenteData);
      onClose();
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(''); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(''); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Validar Correo
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5 space-y-1">
          <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block">
            PORTAL DE ACCESO DOCENTE
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === 'login' ? 'Ingresa a tu cuenta' : 'Validar correo registrado'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Escribe correctamente tu correo electrónico registrado en AVEND ESCALA para acceder a los cuadernillos.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs leading-relaxed">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* MODO LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico Registrado *
              </label>
              <input
                type="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                placeholder="docente@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                PIN de Acceso *
              </label>
              <input
                type="password"
                required
                maxLength={6}
                value={pinLogin}
                onChange={(e) => setPinLogin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-colors cursor-pointer"
              >
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        )}

        {/* MODO REGISTRO / VALIDACIÓN DE CORREO */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={nombreReg}
                onChange={(e) => setNombreReg(e.target.value)}
                placeholder="Maria Elena Torres"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico (El Simulador) *
              </label>
              <input
                type="email"
                required
                value={emailReg}
                onChange={(e) => setEmailReg(e.target.value)}
                placeholder="docente@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Crear PIN de Acceso *
              </label>
              <input
                type="password"
                required
                maxLength={6}
                value={pinReg}
                onChange={(e) => setPinReg(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-colors cursor-pointer"
              >
                {isLoading ? 'Validando...' : 'Validar y Acceder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
