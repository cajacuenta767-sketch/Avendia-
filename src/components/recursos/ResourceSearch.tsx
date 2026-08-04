// src/components/recursos/ResourceSearch.tsx
'use client';

import React from 'react';
import { CategoriaRecurso } from '@/types/recurso';

interface ResourceSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: CategoriaRecurso | 'TODOS';
  onCategoryChange: (category: CategoriaRecurso | 'TODOS') => void;
}

const CATEGORIAS: { id: CategoriaRecurso | 'TODOS'; label: string }[] = [
  { id: 'TODOS', label: 'Todos los Temas' },
  { id: 'CURRICULO_NACIONAL', label: 'Currículo Nacional' },
  { id: 'CASUISTICA_PEDAGOGICA', label: 'Casuística Pedagógica' },
  { id: 'TEORIAS_APRENDIZAJE', label: 'Teorías del Aprendizaje' },
  { id: 'PLANIFICACION_CURRICULAR', label: 'Planificación Curricular' },
  { id: 'GESTION_ESCOLAR', label: 'Gestión Escolar' },
];

export const ResourceSearch: React.FC<ResourceSearchProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div className="w-full space-y-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* 1. Barra de Búsqueda Principal */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por tema (ej. Enfoques transversales, Piaget, Evaluacion formativa)..."
          className="w-full h-12 pl-11 pr-10 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 2. Pestañas / Filter Pills de Categoría */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIAS.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 focus:outline-none ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
