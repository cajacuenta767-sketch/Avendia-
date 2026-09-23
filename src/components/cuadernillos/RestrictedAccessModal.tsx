// src/components/cuadernillos/RestrictedAccessModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAccountWhatsAppLink, getWhatsAppLink, getWhatsAppReasonForAccountState } from '@/lib/whatsapp';
import type { AccountAccessState } from '@/lib/whatsapp';

interface RestrictedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationLabel: string;
  docenteAreas: string[];
  docenteNombre?: string;
  docenteEmail?: string;
  accountState?: AccountAccessState;
  reason?: 'PROFILE_MISMATCH' | 'SUBSCRIPTION_INACTIVE';
}

export const RestrictedAccessModal: React.FC<RestrictedAccessModalProps> = ({
  isOpen,
  onClose,
  evaluationLabel,
  docenteAreas,
  docenteNombre = 'Docente',
  docenteEmail = '',
  accountState = 'EN_ESPERA',
  reason = 'PROFILE_MISMATCH',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const currentAreasText = docenteAreas.length > 0 ? docenteAreas.join(', ') : 'Ninguna especialidad activa';
  const isSubscriptionInactive = reason === 'SUBSCRIPTION_INACTIVE';
  const inactiveExplanations: Record<Exclude<AccountAccessState, 'ACTIVA'>, string> = {
    EN_ESPERA: 'Tu cuenta está registrada, pero todavía espera la activación de una suscripción.',
    PAUSADA: 'La administración pausó temporalmente tu cuenta. Solicita su revisión y reactivación.',
    VENCIDA: 'La fecha de vigencia de tu suscripción terminó. Debes renovarla para abrir esta resolución.',
    PRUEBA_FINALIZADA: 'Tu prueba gratuita de 24 horas concluyó. Activa el acceso completo para abrir esta resolución.',
  };
  const inactiveState = accountState === 'ACTIVA' ? 'EN_ESPERA' : accountState;
  const restrictionExplanation = isSubscriptionInactive
    ? inactiveExplanations[inactiveState]
    : 'Esta resolución requiere una modalidad, nivel o especialidad diferente a la registrada en tu plan actual.';
  const profileWhatsAppMessage = `Hola equipo de AVEND ESCALA. Soy el docente ${docenteNombre}${docenteEmail ? ` (${docenteEmail})` : ''}. Me gustaria solicitar acceso a la resolucion: ${evaluationLabel}.\n\nMi plan docente actual incluye: [${currentAreasText}].\n\nDetalle: ${restrictionExplanation}\n\nMuchas gracias por su gentil atencion.`;
  const whatsappUrl = isSubscriptionInactive
    ? getAccountWhatsAppLink(getWhatsAppReasonForAccountState(inactiveState), docenteEmail)
    : getWhatsAppLink(profileWhatsAppMessage);
  const inactiveBadge = inactiveState === 'PAUSADA'
    ? 'CUENTA PAUSADA'
    : inactiveState === 'VENCIDA'
      ? 'SUSCRIPCIÓN VENCIDA'
      : inactiveState === 'PRUEBA_FINALIZADA'
        ? 'PRUEBA FINALIZADA'
        : 'ACTIVACIÓN PENDIENTE';

  const modalContent = (
    <div className="responsive-modal-shell fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="responsive-modal-panel relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[92dvh] p-5 sm:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          ✕
        </button>

        {/* Icono de Candado / Alerta */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-3xl shadow-md shadow-amber-500/10">
          🔒
        </div>

        {/* Textos Principales */}
        <div className="space-y-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-900">
            {isSubscriptionInactive ? inactiveBadge : 'MATERIAL NO INCLUIDO EN TU PLAN'}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Acceso Restringido a esta Resolución
          </h3>
        </div>

        {/* Detalle de Áreas Asignadas vs Solicitada */}
        <div className="space-y-3 text-left">
          {/* Especialidad Intentada */}
          <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Resolución solicitada:
            </p>
            <p className="text-xs font-black text-rose-950 dark:text-rose-200 pt-0.5">
              {evaluationLabel || 'Especialidad seleccionada'}
            </p>
          </div>

          <p className="px-1 text-xs leading-relaxed font-semibold text-slate-600 dark:text-slate-300">
            {restrictionExplanation}
          </p>

          {/* Suscripción Actual del Docente */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tu plan docente actual incluye:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {docenteAreas.length > 0 ? (
                docenteAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800"
                  >
                    ✓ {area}
                  </span>
                ))
              ) : (
                <span className="text-xs font-bold text-slate-500">Ninguna especialidad activa</span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2.5 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>💬</span>
            <span>SOLICITAR ACCESO POR WHATSAPP</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all cursor-pointer"
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
