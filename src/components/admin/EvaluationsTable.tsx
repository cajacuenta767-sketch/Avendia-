// src/components/admin/EvaluationsTable.tsx
'use client';

import React from 'react';
import { Evaluacion } from '@/types/evaluacion';

interface EvaluationsTableProps {
  evaluaciones: Evaluacion[];
  onDelete: (id: string) => void;
}

export const EvaluationsTable: React.FC<EvaluationsTableProps> = ({
  evaluaciones,
  onDelete,
}) => {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-[11px] font-extrabold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="py-3.5 px-4">Código / Año</th>
              <th className="py-3.5 px-4">Título de la Evaluación</th>
              <th className="py-3.5 px-4">Proceso / Nivel</th>
              <th className="py-3.5 px-4">Archivos R2</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
            {evaluaciones.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                {/* Código y Año */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-gray-900 dark:text-white">
                    {item.mineduCode}
                  </div>
                  <div className="text-[11px] text-gray-400">Año {item.anio}</div>
                </td>

                {/* Título */}
                <td className="py-3.5 px-4">
                  <div className="font-bold text-gray-900 dark:text-white line-clamp-1 max-w-md">
                    {item.titulo}
                  </div>
                  <div className="text-[11px] text-gray-500">{item.especialidadLabel}</div>
                </td>

                {/* Proceso y Nivel */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                    {item.proceso.replace('_', ' ')}
                  </span>
                  <div className="text-[11px] text-gray-400 mt-0.5">{item.modalidad} · {item.nivel}</div>
                </td>

                {/* Archivos Vinculados en R2 */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <span
                      title={item.resources.cuadernilloKey}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold"
                    >
                      CUADERNILLO
                    </span>
                    {item.resources.resolucionKey && (
                      <span
                        title={item.resources.resolucionKey}
                        className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold"
                      >
                        RESOLUCIÓN
                      </span>
                    )}
                    {item.resources.clavesKey && (
                      <span
                        title={item.resources.clavesKey}
                        className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold"
                      >
                        CLAVES
                      </span>
                    )}
                  </div>
                </td>

                {/* Acciones CRUD */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar la evaluación ${item.mineduCode}?`)) {
                        onDelete(item.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    title="Eliminar registro"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
