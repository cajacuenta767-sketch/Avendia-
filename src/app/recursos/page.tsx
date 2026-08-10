// src/app/recursos/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceSearch } from '@/components/recursos/ResourceSearch';
import { ResourceCard } from '@/components/recursos/ResourceCard';
import { PdfViewerModal } from '@/components/cuadernillos/PdfViewerModal';
import { DocenteAuthModal } from '@/components/auth/DocenteAuthModal';
import { getRecursosAction, getRecursoSignedUrlAction } from '@/services/recursosService';
import { CategoriaRecurso, Recurso } from '@/types/recurso';
import { Evaluacion } from '@/types/evaluacion';

export default function RecursosPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoriaRecurso | 'TODOS'>('TODOS');
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Guard de Navegación Estricta
  useEffect(() => {
    const sessionStr = localStorage.getItem('docente_session');
    const adminSessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    if (!sessionStr && !adminSessionStr) {
      router.replace('/');
    }
  }, [router]);

  // Modal de Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingRecurso, setPendingRecurso] = useState<Recurso | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    evaluacion: Evaluacion | null;
  }>({
    isOpen: false,
    evaluacion: null,
  });

  const fetchRecursos = useCallback(async () => {
    // Si ya tenemos recursos cargados, no ocultamos la pantalla con bloques grises
    if (recursos.length === 0) {
      setIsLoading(true);
    }
    const response = await getRecursosAction(searchQuery, selectedCategory);
    if (response.success && response.data.length > 0) {
      setRecursos(response.data);
    }
    setIsLoading(false);
  }, [searchQuery, selectedCategory, recursos.length]);

  useEffect(() => {
    fetchRecursos();
  }, [fetchRecursos]);

  const triggerOpenPdf = async (recurso: Recurso) => {
    const signedRes = await getRecursoSignedUrlAction(recurso.id);
    const rawUrl = signedRes.success ? signedRes.data.signedUrl : recurso.urlPdf;
    const pdfSignedUrl =
      rawUrl && (rawUrl.startsWith('/') || rawUrl.startsWith('http'))
        ? rawUrl
        : '/uploads/cuadernillos/cuadernillo-inicial-2024.pdf';

    const evalAdaptada: Evaluacion = {
      id: recurso.id,
      mineduCode: `MINEDU-REC-${recurso.numero}`,
      titulo: recurso.titulo,
      proceso: 'NOMBRAMIENTO_DOCENTE',
      modalidad: 'EBR',
      nivel: 'SECUNDARIA',
      especialidad: recurso.categoriaLabel,
      especialidadLabel: recurso.categoriaLabel,
      anio: 2024,
      resources: {
        cuadernilloKey: pdfSignedUrl,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setModalState({
      isOpen: true,
      evaluacion: evalAdaptada,
    });
  };

  const handleOpenPdf = (recurso: Recurso) => {
    const session = localStorage.getItem('docente_session');
    const adminSession = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    if (!session && !adminSession) {
      router.push('/#login-form');
      return;
    }
    triggerOpenPdf(recurso);
  };

  const handleAuthSuccess = () => {
    window.dispatchEvent(new Event('docente_session_change'));
    if (pendingRecurso) {
      triggerOpenPdf(pendingRecurso);
      setPendingRecurso(null);
    }
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      evaluacion: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Principal */}
        <header className="text-center sm:text-left space-y-3 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-900">
            <span>📖 Biblioteca Pedagógica</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Recursos y Resúmenes Clave
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Accede a fichas temáticas, compendios del Currículo Nacional, resúmenes de teorías del aprendizaje y casuísticas explicadas para potenciar tu preparación docente.
          </p>
        </header>

        {/* Buscador */}
        <ResourceSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Listado de Tarjetas */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : recursos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-500">
              No se encontraron recursos pedagógicos que coincidan con la búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recursos.map((recurso) => (
              <ResourceCard
                key={recurso.id}
                recurso={recurso}
                onOpenPdf={handleOpenPdf}
              />
            ))}
          </div>
        )}
      </div>

      <DocenteAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Modal de Previsualización PDF */}
      <PdfViewerModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        evaluacion={modalState.evaluacion}
        resourceType="CUADERNILLO"
      />
    </div>
  );
}
