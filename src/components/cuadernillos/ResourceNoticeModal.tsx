// src/components/cuadernillos/ResourceNoticeModal.tsx
'use client';

import React from 'react';
import { getAccountWhatsAppLink } from '@/lib/whatsapp';
import type { AccountWhatsAppReason } from '@/lib/whatsapp';

export type NoticeType =
  | 'CUADERNILLO_NO_DISPONIBLE'
  | 'CLAVES_NO_DISPONIBLES'
  | 'RESOLUCION_PDF_NO_DISPONIBLE'
  | 'RESOLUCION_NO_PERFIL'
  | 'CLIENTE_SIN_ACCESO'
  | 'CUENTA_EN_ESPERA'
  | 'CUENTA_PAUSADA'
  | 'SUSCRIPCION_VENCIDA'
  | 'PRUEBA_FINALIZADA';

interface ResourceNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noticeType: NoticeType | null;
  docenteEmail?: string;
}

const NOTICE_CONFIG: Record<
  NoticeType,
  { icon: string; badge: string; title: string; message: string; badgeColor: string; buttonText: string; whatsappReason?: AccountWhatsAppReason }
> = {
  CLIENTE_SIN_ACCESO: {
    icon: '🔒',
    badge: 'AVEND ESCALA • SUSCRIPCIÓN',
    title: 'Acceso Restringido - Cuenta en Espera',
    message: 'Tu cuenta se encuentra registrada en la plataforma, pero aún no cuenta con una suscripción activa para visualizar los cuadernillos. Comunícate con la administración para activar tu acceso.',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    buttonText: 'Solicitar Activación por WhatsApp',
    whatsappReason: 'WAITING',
  },
  CUENTA_EN_ESPERA: {
    icon: '🔒',
    badge: 'AVEND ESCALA • ACTIVACIÓN',
    title: 'Cuenta registrada - Activación pendiente',
    message: 'Tu cuenta está registrada correctamente, pero todavía no tiene una suscripción activa. Solicita a la administración que habilite tu acceso.',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    buttonText: 'Solicitar Activación por WhatsApp',
    whatsappReason: 'WAITING',
  },
  CUENTA_PAUSADA: {
    icon: '⏸️',
    badge: 'AVEND ESCALA • CUENTA PAUSADA',
    title: 'Tu acceso se encuentra pausado',
    message: 'La administración pausó temporalmente el acceso de esta cuenta. Puedes solicitar su revisión y reactivación por WhatsApp.',
    badgeColor: 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    buttonText: 'Solicitar Reactivación por WhatsApp',
    whatsappReason: 'PAUSED',
  },
  SUSCRIPCION_VENCIDA: {
    icon: '⏳',
    badge: 'AVEND ESCALA • SUSCRIPCIÓN VENCIDA',
    title: 'La vigencia de tu suscripción finalizó',
    message: 'La fecha de acceso de tu suscripción ya terminó. Renueva tu vigencia para continuar usando los cuadernillos y recursos incluidos.',
    badgeColor: 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    buttonText: 'Renovar por WhatsApp',
    whatsappReason: 'EXPIRED',
  },
  PRUEBA_FINALIZADA: {
    icon: '⏰',
    badge: 'AVEND ESCALA • PRUEBA FINALIZADA',
    title: 'Finalizó tu prueba gratuita de 24 horas',
    message: 'El periodo de prueba concluyó. Activa tu acceso completo para continuar practicando con las evaluaciones y claves disponibles.',
    badgeColor: 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    buttonText: 'Activar Acceso Completo por WhatsApp',
    whatsappReason: 'TRIAL_EXPIRED',
  },
  RESOLUCION_PDF_NO_DISPONIBLE: {
    icon: '📄',
    badge: 'AVEND ESCALA • SOLUCIONARIO',
    title: 'Solucionario en Simulador',
    message: 'Este examen no cuenta con solucionario en PDF 😊. Puedes revisar la solución de cada pregunta directamente en el simulador AVEND Escala.',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    buttonText: 'Entendido',
  },
  CLAVES_NO_DISPONIBLES: {
    icon: '🔑',
    badge: 'MINEDU • COMUNICADO OFICIAL',
    title: 'Claves Oficiales no Disponibles',
    message: 'El Ministerio de Educación (MINEDU) no publicó las claves oficiales para este examen. El cuadernillo de preguntas se encuentra disponible para su estudio.',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    buttonText: 'Entendido',
  },
  RESOLUCION_NO_PERFIL: {
    icon: '🔒',
    badge: 'AVEND ESCALA • ACCESO',
    title: 'Resolución no disponible para tu perfil',
    message: 'Esta resolución corresponde a otra modalidad, nivel o especialidad de tu suscripción actual.',
    badgeColor: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    buttonText: 'Aceptar',
  },
  CUADERNILLO_NO_DISPONIBLE: {
    icon: '📘',
    badge: 'AVEND ESCALA • CONTENIDO',
    title: 'Cuadernillo en proceso',
    message: 'Este examen se encuentra en proceso de revisión y digitación.',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    buttonText: 'Entendido',
  },
};

export const ResourceNoticeModal: React.FC<ResourceNoticeModalProps> = ({
  isOpen,
  onClose,
  noticeType,
  docenteEmail,
}) => {
  if (!isOpen || !noticeType) return null;

  const config = NOTICE_CONFIG[noticeType];
  const activationWhatsAppUrl = config.whatsappReason
    ? getAccountWhatsAppLink(config.whatsappReason, docenteEmail)
    : '';

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="responsive-modal-panel w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-4 relative overflow-y-auto max-h-[92dvh]">
        
        {/* Cabecera con Icono y Badge Oficial */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {config.icon}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${config.badgeColor}`}>
              {config.badge}
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-1 truncate">
              {config.title}
            </h3>
          </div>
        </div>

        {/* Mensaje Institucional */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {config.message}
          </p>
        </div>

        {/* Botón de Acción con Azul AVEND ESCALA */}
        <div className="pt-1">
          {config.whatsappReason ? (
            <a
              href={activationWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-center block"
            >
              💬 {config.buttonText}
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer text-center"
            >
              {config.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
