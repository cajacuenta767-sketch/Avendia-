// src/components/home/BenefitsList.tsx
import React from 'react';

interface BenefitItem {
  num: string;
  title: string;
  desc: string;
  iconSvg: React.ReactNode;
}

const BENEFITS: BenefitItem[] = [
  {
    num: '01',
    title: 'Material Oficial Verificado',
    desc: 'Cuadernillos completos, claves de respuesta oficiales y soluciones detalladas pedagógicamente.',
    iconSvg: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: '$0 Costo de Ancho de Banda',
    desc: 'Descargas instantáneas sin restricciones utilizando la infraestructura de Cloudflare R2.',
    iconSvg: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Simulador Cronometrado',
    desc: 'Practica en condiciones reales de examen con el formato de preguntas de casuística MINEDU.',
    iconSvg: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const BenefitsList: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
      {BENEFITS.map((item) => (
        <div
          key={item.num}
          className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {item.num}
            </span>
            <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800">
              {item.iconSvg}
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
            {item.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  );
};
