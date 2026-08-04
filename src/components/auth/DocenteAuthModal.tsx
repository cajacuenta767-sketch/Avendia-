// src/components/auth/DocenteAuthModal.tsx
'use client';

import React, { useState } from 'react';
import { loginDocenteAction, registrarseDocenteAction } from '@/services/usuariosService';

interface DocenteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (docente: { id?: string; dni: string; nombre: string; email?: string; fechaFin?: string }) => void;
}

export const DocenteAuthModal: React.FC<DocenteAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form State Login
  const [identificador, setIdentificador] = useState('');
  const [pinLogin, setPinLogin] = useState('');

  // Form State Register
  const [dniReg, setDniReg] = useState('');
  const [nombreReg, setNombreReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [pinReg, setPinReg] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = await loginDocenteAction(identificador, pinLogin);
    setIsLoading(false);

    if (res.success) {
      const docenteData = {
        id: res.data.id,
        dni: res.data.dni,
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
      dni: dniReg,
      nombre: nombreReg,
      email: emailReg,
      pin: pinReg,
    });

    setIsLoading(false);

    if (res.success) {
      const docenteData = {
        id: res.data.id,
        dni: res.data.dni,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(''); }}
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
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
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === 'login' ? 'Acceso Docente Escala' : 'Registro de Nuevo Docente'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Ingresa tu DNI o Correo Electrónico y PIN de acceso.'
              : 'Regístrate gratis para explorar materiales de evaluación docente.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* MODO LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                DNI o Correo Electrónico *
              </label>
              <input
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="72849102 o docente@minedu.edu.pe"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        )}

        {/* MODO REGISTRO */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                DNI *
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={dniReg}
                onChange={(e) => setDniReg(e.target.value.replace(/\D/g, ''))}
                placeholder="72849102"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico *
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
                  Crear PIN (min. 4 dgt) *
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
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                {isLoading ? 'Registrando...' : 'Crear Cuenta Gratis'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
