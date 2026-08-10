// src/app/cuadernillos/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ProcessSelector } from '@/components/cuadernillos/ProcessSelector';
import { CascadingFilters } from '@/components/cuadernillos/CascadingFilters';
import { EvaluationCard } from '@/components/cuadernillos/EvaluationCard';
import { PdfViewerModal } from '@/components/cuadernillos/PdfViewerModal';
import { DocenteAuthModal } from '@/components/auth/DocenteAuthModal';
import { getEvaluacionesAction, getResourceSignedUrlAction } from '@/services/evaluacionesService';
import { getFreshDocenteSessionAction } from '@/services/usuariosService';
import {
  Evaluacion,
  EvaluacionesFilterParams,
  ProcesoMinedu,
  ModalidadEducativa,
  NivelEducativo,
} from '@/types/evaluacion';

interface ProcessThemeConfig {
  name: string;
  breadcrumb: string;
  highlight: string;
  titleColor: string;
  badgeBg: string;
  buttonBg: string;
  headerBg: string;
  accentBar: string;
  proximamenteBadge: string;
  numBg: string;
}

const PROCESS_THEMES: Record<ProcesoMinedu, ProcessThemeConfig> = {
  NOMBRAMIENTO_DOCENTE: {
    name: 'Nombramiento',
    breadcrumb: 'Nombramiento',
    highlight: 'Nombramiento',
    titleColor: 'text-purple-600 dark:text-purple-400 font-black',
    badgeBg: 'bg-purple-600 text-white',
    buttonBg: 'bg-purple-600 hover:bg-purple-700',
    headerBg: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/80',
    accentBar: 'bg-purple-600',
    proximamenteBadge: 'bg-purple-100 text-purple-900 border-purple-200',
    numBg: 'bg-purple-600',
  },
  ASCENSO_ESCALAFON: {
    name: 'Ascenso',
    breadcrumb: 'Ascenso',
    highlight: 'Ascenso',
    titleColor: 'text-[#2563eb] dark:text-blue-400',
    badgeBg: 'bg-blue-600 text-white',
    buttonBg: 'bg-[#2563eb] hover:bg-[#1d4ed8]',
    headerBg: 'bg-[#eff6ff] dark:bg-blue-950/20 border-blue-100',
    accentBar: 'bg-[#2563eb]',
    proximamenteBadge: 'bg-blue-100 text-blue-900 border-blue-200',
    numBg: 'bg-[#2563eb]',
  },
  ACCESO_CARGOS_DIRECTIVOS: {
    name: 'Directivos',
    breadcrumb: 'Directivos',
    highlight: 'Directivos',
    titleColor: 'text-[#16a34a] dark:text-emerald-400',
    badgeBg: 'bg-emerald-600 text-white',
    buttonBg: 'bg-[#16a34a] hover:bg-[#15803d]',
    headerBg: 'bg-[#f0fdf4] dark:bg-emerald-950/20 border-emerald-100',
    accentBar: 'bg-[#16a34a]',
    proximamenteBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    numBg: 'bg-[#16a34a]',
  },
  INGRESO_CPM: {
    name: 'Ingreso CPM',
    breadcrumb: 'Ingreso CPM',
    highlight: 'Ingreso CPM',
    titleColor: 'text-[#c2410c]',
    badgeBg: 'bg-purple-600 text-white',
    buttonBg: 'bg-[#c2410c]',
    headerBg: 'bg-[#fffbeb]',
    accentBar: 'bg-[#c2410c]',
    proximamenteBadge: 'bg-amber-100 text-amber-900',
    numBg: 'bg-[#c2410c]',
  },
  REASIGNACION_DOCENTE: {
    name: 'Reasignación',
    breadcrumb: 'Reasignación',
    highlight: 'Reasignación',
    titleColor: 'text-[#c2410c]',
    badgeBg: 'bg-purple-600 text-white',
    buttonBg: 'bg-[#c2410c]',
    headerBg: 'bg-[#fffbeb]',
    accentBar: 'bg-[#c2410c]',
    proximamenteBadge: 'bg-amber-100 text-amber-900',
    numBg: 'bg-[#c2410c]',
  },
};

function CuadernillosContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Leer estado inicial desde la URL (o iniciar vacio para requerir seleccion consciente del usuario)
  const initialProceso = (searchParams.get('proceso') as ProcesoMinedu) || 'NOMBRAMIENTO_DOCENTE';
  const initialModalidad = (searchParams.get('modalidad') as ModalidadEducativa) || '';
  const initialNivel = (searchParams.get('nivel') as NivelEducativo) || '';
  const initialEspecialidad = searchParams.get('especialidad') || '';
  const initialAnioParam = searchParams.get('anio');
  const initialAnio = initialAnioParam && initialAnioParam !== 'TODOS' ? Number(initialAnioParam) : '';

  const [filters, setFilters] = useState<EvaluacionesFilterParams>({
    proceso: initialProceso,
    modalidad: initialModalidad,
    nivel: initialNivel,
    especialidad: initialEspecialidad,
    anio: initialAnio as any,
    searchQuery: '',
  });

  const [nombramientoCategoryTab, setNombramientoCategoryTab] = useState<'TODOS' | 'HABILIDADES_GENERALES' | 'CONOCIMIENTOS_CURRICULARES'>('TODOS');

  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasDocenteSession, setHasDocenteSession] = useState<boolean>(false);

  useEffect(() => {
    const checkSession = () => {
      const sessionStr = localStorage.getItem('docente_session');
      if (!sessionStr) {
        router.replace('/');
        setHasDocenteSession(false);
      } else {
        setHasDocenteSession(true);
      }
    };
    checkSession();
    window.addEventListener('docente_session_change', checkSession);
    return () => window.removeEventListener('docente_session_change', checkSession);
  }, [router]);

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

  // Sincronización bidireccional con la URL
  const updateUrlParams = useCallback((newFilters: EvaluacionesFilterParams) => {
    const params = new URLSearchParams();
    if (newFilters.proceso && newFilters.proceso !== 'TODOS') params.set('proceso', newFilters.proceso);
    if (newFilters.modalidad && newFilters.modalidad !== 'TODOS') params.set('modalidad', newFilters.modalidad);
    if (newFilters.nivel && newFilters.nivel !== 'TODOS') params.set('nivel', newFilters.nivel);
    if (newFilters.especialidad && newFilters.especialidad !== 'TODOS') params.set('especialidad', newFilters.especialidad);
    if (newFilters.anio && newFilters.anio !== 'TODOS') params.set('anio', String(newFilters.anio));

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [pathname, router]);

  const fetchEvaluaciones = useCallback(async () => {
    const response = await getEvaluacionesAction(filters);
    if (response.success) {
      setEvaluaciones(response.data);
    }
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchEvaluaciones();
  }, [fetchEvaluaciones]);

  const handleSelectProceso = (nuevoProceso: ProcesoMinedu) => {
    const updated: EvaluacionesFilterParams = {
      ...filters,
      proceso: nuevoProceso,
      modalidad: 'TODOS',
      nivel: 'TODOS',
      especialidad: 'TODOS',
      anio: 'TODOS',
    };
    setFilters(updated);
    updateUrlParams(updated);
  };

  const handleFilterChange = (updatedFilters: EvaluacionesFilterParams) => {
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  };

  const handleResetFilters = () => {
    const reset: EvaluacionesFilterParams = {
      proceso: filters.proceso,
      modalidad: 'TODOS',
      nivel: 'TODOS',
      especialidad: 'TODOS',
      anio: 'TODOS',
      searchQuery: '',
    };
    setFilters(reset);
    updateUrlParams(reset);
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

  const handleOpenResource = async (
    evaluationId: string,
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => {
    const sessionStr = localStorage.getItem('docente_session');
    const adminSessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');

    if (!sessionStr && !adminSessionStr) {
      router.push('/#login-form');
      return;
    }

    try {
      let session = sessionStr ? JSON.parse(sessionStr) : null;
      if (!session && adminSessionStr) {
        session = {
          id: 'admin-preview-session',
          nombre: 'Administrador',
          email: 'admin@avendescala.pe',
          nivel: 'NO_APLICA',
          area: 'TODAS',
          areas: ['TODAS'],
        };
      }

      // Re-consultar a la base de datos en tiempo real para obtener cualquier cambio realizado por el Admin
      if (session?.email && session.id !== 'admin-preview-session') {
        const freshRes = await getFreshDocenteSessionAction(session.email);
        if (freshRes.success) {
          session = freshRes.data;
          localStorage.setItem('docente_session', JSON.stringify(session));
        }
      }

      const evalTarget = evaluaciones.find((item) => item.id === evaluationId);

      if (evalTarget && session) {
        const normalize = (str: string) =>
          (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .trim();

        const userNivel = normalize(session.nivel);
        const evalNivel = normalize(evalTarget.nivel);

        // 1. Verificación Nivel: Si el usuario es universal (NO_APLICA, TODOS, etc.), permitir acceso
        const isNivelUniversal =
          !userNivel ||
          userNivel.includes('no aplica') ||
          userNivel.includes('todos') ||
          userNivel.includes('todas');

        if (!isNivelUniversal && evalNivel && !evalNivel.includes('no aplica') && !evalNivel.includes(userNivel) && !userNivel.includes(evalNivel)) {
          alert(`🔒 ACCESO RESTRINGIDO POR NIVEL\n\nTu cuenta docente Premium está asignada únicamente al nivel "${session.nivel}". No tienes permiso para acceder a los materiales del nivel "${evalTarget.nivel}".\n\nSolicita la ampliación de tu plan por WhatsApp.`);
          return;
        }

        // 2. Verificación Área / Especialidad Flexible
        if (session.areas && Array.isArray(session.areas) && session.areas.length > 0) {
          const userAreas = session.areas.map((a: string) => normalize(a));

          const isUniversalArea = userAreas.some(
            (ua: string) =>
              ua.includes('todos') ||
              ua.includes('todas') ||
              ua.includes('completo') ||
              ua.includes('general') ||
              ua.includes('acceso total') ||
              ua.includes('ambos')
          );

          if (!isUniversalArea) {
            const targetText = normalize(
              `${evalTarget.titulo} ${evalTarget.especialidadLabel} ${(evalTarget as any).area || ''} ${evalTarget.especialidad || ''}`
            );

            const hasAccess = userAreas.some((ua: string) => {
              if (!ua) return false;
              if (targetText.includes(ua) || ua.includes(targetText)) return true;

              // Comparación por palabras clave de 3 o más letras (ej: "inicial", "aip", "primaria", "matematica")
              const words = ua.split(/\s+/).filter((w) => w.length >= 3);
              return words.some((word) => targetText.includes(word));
            });

            if (!hasAccess) {
              alert(`🔒 ACCESO RESTRINGIDO POR ESPECIALIDAD\n\nTu suscripción Premium no incluye el área "${evalTarget.especialidad || evalTarget.especialidadLabel}".\n\nEspecialidades habilitadas en tu cuenta: ${session.areas.join(', ')}.`);
              return;
            }
          }
        }
      }
    } catch {}

    triggerOpenResource(evaluationId, resourceType);
  };

  const handleAuthSuccess = () => {
    window.dispatchEvent(new Event('docente_session_change'));
    setHasDocenteSession(true);
    if (pendingResource) {
      triggerOpenResource(pendingResource.evaluationId, pendingResource.resourceType);
      setPendingResource(null);
    }
  };

  const handleCloseModal = () => {
    setActiveModal({ isOpen: false, evaluacion: null, resourceType: null });
  };

  const procesoTitleKey = (filters.proceso && filters.proceso !== 'TODOS'
    ? filters.proceso
    : 'NOMBRAMIENTO_DOCENTE') as ProcesoMinedu;

  const currentTheme = PROCESS_THEMES[procesoTitleKey] || PROCESS_THEMES.NOMBRAMIENTO_DOCENTE;

  const isNombramiento = procesoTitleKey === 'NOMBRAMIENTO_DOCENTE';

  const habGeneralesList = React.useMemo(() => {
    return evaluaciones.filter((item) => {
      const espLower = (item.especialidad || '').toLowerCase().trim();
      const titleLower = (item.titulo || '').toLowerCase().trim();
      return (
        espLower.includes('habilidades generales') ||
        espLower.includes('general') ||
        espLower.includes('comprension lectora') ||
        espLower.includes('comprensión lectora') ||
        espLower.includes('razonamiento logico') ||
        espLower.includes('razonamiento lógico') ||
        titleLower.includes('habilidades generales') ||
        titleLower.includes('comprensión lectora') ||
        titleLower.includes('razonamiento lógico') ||
        titleLower.includes('subprueba 1') ||
        titleLower.includes('subprueba 2')
      );
    });
  }, [evaluaciones]);

  const curricularesPedagogicosList = React.useMemo(() => {
    return evaluaciones.filter((item) => {
      const espLower = (item.especialidad || '').toLowerCase().trim();
      const titleLower = (item.titulo || '').toLowerCase().trim();
      const isHg = (
        espLower.includes('habilidades generales') ||
        espLower.includes('general') ||
        espLower.includes('comprension lectora') ||
        espLower.includes('comprensión lectora') ||
        espLower.includes('razonamiento logico') ||
        espLower.includes('razonamiento lógico') ||
        titleLower.includes('habilidades generales') ||
        titleLower.includes('comprensión lectora') ||
        titleLower.includes('razonamiento lógico') ||
        titleLower.includes('subprueba 1') ||
        titleLower.includes('subprueba 2')
      );
      return !isHg;
    });
  }, [evaluaciones]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner de Autenticación de Docente (Si no ha iniciado sesión) */}
        {!hasDocenteSession && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in">
            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                🔒
              </span>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block tracking-wider">
                  ACCESO RESTRINGIDO A DOCENTES REGISTRADOS
                </span>
                <p className="text-xs">
                  Ingresa con tu DNI o Correo autorizado para consultar y descargar todo el material oficial MINEDU.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer uppercase tracking-wider"
            >
              INGRESAR / REGISTRARSE →
            </button>
          </div>
        )}

        {/* Breadcrumb Dinámico */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-400 dark:text-slate-500">
          <a href="/" className="hover:text-gray-700 dark:hover:text-slate-300 transition-colors">Inicio</a>
          <span>&gt;</span>
          <span className="font-bold text-gray-700 dark:text-slate-300">{currentTheme.breadcrumb}</span>
        </nav>

        {/* Header Principal Atmosférico Dinámico */}
        <div className={`relative overflow-hidden p-6 sm:p-8 rounded-3xl ${currentTheme.headerBg} border border-gray-200/60 dark:border-slate-800 transition-colors duration-500 shadow-2xs`}>
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full border border-current opacity-10 pointer-events-none" />
          <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full border border-current opacity-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span className="text-gray-400">REPOSITORIO DOCUMENTAL MINEDU</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Cuadernillos de <span className={currentTheme.titleColor}>{currentTheme.highlight}</span>
              </h1>

              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Repositorio ordenado de evaluaciones anteriores, claves oficiales y resoluciones desarrolladas paso a paso.
              </p>
            </div>

            {/* Banner Tarjeta del Simulador */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs shrink-0 max-w-xs space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-7 h-7 rounded-full ${currentTheme.numBg} flex items-center justify-center shrink-0`}>
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wide block">SIMULADOR AVEND ESCALA</span>
                  <h4 className="text-[11px] font-bold text-gray-900 dark:text-white leading-tight">
                    Practica Nombramiento, Ascenso y Directivos.
                  </h4>
                </div>
              </div>

              <a
                href="https://www.avendocente.com/premium"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center px-4 py-2 rounded-xl ${currentTheme.buttonBg} text-white font-extrabold text-xs shadow-xs transition-all text-center tracking-wide hover:opacity-90`}
              >
                IR AL SIMULADOR AHORA &gt;
              </a>
            </div>
          </div>
        </div>

        {/* Paso 1: Selector de Proceso */}
        <ProcessSelector
          selectedProceso={procesoTitleKey}
          onSelectProceso={handleSelectProceso}
        />

        {/* Paso 2: Filtros en Cascada */}
        <CascadingFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          resultsCount={evaluaciones.length}
          activeProceso={procesoTitleKey}
        />

        {/* Sección de Resultados Organizada por Categorías */}
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-gray-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className={`w-1 h-5 rounded-full ${currentTheme.accentBar}`} />
              <div>
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">REPOSITORIO DE MATERIALES</span>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Evaluaciones de <span className={currentTheme.titleColor}>{currentTheme.highlight}</span>
                </h2>
              </div>
            </div>
            
            <span className="text-xs font-semibold text-gray-400">
              {evaluaciones.length} materiales encontrados
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-56 bg-gray-200/80 dark:bg-slate-800 rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Selecciona la modalidad, nivel y área para consultar
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Usa los filtros superiores para explorar los materiales del repositorio.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-block"
              >
                Limpiar filtros
              </button>
            </div>
          ) : isNombramiento ? (
            /* LÓGICA ESTRUCTURADA REQUERIDA POR EL CLIENTE PARA NOMBRAMIENTO: 2 CATEGORÍAS SEPARADAS */
            <div className="space-y-6">
              {/* Barra de Sub-Pestañas para Nombramiento */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setNombramientoCategoryTab('TODOS')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    nombramientoCategoryTab === 'TODOS'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                   Ver Todo ({evaluaciones.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNombramientoCategoryTab('HABILIDADES_GENERALES')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    nombramientoCategoryTab === 'HABILIDADES_GENERALES'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🧠 Habilidades Generales ({habGeneralesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNombramientoCategoryTab('CONOCIMIENTOS_CURRICULARES')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    nombramientoCategoryTab === 'CONOCIMIENTOS_CURRICULARES'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  📚 Conocimientos Curriculares y Pedagógicos ({curricularesPedagogicosList.length})
                </button>
              </div>

              {/* CATEGORÍA 1: CUADERNILLOS DE HABILIDADES GENERALES */}
              {(nombramientoCategoryTab === 'TODOS' || nombramientoCategoryTab === 'HABILIDADES_GENERALES') && (
                <div className="space-y-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-purple-200/90 dark:border-purple-900/40 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 dark:border-purple-900/30 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800">
                        <span>🧠 COMPRENSIÓN LECTORA Y RAZONAMIENTO LÓGICO</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        Cuadernillos de Habilidades Generales
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Subpruebas oficiales MINEDU de Comprensión Lectora y Razonamiento Lógico Matemático.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold shrink-0 self-start sm:self-auto">
                      {habGeneralesList.length} {habGeneralesList.length === 1 ? 'cuadernillo' : 'cuadernillos'}
                    </span>
                  </div>

                  {habGeneralesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {habGeneralesList.map((evaluacion) => (
                        <EvaluationCard
                          key={evaluacion.id}
                          evaluacion={evaluacion}
                          onOpenResource={handleOpenResource}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-dashed border-purple-200 dark:border-purple-900/40 text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        No hay cuadernillos de Habilidades Generales para la combinación seleccionada.
                      </p>
                      <p className="text-[11px]">
                        Ajusta el año o limpia los filtros para explorar otros archivos del repositorio.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORÍA 2: CUADERNILLOS DE CONOCIMIENTO CURRICULARES Y PEDAGÓGICOS */}
              {(nombramientoCategoryTab === 'TODOS' || nombramientoCategoryTab === 'CONOCIMIENTOS_CURRICULARES') && (
                <div className="space-y-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-blue-200/90 dark:border-blue-900/40 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 dark:border-blue-900/30 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                        <span>📘 ESPECIALIDAD Y PEDAGOGÍA</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        Cuadernillos de Conocimientos Curriculares y Pedagógicos
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Evaluaciones de conocimientos disciplinares, didácticos y pedagógicos del nivel y área.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-extrabold shrink-0 self-start sm:self-auto">
                      {curricularesPedagogicosList.length} {curricularesPedagogicosList.length === 1 ? 'cuadernillo' : 'cuadernillos'}
                    </span>
                  </div>

                  {curricularesPedagogicosList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {curricularesPedagogicosList.map((evaluacion) => (
                        <EvaluationCard
                          key={evaluacion.id}
                          evaluacion={evaluacion}
                          onOpenResource={handleOpenResource}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-dashed border-blue-200 dark:border-blue-900/40 text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        No hay cuadernillos de Conocimientos Curriculares y Pedagógicos para el área o nivel seleccionado.
                      </p>
                      <p className="text-[11px]">
                        Selecciona una especialidad o área para desplegar las evaluaciones correspondientes.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* VISTA ESTÁNDAR DE REPOSITORIO PARA OTROS PROCESOS (ASCENSO, DIRECTIVOS) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-6xl mx-auto my-4">
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

export default function CuadernillosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-center text-sm font-bold text-slate-500">Cargando plataforma...</div>}>
      <CuadernillosContent />
    </Suspense>
  );
}
