// src/components/admin/AdminLoginForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { verifyAdminCredentialsAction } from '@/services/adminService';

interface AdminLoginFormProps {
  onSuccess: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onSuccess }) => {
  const [userOrEmail, setUserOrEmail] = useState('');
  const [passOrPin, setPassOrPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        setUserOrEmail(emailParam);
      } else {
        setUserOrEmail('');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passOrPin.trim()) {
      setErrorMsg('⚠️ Ingresa tu código de 4 dígitos o PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const emailToUse = userOrEmail.trim();
    if (!emailToUse) {
      setErrorMsg('⚠️ Ingresa tu correo o usuario administrativo.');
      return;
    }
    const res = await verifyAdminCredentialsAction(emailToUse, passOrPin.trim());
    setIsSubmitting(false);

    if (res.success) {
      const sessionData = {
        token: res.data.token,
        name: res.data.name,
        email: res.data.email || emailToUse,
        role: res.data.role,
        permisoUsuarios: res.data.permisoUsuarios ?? true,
        permisoCuadernillos: res.data.permisoCuadernillos ?? true,
        permisoRecursos: res.data.permisoRecursos ?? true,
        permisoMetricas: res.data.permisoMetricas ?? true,
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem('admin_auth_session', JSON.stringify(sessionData));
      sessionStorage.setItem('admin_auth_session', JSON.stringify(sessionData));
      document.cookie = `admin_auth_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=${10 * 365 * 24 * 60 * 60}; SameSite=Lax`;
      window.dispatchEvent(new Event('admin_session_change'));
      onSuccess();
    } else {
      setErrorMsg(`❌ Código o PIN incorrecto.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center animate-in zoom-in-95 duration-150">
        {/* Icono y Título del Cuadro Pequeño */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-black text-xl flex items-center justify-center mx-auto shadow-2xs">
            🔑
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Código de Acceso Personalizado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ingresa el código o PIN asignado por el Superadministrador para ingresar al Dashboard.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Formulario que PIDE ÚNICAMENTE EL CÓDIGO PERSONALIZADO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="admin-user-or-email" className="block text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Correo o usuario administrativo
            </label>
            <input
              id="admin-user-or-email"
              type="text"
              autoComplete="username"
              required
              placeholder="correo@ejemplo.com o usuario"
              value={userOrEmail}
              onChange={(e) => setUserOrEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-pin" className="block text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              PIN de acceso
            </label>
            <input
              id="admin-pin"
              type="password"
              autoComplete="current-password"
              autoFocus
              maxLength={12}
              required
              placeholder="CÓDIGO DE ACCESO / PIN"
              value={passOrPin}
              onChange={(e) => setPassOrPin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-center text-sm font-black text-slate-900 dark:text-white tracking-widest font-mono outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Verificando...' : 'INGRESAR AL DASHBOARD →'}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/';
          }}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-wider cursor-pointer"
        >
          ← Regresar al Inicio
        </button>
      </div>
    </div>
  );
};
