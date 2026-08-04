// src/app/cuadernillos/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProcessSelector } from '@/components/cuadernillos/ProcessSelector';
import { CascadingFilters } from '@/components/cuadernillos/CascadingFilters';
import { EvaluationCard } from '@/components/cuadernillos/EvaluationCard';
import { PdfViewerModal } from '@/components/cuadernillos/PdfViewerModal';
import { DocenteAuthModal } from '@/components/auth/DocenteAuthModal';
import { getEvaluacionesAction, getResourceSignedUrlAction } from '@/services/evaluacionesService';
import {
  Evaluacion,
  EvaluacionesFilterParams,
  ProcesoMinedu,
} from '@/types/evaluacion';

const PROCESO_TITULOS: Record<ProcesoMinedu, string> = {
  NOMBRAMIENTO_DOCENTE: 'Evaluaciones de Nombramiento Docente',
  ASCENSO_ESCALAFON: 'Evaluaciones de Ascenso de Escala',
  ACCESO_CARGOS_DIRECTIVOS: 'Evaluaciones de Acceso a Cargos Directivos',
  INGRESO_CPM: 'Evaluaciones de Ingreso a la CPM',
  REASIGNACION_DOCENTE: 'Evaluaciones de Reasignación Docente',
};

export default function CuadernillosPage() {
  const [filters, setFilters] = useState<EvaluacionesFilterParams>({
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBR',
    nivel: 'TODOS',
    especialidad: 'TODOS',
    anio: 'TODOS',
    searchQuery: '',
  });

  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal de Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingResource, setPendingResource] = useState<{
    evaluationId: string;
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES';
  } | null>(null);

  // Modal de PDF
  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    evaluacion: Evaluacion | null;
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES' | null;
  }>({
    isOpen: false,
    evaluacion: null,
    resourceType: null,
  });

  const fetchEvaluaciones = useCallback(async () => {
    setIsLoading(true);
    const response = await getEvaluacionesAction(filters);
    if (response.success) {
      setEvaluaciones(response.data);
    } else {
      console.error(response.error.message);
    }
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchEvaluaciones();
  }, [fetchEvaluaciones]);

  const handleSelectProceso = (nuevoProceso: ProcesoMinedu) => {
    setFilters((prev) => ({ ...prev, proceso: nuevoProceso }));
  };

  const handleFilterChange = (updatedFilters: EvaluacionesFilterParams) => {
    setFilters(updatedFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      proceso: filters.proceso,
      modalidad: 'TODOS',
      nivel: 'TODOS',
      especialidad: 'TODOS',
      anio: 'TODOS',
      searchQuery: '',
    });
  };

  const triggerOpenResource = async (
    evaluationId: string,
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => {
    const evalTarget = evaluaciones.find((item) => item.id === evaluationId) || null;
    await getResourceSignedUrlAction(evaluationId, resourceType);

    setActiveModal({
      isOpen: true,
      evaluacion: evalTarget,
      resourceType: resourceType,
    });
  };

  const handleOpenResource = (
    evaluationId: string,
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => {
    const session = localStorage.getItem('docente_session');
    if (!session) {
      setPendingResource({ evaluationId, resourceType });
      setIsAuthModalOpen(true);
      return;
    }
    triggerOpenResource(evaluationId, resourceType);
  };

  const handleAuthSuccess = () => {
    window.dispatchEvent(new Event('docente_session_change'));
    if (pendingResource) {
      triggerOpenResource(pendingResource.evaluationId, pendingResource.resourceType);
      setPendingResource(null);
    }
  };

  const handleCloseModal = () => {
    setActiveModal({ isOpen: false, evaluacion: null, resourceType: null });
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ProcessSelector
          selectedProceso={filters.proceso || 'NOMBRAMIENTO_DOCENTE'}
          onSelectProceso={handleSelectProceso}
        />

        <CascadingFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          resultsCount={evaluaciones.length}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {PROCESO_TITULOS[filters.proceso || 'NOMBRAMIENTO_DOCENTE']}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {evaluaciones.length} resultados encontrados
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-500">
                No se encontraron evaluaciones con los filtros seleccionados.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evaluaciones.map((evaluacion) => (
                <EvaluationCard
                  key={evaluacion.id}
                  evaluacion={evaluacion}
                  onOpenResource={handleOpenResource}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DocenteAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <PdfViewerModal
        isOpen={activeModal.isOpen}
        onClose={handleCloseModal}
        evaluacion={activeModal.evaluacion}
        resourceType={activeModal.resourceType}
      />
    </main>
  );
}
