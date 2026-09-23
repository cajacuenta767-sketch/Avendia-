import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { loginDirectoPorCorreoAction } from '@/services/usuariosService';
import { saveDocenteSession } from '@/lib/authSession';
import { getAccountWhatsAppLink } from '@/lib/whatsapp';
import type { AccountWhatsAppReason } from '@/lib/whatsapp';

interface DocenteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export const DocenteAuthModal: React.FC<DocenteAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappReason, setWhatsappReason] = useState<AccountWhatsAppReason>('LOGIN_ACCESS');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleDirectLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setWhatsappReason('LOGIN_ACCESS');

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setErrorMessage('Por favor, escribe un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    const res = await loginDirectoPorCorreoAction(emailTrimmed);
    setIsLoading(false);

    if (res.success) {
      if (res.data.isAdmin) {
        onClose();
        window.location.href = `/admin?email=${encodeURIComponent(res.data.email)}`;
        return;
      }

      const docenteData = {
        id: res.data.id,
        nombre: res.data.nombre,
        email: res.data.email,
        rol: res.data.rol,
        region: (res.data as any).region || 'Lima',
        institucionEducativa: (res.data as any).institucionEducativa || '',
        modalidad: res.data.modalidad,
        nivel: res.data.nivel,
        areas: res.data.areas,
        fechaFin: res.data.fechaFin,
      };
      saveDocenteSession(docenteData);
      onSuccess(docenteData);
      onClose();
    } else {
      if (res.error.code === 'UNREGISTERED_EMAIL') {
        setWhatsappReason('UNREGISTERED');
      }
      setErrorMessage(res.error.message);
    }
  };

  const whatsappUrl = getAccountWhatsAppLink(whatsappReason, email);

  const modalJSX = (
    <div className="responsive-modal-shell fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="responsive-modal-panel relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[92dvh] space-y-4">

        {/* Header Modal */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[11px] font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-900">
            <span>PORTAL DE ACCESO DOCENTE</span>
          </span>
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

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Escribe tu correo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Ingresa correctamente el correo registrado en <strong className="font-bold text-slate-800 dark:text-slate-200">AVEND ESCALA</strong> para acceder a todos los cuadernillos.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold leading-relaxed flex items-start space-x-2">
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleDirectLogin} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Correo Electrónico *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1d6bf3]">
                <svg className="w-4 h-4 text-[#1d6bf3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[#1d6bf3] hover:bg-[#1557c0] text-white font-black text-xs tracking-wide uppercase shadow-sm shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] whitespace-nowrap"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>INGRESAR &rarr;</span>
            )}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center justify-center my-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Botón Verde WhatsApp */}
        <div className="space-y-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl bg-[#00a651] hover:bg-[#008f45] text-white font-black text-xs tracking-wide uppercase shadow-sm shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] whitespace-nowrap px-3"
          >
            <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.142-1.086z" />
            </svg>
            <span>{whatsappReason === 'UNREGISTERED' ? 'REGISTRARME POR WHATSAPP' : 'SOLICITAR ACCESO POR WHATSAPP'}</span>
          </a>

          <p className="text-[10.5px] text-center text-slate-400 font-normal leading-tight pt-1">
            El acceso es gratuito para los docentes usuarios en la plataforma AVEND ESCALA desde julio del 2026.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
