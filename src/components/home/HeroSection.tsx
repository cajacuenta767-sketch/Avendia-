// src/components/home/HeroSection.tsx
import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Badge Superior */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-900">
        <span>🚀 BANCO DE EVALUACIONES Y SIMULADORES MINEDU</span>
      </div>

      {/* Titular Principal */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.1]">
        Prepara tu examen docentes con{' '}
        <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-500 bg-clip-text text-transparent">
          material oficial
        </span>
      </h1>

      {/* Subtítulos de Concursos MINEDU */}
      <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider">
        <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
          Nombramiento
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
          Ascenso de Escala
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white shadow-sm">
          Cargos Directivos
        </span>
      </div>

      {/* Descripción Pedagógica */}
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
        Acceso inmediato a la colección completa de cuadernillos de pruebas anteriores, solucionarios explicados paso a paso y simuladores con temporizador oficial.
      </p>

      {/* Ilustración / Elemento Gráfico Docente */}
      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
          👨‍🏫
        </div>
        <div className="text-xs text-blue-950 dark:text-blue-200">
          <p className="font-extrabold">Plataforma recomendada para docentes de todo el Perú</p>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">EBR, EBA y EBE en todos los niveles y áreas de especialidad.</p>
        </div>
      </div>
    </div>
  );
};
