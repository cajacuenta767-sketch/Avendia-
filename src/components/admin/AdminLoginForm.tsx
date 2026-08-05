// src/components/admin/AdminLoginForm.tsx
'use client';

import React, { useState } from 'react';
import { verifyAdminCredentialsAction } from '@/services/adminService';

interface AdminLoginFormProps {
  onSuccess: () => void;
}

const FIVE_ADMINS = [
  { name: 'Juan Avend', role: 'SUPERADMINISTRADOR', email: 'admin@avend.pe', pass: 'AdminAvend2026!' },
  { name: 'Administrador 01', role: 'ADMINISTRADOR', email: 'administrador@avend.pe', pass: 'AvendAdmin2026!' },
  { name: 'Carlos Mendoza', role: 'SOPORTE Y LICENCIAS', email: 'soporte@avend.pe', pass: 'SoporteAvend2026!' },
  { name: 'María Fernanda', role: 'CONTENIDO MINEDU', email: 'evaluaciones@avend.pe', pass: 'MineduAvend2026!' },
  { name: 'Diego Ramírez', role: 'AUDITOR SAAS', email: 'auditoria@avend.pe', pass: 'AuditoriaAvend2026!' },
];

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onSuccess }) => {
  const [userOrEmail, setUserOrEmail] = useState('');
  const [passOrPin, setPassOrPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOrEmail.trim() || !passOrPin.trim()) {
      setErrorMsg('⚠️ Por favor ingresa el usuario y la contraseña.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await verifyAdminCredentialsAction(userOrEmail, passOrPin);
    setIsSubmitting(false);

    if (res.success) {
      const sessionData = {
        token: res.data.token,
        name: res.data.name,
        role: res.data.role,
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem('admin_auth_session', JSON.stringify(sessionData));
      sessionStorage.setItem('admin_auth_session', JSON.stringify(sessionData));
      onSuccess();
    } else {
      setErrorMsg(`❌ ${res.error.message}`);
    }
  };

  const handleSelectQuickAccount = (email: string, pass: string) => {
    setUserOrEmail(email);
    setPassOrPin(pass);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Luces y Gradientes Atmosféricos de Fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
        {/* Header de Autenticación */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-2xl mb-2">
            🔒
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
            CONSOLA DE GESTIÓN ADMINISTRATIVA SAAS
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Avend Escala Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Ingresa con cualquiera de las 5 cuentas oficiales de administración.
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold p-3.5 rounded-2xl animate-in fade-in flex items-center space-x-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              USUARIO O CORREO ADMINISTRADOR
            </label>
            <input
              type="text"
              required
              placeholder="admin@avend.pe"
              value={userOrEmail}
              onChange={(e) => setUserOrEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              CONTRASEÑA / CLAVE MASTER
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={passOrPin}
              onChange={(e) => setPassOrPin(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Verificando...' : 'INGRESAR AL DASHBOARD ADMINISTRADOR →'}</span>
          </button>
        </form>

        {/* Catálogo Interactivo de las 5 Cuentas de Administrador */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-left text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
              🔑 LISTA DE 5 ADMINISTRADORES ACTIVOS
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Haz clic en uno para auto-llenar</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {FIVE_ADMINS.map((acc, i) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectQuickAccount(acc.email, acc.pass)}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase text-blue-400">{i + 1}. {acc.name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-slate-400 font-mono text-[10px] truncate">
                    Correo: <strong className="text-white">{acc.email}</strong> | Clave: <strong className="text-emerald-400">{acc.pass}</strong>
                  </p>
                </div>
                <span className="text-slate-500 group-hover:text-white font-bold text-xs">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
