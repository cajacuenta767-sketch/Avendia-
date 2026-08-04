// src/components/admin/modals/UserFormModal.tsx
'use client';

import React, { useState } from 'react';

export interface UserFormData {
  fullName: string;
  email: string;
  dni: string;
  pin: string;
  endDate: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Ingresa el nombre completo del docente.');
      return;
    }

    if (!/^\d{8}$/.test(dni.trim())) {
      setErrorMessage('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (!pin.trim() || pin.trim().length < 4) {
      setErrorMessage('El PIN debe tener al menos 4 caracteres.');
      return;
    }

    if (!endDate) {
      setErrorMessage('Selecciona la fecha de vencimiento de la licencia.');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      dni: dni.trim(),
      pin: pin.trim(),
      endDate,
    });

    setFullName('');
    setEmail('');
    setDni('');
    setPin('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider border border-blue-100 dark:border-slate-700">
            👤 Alta de Docente
          </span>

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

        <div className="mb-6 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Registrar Nuevo Docente
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Los usuarios creados desde este panel tendrán asignado estrictamente el rol <strong className="text-blue-600">DOCENTE</strong>.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
              DNI del Docente *
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej.: 72849102"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej.: Maria Elena Torres Vargas"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@minedu.edu.pe"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                PIN de Acceso *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Ej.: 8491"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
              Fecha de Vencimiento de Licencia *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors"
            >
              Guardar Docente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
