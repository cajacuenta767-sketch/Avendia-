// src/components/ui/Logo.tsx
import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true }) => {
  return (
    <Link href="/" className={`inline-flex items-center space-x-3 group ${className}`}>
      {/* Isotipo: Icono de Barras Ascendentes */}
      <div className="relative flex items-end justify-center space-x-1 w-10 h-10 p-2 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
        <span className="w-1.5 h-3.5 bg-white/70 rounded-full" />
        <span className="w-1.5 h-5 bg-white/90 rounded-full" />
        <span className="w-1.5 h-7 bg-white rounded-full shadow-xs" />
      </div>

      {/* Logotipo Texto */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
            AVEND <span className="text-blue-600 dark:text-blue-400">ESCALA</span>
          </span>
          <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mt-0.5">
            PLATAFORMA DOCENTE
          </span>
        </div>
      )}
    </Link>
  );
};
