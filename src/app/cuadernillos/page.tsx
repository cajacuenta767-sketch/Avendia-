// src/app/cuadernillos/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ProcessSelector } from '@/components/cuadernillos/ProcessSelector';
import { CascadingFilters } from '@/components/cuadernillos/CascadingFilters';
import { EvaluationCard } from '@/components/cuadernillos/EvaluationCard';
import { PdfViewerModal } from '@/components/cuadernillos/PdfViewerModal';
import { DocenteFooterNotice } from '@/components/cuadernillos/DocenteFooterNotice';
import { TrialCountdownHeader } from '@/components/cuadernillos/TrialCountdownHeader';
import { DocenteAuthModal } from '@/components/auth/DocenteAuthModal';
import { ResourceNoticeModal, NoticeType } from '@/components/cuadernillos/ResourceNoticeModal';
import { RestrictedAccessModal } from '@/components/cuadernillos/RestrictedAccessModal';
import { checkDocenteSpecialtyAccess } from '@/utils/badgeUtils';
import { getEvaluacionesAction, getResourceSignedUrlAction, getAniosAction } from '@/services/evaluacionesService';
import { registrarReporteRecursoFaltanteAction } from '@/services/notificacionesService';
import { getFreshDocenteSessionAction } from '@/services/usuariosService';
import type { AccountAccessState } from '@/lib/whatsapp';
import { getAreasDisponibles } from '@/data/cascadingData';
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

const getAccountStateFromSession = (session: Record<string, unknown> | null): AccountAccessState => {
  const explicitState = typeof session?.estado === 'string' ? session.estado.toUpperCase() : '';
  if (['ACTIVA', 'EN_ESPERA', 'PAUSADA', 'VENCIDA', 'PRUEBA_FINALIZADA'].includes(explicitState)) {
    return explicitState as AccountAccessState;
  }

  const role = typeof session?.rol === 'string' ? session.rol.toUpperCase() : '';
  const fechaFin = typeof session?.fechaFin === 'string' ? new Date(session.fechaFin) : null;
  const isExpired = Boolean(fechaFin && !Number.isNaN(fechaFin.getTime()) && fechaFin <= new Date());
  const isTrial = role.includes('PRUEBA') || role.includes('24H') || role.includes('TRIAL');

  if (role === 'CLIENTE') return 'EN_ESPERA';
  if (isTrial && isExpired) return 'PRUEBA_FINALIZADA';
  if (session?.accesoGranted === false) return 'PAUSADA';
  if (isExpired) return 'VENCIDA';
  return 'ACTIVA';
};

const getNoticeTypeForAccountState = (state: AccountAccessState): NoticeType | null => {
  if (state === 'EN_ESPERA') return 'CUENTA_EN_ESPERA';
  if (state === 'PAUSADA') return 'CUENTA_PAUSADA';
  if (state === 'VENCIDA') return 'SUSCRIPCION_VENCIDA';
  if (state === 'PRUEBA_FINALIZADA') return 'PRUEBA_FINALIZADA';
  return null;
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
  const initialAnio = initialAnioParam && /^\d{4}$/.test(initialAnioParam)
    ? Number(initialAnioParam)
    : (initialProceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'TODOS' : '');

  const [filters, setFilters] = useState<EvaluacionesFilterParams>({
    proceso: initialProceso,
    modalidad: initialModalidad,
    nivel: initialNivel,
    especialidad: initialEspecialidad,
    anio: initialAnio,
    searchQuery: '',
  });

  const [nombramientoCategoryTab, setNombramientoCategoryTab] = useState<'TODOS' | 'HABILIDADES_GENERALES' | 'CONOCIMIENTOS_CURRICULARES'>('TODOS');

  const isDirectivos = (filters.proceso || 'NOMBRAMIENTO_DOCENTE') === 'ACCESO_CARGOS_DIRECTIVOS';

  // Filtrado Estricto por Niveles Obligatorios:
  // Los exámenes aparecen ÚNICAMENTE cuando el usuario completa la selección hasta el último nivel requerido.
  const { isSelectionComplete, guideMessage } = useMemo(() => {
    const isDirectivos = (filters.proceso || 'NOMBRAMIENTO_DOCENTE') === 'ACCESO_CARGOS_DIRECTIVOS';

    if (isDirectivos) {
      return { isSelectionComplete: true, guideMessage: '' };
    }

    // Nombramiento / Ascenso
    const modalidad = filters.modalidad ? String(filters.modalidad).trim() : '';
    if (!modalidad || modalidad === 'TODOS') {
      return {
        isSelectionComplete: false,
        guideMessage: 'Selecciona tu modalidad educativa para consultar los cuadernillos disponibles.',
      };
    }

    // Modalidad EBE no requiere nivel ni especialidad
    if (modalidad === 'EBE') {
      return { isSelectionComplete: true, guideMessage: '' };
    }

    const nivel = filters.nivel ? String(filters.nivel).trim() : '';
    if (!nivel || nivel === 'TODOS') {
      return {
        isSelectionComplete: false,
        guideMessage: 'Selecciona tu nivel educativo para consultar los cuadernillos disponibles.',
      };
    }

    // Verificar si (Modalidad, Nivel) exige seleccionar una Especialidad o Área obligatoria
    const areasDisponibles = getAreasDisponibles(modalidad, nivel);
    const requiresEspecialidad = areasDisponibles.length > 0;

    if (requiresEspecialidad) {
      const especialidad = filters.especialidad ? String(filters.especialidad).trim() : '';
      if (!especialidad || especialidad === 'TODOS') {
        return {
          isSelectionComplete: false,
          guideMessage: 'Selecciona tu especialidad o área para desplegar los cuadernillos disponibles.',
        };
      }
    }

    return { isSelectionComplete: true, guideMessage: '' };
  }, [filters.proceso, filters.modalidad, filters.nivel, filters.especialidad, filters.anio]);

  const showSubpruebasHeaderSelector = useMemo(() => {
    return (filters.proceso || 'NOMBRAMIENTO_DOCENTE') === 'NOMBRAMIENTO_DOCENTE';
  }, [filters.proceso]);

  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const evaluacionesRequestIdRef = useRef(0);
  const aniosRequestIdRef = useRef(0);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [hasDocenteSession, setHasDocenteSession] = useState<boolean>(false);
  const [docenteEmail, setDocenteEmail] = useState<string>('');
  const [noticeModal, setNoticeModal] = useState<{
    isOpen: boolean;
    noticeType: NoticeType | null;
  }>({
    isOpen: false,
    noticeType: null,
  });

  useEffect(() => {
    const checkSession = () => {
      const docenteSessionStr = localStorage.getItem('docente_session');
      const adminSessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');

      if (!docenteSessionStr && !adminSessionStr) {
        setIsAuthorized(false);
        setHasDocenteSession(false);
        setDocenteEmail('');
        router.replace('/');
      } else {
        setIsAuthorized(true);
        setHasDocenteSession(true);

        // Sincronización silenciosa en tiempo real con la base de datos
        if (docenteSessionStr) {
          try {
            const parsed = JSON.parse(docenteSessionStr);
            const parsedEmail = typeof parsed?.email === 'string' ? parsed.email.trim() : '';
            setDocenteEmail(parsedEmail.includes('@') ? parsedEmail : '');
            if (parsed?.email && parsed.id !== 'admin-preview-session') {
              getFreshDocenteSessionAction(parsed.email).then((res) => {
                if (res.success && res.data) {
                  const updated = { ...parsed, ...res.data };
                  localStorage.setItem('docente_session', JSON.stringify(updated));
                  const accountNoticeType = getNoticeTypeForAccountState(
                    getAccountStateFromSession(updated as Record<string, unknown>)
                  );
                  if (accountNoticeType) {
                    setNoticeModal({ isOpen: true, noticeType: accountNoticeType });
                  }
                }
              }).catch(() => {});
            }
          } catch {
            setDocenteEmail('');
          }
        } else {
          setDocenteEmail('');
        }
      }
    };
    checkSession();
    window.addEventListener('docente_session_change', checkSession);
    window.addEventListener('admin_session_change', checkSession);
    return () => {
      window.removeEventListener('docente_session_change', checkSession);
      window.removeEventListener('admin_session_change', checkSession);
    };
  }, [router]);

  // Carga dinámica de años desde la Base de Datos según el contexto de filtros seleccionados
  const [availableAnios, setAvailableAnios] = useState<string[]>([]);

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

  // Modal de Acceso Restringido por Especialidad
  const [restrictedModal, setRestrictedModal] = useState<{
    isOpen: boolean;
    evaluationLabel: string;
    docenteAreas: string[];
    docenteNombre?: string;
    docenteEmail?: string;
    accountState?: AccountAccessState;
    reason: 'PROFILE_MISMATCH' | 'SUBSCRIPTION_INACTIVE';
  }>({
    isOpen: false,
    evaluationLabel: '',
    docenteAreas: [],
    docenteNombre: '',
    docenteEmail: '',
    accountState: 'ACTIVA',
    reason: 'PROFILE_MISMATCH',
  });

  const showRestrictedResolution = (
    evaluacion: Evaluacion,
    docenteSession: Record<string, unknown> | null,
    reason: 'PROFILE_MISMATCH' | 'SUBSCRIPTION_INACTIVE' = 'PROFILE_MISMATCH'
  ) => {
    const accessCheck = checkDocenteSpecialtyAccess(docenteSession, evaluacion, false);
    const rawArea = evaluacion.especialidad || (evaluacion as Evaluacion & { area?: string }).area || '';
    const fallbackEvaluationLabel = [evaluacion.modalidad, evaluacion.nivel, rawArea]
      .map((value) => String(value || '').trim())
      .filter((value) => value && !value.toLowerCase().includes('no aplica'))
      .join(' - ');
    setRestrictedModal({
      isOpen: true,
      evaluationLabel: accessCheck.evaluationLabel || fallbackEvaluationLabel || 'Resolución seleccionada',
      docenteAreas: accessCheck.docenteAreas,
      docenteNombre: typeof docenteSession?.nombre === 'string'
        ? docenteSession.nombre
        : typeof docenteSession?.name === 'string'
          ? docenteSession.name
          : 'Docente',
      docenteEmail: typeof docenteSession?.email === 'string' ? docenteSession.email : '',
      accountState: getAccountStateFromSession(docenteSession),
      reason,
    });
  };

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

  useEffect(() => {
    const requestId = ++aniosRequestIdRef.current;
    const filterSnapshot: EvaluacionesFilterParams = {
      ...filters,
      anio: '',
      searchQuery: '',
    };

    setAvailableAnios([]);

    const loadAnios = async () => {
      const res = await getAniosAction(filterSnapshot);
      if (requestId !== aniosRequestIdRef.current) return;

      if (!res.success) {
        setAvailableAnios([]);
        return;
      }

      const nextAnios = res.data || [];
      setAvailableAnios(nextAnios);

      const selectedAnio = filters.anio;
      if (
        selectedAnio &&
        selectedAnio !== 'TODOS' &&
        !nextAnios.includes(String(selectedAnio))
      ) {
        const updatedFilters: EvaluacionesFilterParams = { ...filters, anio: '' };
        setFilters(updatedFilters);
        updateUrlParams(updatedFilters);
      }
    };

    void loadAnios();
  }, [filters.proceso, filters.modalidad, filters.nivel, filters.especialidad, filters.anio, updateUrlParams]);

  const fetchEvaluaciones = useCallback(async () => {
    const requestId = ++evaluacionesRequestIdRef.current;

    if (!isSelectionComplete) {
      setEvaluaciones([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setEvaluaciones([]);

    try {
      const response = await getEvaluacionesAction(filters);
      if (requestId !== evaluacionesRequestIdRef.current) return;

      if (response.success) {
        const sortedData = [...response.data].sort((a, b) => {
          const anioA = Number(a.anio) || 0;
          const anioB = Number(b.anio) || 0;
          if (anioB !== anioA) return anioB - anioA;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setEvaluaciones(sortedData);
      } else {
        setEvaluaciones([]);
      }
    } finally {
      if (requestId === evaluacionesRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, isSelectionComplete]);

  useEffect(() => {
    fetchEvaluaciones();
  }, [fetchEvaluaciones]);

  const handleSelectProceso = (nuevoProceso: ProcesoMinedu) => {
    evaluacionesRequestIdRef.current += 1;
    aniosRequestIdRef.current += 1;
    setIsLoading(true);
    setEvaluaciones([]);
    const updated: EvaluacionesFilterParams = {
      ...filters,
      proceso: nuevoProceso,
      modalidad: '',
      nivel: '',
      especialidad: '',
      anio: nuevoProceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'TODOS' : '',
    };
    setFilters(updated);
    updateUrlParams(updated);
  };

  const handleFilterChange = useCallback((updatedFilters: EvaluacionesFilterParams) => {
    evaluacionesRequestIdRef.current += 1;
    aniosRequestIdRef.current += 1;
    setIsLoading(true);
    setEvaluaciones([]);
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  }, [updateUrlParams]);

  const handleResetFilters = () => {
    evaluacionesRequestIdRef.current += 1;
    aniosRequestIdRef.current += 1;
    setIsLoading(true);
    setEvaluaciones([]);
    const reset: EvaluacionesFilterParams = {
      proceso: filters.proceso,
      modalidad: '',
      nivel: '',
      especialidad: '',
      anio: filters.proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'TODOS' : '',
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
    if (!evalTarget) return;

    // El servidor autoriza primero el recurso. Así un solucionario AVEND no
    // puede abrirse usando una ruta que la interfaz ya conocía.
    try {
      const signedRes = await getResourceSignedUrlAction(evaluationId, resourceType);
      if (!signedRes.success) {
        if (signedRes.error.code === 'SPECIALTY_FORBIDDEN') {
          const sessionStr = localStorage.getItem('docente_session');
          let session: Record<string, unknown> | null = null;
          try {
            session = sessionStr ? JSON.parse(sessionStr) as Record<string, unknown> : null;
          } catch {
            session = null;
          }
          showRestrictedResolution(evalTarget, session);
        } else if (signedRes.error.code === 'SUBSCRIPTION_REQUIRED') {
          const sessionStr = localStorage.getItem('docente_session');
          let session: Record<string, unknown> | null = null;
          try {
            session = sessionStr ? JSON.parse(sessionStr) as Record<string, unknown> : null;
          } catch {
            session = null;
          }
          const accountNoticeType = getNoticeTypeForAccountState(getAccountStateFromSession(session));
          setNoticeModal({ isOpen: true, noticeType: accountNoticeType || 'CUENTA_EN_ESPERA' });
        }
        return;
      }

      const newSignedUrl = signedRes.data.signedUrl;
      setActiveModal({
        isOpen: true,
        resourceType,
        evaluacion: {
          ...evalTarget,
          resources: {
            ...evalTarget.resources,
            cuadernilloKey: resourceType === 'CUADERNILLO' ? newSignedUrl : evalTarget.resources?.cuadernilloKey,
            resolucionKey: resourceType === 'RESOLUCION' ? newSignedUrl : evalTarget.resources?.resolucionKey,
            clavesKey: resourceType === 'CLAVES' ? newSignedUrl : evalTarget.resources?.clavesKey,
          },
        },
      });
    } catch (err) {
      console.error('Error al autorizar el documento:', err);
    }
  };

  const notificarAdminDocumentoFaltante = (
    evalTarget: Evaluacion,
    tipoRecurso: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => {
    try {
      const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
      const session = sessionStr ? JSON.parse(sessionStr) : null;

      registrarReporteRecursoFaltanteAction({
        evaluacionId: evalTarget.id,
        tipoRecurso,
        tituloEvaluacion: evalTarget.titulo,
        proceso: evalTarget.proceso,
        modalidad: evalTarget.modalidad,
        nivel: evalTarget.nivel,
        area: evalTarget.especialidad || (evalTarget as any).area,
        anio: evalTarget.anio,
        codigo: evalTarget.resources?.codigoCuadernillo || evalTarget.codigoCuadernillo || evalTarget.mineduCode,
        docenteNombre: session?.nombre || session?.name,
        docenteEmail: session?.email,
      }).catch((e) => console.warn('⚠️ No se pudo enviar notificación de recurso faltante:', e));
    } catch (err) {
      console.error('Error al preparar reporte de recurso faltante:', err);
    }
  };

  const handleOpenResource = async (
    evaluationId: string,
    resourceType: 'CUADERNILLO' | 'RESOLUCION' | 'CLAVES'
  ) => {
    const evalTarget = evaluaciones.find((item) => item.id === evaluationId);
    if (!evalTarget) return;

    // Validación de Sesión, Rol CLIENTE y Expiración
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
    const adminSessionStr = typeof window !== 'undefined' ? localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session') : null;

    let session: any = null;
    if (sessionStr) {
      try {
        session = JSON.parse(sessionStr);

        // 🔄 SINCRONIZACIÓN EN TIEMPO REAL CON LA BD (Refleja permisos del admin al instante sin cerrar sesión)
        if (session?.email && session.id !== 'admin-preview-session') {
          try {
            const freshRes = await getFreshDocenteSessionAction(session.email);
            if (freshRes.success && freshRes.data) {
              session = { ...session, ...freshRes.data };
              localStorage.setItem('docente_session', JSON.stringify(session));
            }
          } catch {}
        }

        const accountState = getAccountStateFromSession(session as Record<string, unknown>);
        const accountNoticeType = getNoticeTypeForAccountState(accountState);
        if (accountNoticeType && !adminSessionStr) {
          if (resourceType === 'RESOLUCION') {
            showRestrictedResolution(evalTarget, session, 'SUBSCRIPTION_INACTIVE');
            return;
          }
          setNoticeModal({
            isOpen: true,
            noticeType: accountNoticeType,
          });
          return;
        }
      } catch {}
    }

    // Los documentos oficiales MINEDU son parte del plan completo. La
    // especialidad solo restringe los solucionarios elaborados por AVEND.
    const resolutionOrigin = String(evalTarget.resources?.origenResolucion || 'AVEND').toUpperCase();
    const isDirectivosResource = evalTarget.proceso === 'ACCESO_CARGOS_DIRECTIVOS';
    const requiresSpecialtyAccess =
      resourceType === 'RESOLUCION' && resolutionOrigin !== 'MINEDU' && !isDirectivosResource;
    if (requiresSpecialtyAccess) {
      const accessCheck = checkDocenteSpecialtyAccess(session, evalTarget, Boolean(adminSessionStr));
      if (!accessCheck.hasAccess) {
        showRestrictedResolution(evalTarget, session);
        return;
      }
    }

    // 1. CUADERNILLOS Y CLAVES MINEDU:
    // Todos los usuarios podrán ver y descargar todos los cuadernillos y claves MINEDU disponibles en la plataforma.
    if (resourceType === 'CUADERNILLO') {
      const cuadernilloKey = evalTarget.resources?.cuadernilloKey;
      if (!cuadernilloKey || !cuadernilloKey.trim() || cuadernilloKey.includes('ejemplo.pdf')) {
        setNoticeModal({
          isOpen: true,
          noticeType: 'CUADERNILLO_NO_DISPONIBLE',
        });
        notificarAdminDocumentoFaltante(evalTarget, 'CUADERNILLO');
        return;
      }
      triggerOpenResource(evaluationId, resourceType);
      return;
    }

    if (resourceType === 'CLAVES') {
      const clavesKey = evalTarget.resources?.clavesKey;
      if (!clavesKey || !clavesKey.trim() || clavesKey.includes('ejemplo.pdf')) {
        setNoticeModal({
          isOpen: true,
          noticeType: 'CLAVES_NO_DISPONIBLES',
        });
        notificarAdminDocumentoFaltante(evalTarget, 'CLAVES');
        return;
      }
      triggerOpenResource(evaluationId, resourceType);
      return;
    }

    // 2. RESOLUCIONES EN PDF:
    if (resourceType === 'RESOLUCION') {
      const resolucionKey = evalTarget.resources?.resolucionKey;

      // CASO A: Cuando un examen NO tiene resolución en PDF subida/disponible:
      if (!resolucionKey || !resolucionKey.trim() || resolucionKey.includes('ejemplo.pdf')) {
        setNoticeModal({
          isOpen: true,
          noticeType: 'RESOLUCION_PDF_NO_DISPONIBLE',
        });
        notificarAdminDocumentoFaltante(evalTarget, 'RESOLUCION');
        return;
      }

      // Una resolución oficial MINEDU sigue la misma regla abierta de los
      // cuadernillos y claves oficiales.
      if (!requiresSpecialtyAccess) {
        triggerOpenResource(evaluationId, resourceType);
        return;
      }

      // CASO B: Cuando la resolución en PDF SÍ existe, validar si corresponde al perfil del usuario:
      const sessionStr = localStorage.getItem('docente_session');
      const adminSessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');

      if (!sessionStr && !adminSessionStr) {
        setPendingResource({ evaluationId, resourceType });
        setIsAuthModalOpen(true);
        return;
      }

      try {
        let session = sessionStr ? JSON.parse(sessionStr) : null;
        if (!session && adminSessionStr) {
          // Administrador tiene acceso total
          triggerOpenResource(evaluationId, resourceType);
          return;
        }

        // Re-consultar a la base de datos en tiempo real
        if (session?.email && session.id !== 'admin-preview-session') {
          const freshRes = await getFreshDocenteSessionAction(session.email);
          if (freshRes.success) {
            session = freshRes.data;
            localStorage.setItem('docente_session', JSON.stringify(session));
          }
        }

        // Validar Estado de la Cuenta
        if (getAccountStateFromSession(session as Record<string, unknown>) !== 'ACTIVA') {
          showRestrictedResolution(evalTarget, session, 'SUBSCRIPTION_INACTIVE');
          return;
        }

        // Verificación Autorizada Canónica de Especialidad y Niveles (Soporte Multi-Especialidad)
        const accessCheck = checkDocenteSpecialtyAccess(session, evalTarget, Boolean(adminSessionStr));
        if (!accessCheck.hasAccess) {
          showRestrictedResolution(evalTarget, session);
          return;
        }
      } catch (err) {
        console.error('Error al validar acceso de resolución:', err);
      }

      triggerOpenResource(evaluationId, resourceType);
    }
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
      const tipoLower = (item.tipoCuadernillo || '').toLowerCase().trim();
      const espLower = (item.especialidad || '').toLowerCase().trim();
      const titleLower = (item.titulo || '').toLowerCase().trim();

      if (tipoLower.includes('conocimiento') || tipoLower.includes('curricular') || tipoLower.includes('pedagog')) {
        return false;
      }

      return (
        tipoLower.includes('habilidades generales') ||
        espLower.includes('habilidades generales') ||
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
      const tipoLower = (item.tipoCuadernillo || '').toLowerCase().trim();
      const espLower = (item.especialidad || '').toLowerCase().trim();
      const titleLower = (item.titulo || '').toLowerCase().trim();

      if (tipoLower.includes('conocimiento') || tipoLower.includes('curricular') || tipoLower.includes('pedagog')) {
        return true;
      }

      const isHg = (
        tipoLower.includes('habilidades generales') ||
        espLower.includes('habilidades generales') ||
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

  const currentCategoryData = React.useMemo(() => {
    if (nombramientoCategoryTab === 'HABILIDADES_GENERALES') {
      return {
        badge: '🧠 COMPRENSIÓN LECTORA Y RAZONAMIENTO LÓGICO',
        title: 'Cuadernillos de Habilidades Generales',
        subtitle: 'Subpruebas oficiales MINEDU de Comprensión Lectora y Razonamiento Lógico Matemático.',
        list: habGeneralesList,
        emptyMsg: 'No hay cuadernillos de Habilidades Generales para la combinación seleccionada.',
      };
    }
    if (nombramientoCategoryTab === 'CONOCIMIENTOS_CURRICULARES') {
      return {
        badge: '📘 ESPECIALIDAD Y PEDAGOGÍA',
        title: 'Cuadernillos de Conocimientos Curriculares y Pedagógicos',
        subtitle: 'Evaluaciones de conocimientos disciplinares, didácticos y pedagógicos del nivel y área.',
        list: curricularesPedagogicosList,
        emptyMsg: 'No hay cuadernillos de Conocimientos Curriculares y Pedagógicos para la combinación seleccionada.',
      };
    }
    // 'TODOS'
    return {
      badge: '✨ REPOSITORIO COMPLETO',
      title: 'Todos los Cuadernillos de Evaluación',
      subtitle: 'Evaluaciones oficiales completas disponibles para la selección actual.',
      list: evaluaciones,
      emptyMsg: 'No hay cuadernillos disponibles para la combinación seleccionada.',
    };
  }, [nombramientoCategoryTab, habGeneralesList, curricularesPedagogicosList, evaluaciones]);

  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xs font-extrabold text-slate-400">
        Verificando acceso a la plataforma...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-16">
      {/* Banner de Cuenta Regresiva de 24h (Solo para usuarios con rol de prueba gratis) */}
      <TrialCountdownHeader />

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
                  Ingresa tu correo autorizado para recibir tu código de acceso y consultar o descargar todo el material oficial MINEDU.
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
          <a href="/cuadernillos" className="hover:text-gray-700 dark:hover:text-slate-300 transition-colors">Inicio</a>
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
          activeSubcategoria={nombramientoCategoryTab}
          onSubcategoriaChange={(sub) => setNombramientoCategoryTab(sub)}
          availableAnios={availableAnios}
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
              {!isSelectionComplete
                ? 'Esperando selección'
                : `${evaluaciones.length} ${evaluaciones.length === 1 ? 'material encontrado' : 'materiales encontrados'}`}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-56 bg-gray-200/80 dark:bg-slate-800 rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : !isSelectionComplete ? (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center text-xl shadow-xs">
                📋
              </div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                {guideMessage}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Usa los filtros superiores para elegir tu modalidad, nivel educativo y especialidad para desplegar únicamente los exámenes que correspondan a tu perfil.
              </p>
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No se encontraron cuadernillos para esta combinación
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Prueba cambiando de modalidad, nivel, especialidad o limpiando los filtros.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-block"
              >
                Limpiar filtros
              </button>
            </div>
          ) : isNombramiento ? (
            /* LÓGICA ESTRUCTURADA Y UNIFICADA PARA NOMBRAMIENTO */
            <div className="space-y-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-purple-200/90 dark:border-purple-900/40 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-purple-100 dark:border-purple-900/30 pb-4">
                <div className="flex flex-col space-y-1.5 min-w-0">
                  <div className="self-start inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800">
                    <span>{currentCategoryData.badge}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {currentCategoryData.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-auto">
                  {/* Botones Tipo Pestaña (Pills) para Subpruebas con Opción "Ver Todos / Ver Ambos" */}
                  {showSubpruebasHeaderSelector && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNombramientoCategoryTab('TODOS')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                          nombramientoCategoryTab === 'TODOS'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                        }`}
                      >
                        <span>✨</span>
                        <span>Ver Todos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNombramientoCategoryTab('HABILIDADES_GENERALES')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                          nombramientoCategoryTab === 'HABILIDADES_GENERALES'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                        }`}
                      >
                        <span>🧠</span>
                        <span>Habilidades Generales</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNombramientoCategoryTab('CONOCIMIENTOS_CURRICULARES')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                          (nombramientoCategoryTab as string) === 'CONOCIMIENTOS_CURRICULARES'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                        }`}
                      >
                        <span>📚</span>
                        <span>Conocimientos Curriculares y Pedagógicos</span>
                      </button>
                    </div>
                  )}

                  <span className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold">
                    {currentCategoryData.list.length} {currentCategoryData.list.length === 1 ? 'cuadernillo' : 'cuadernillos'}
                  </span>
                </div>
              </div>

              {currentCategoryData.list.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  {currentCategoryData.list.map((evaluacion) => (
                    <EvaluationCard
                      key={evaluacion.id}
                      evaluacion={evaluacion}
                      onOpenResource={handleOpenResource}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-dashed border-purple-200 dark:border-purple-900/40 text-slate-500 dark:text-slate-400 space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentCategoryData.emptyMsg}
                  </p>
                  {nombramientoCategoryTab !== 'TODOS' && (
                    <button
                      type="button"
                      onClick={() => setNombramientoCategoryTab('TODOS')}
                      className="text-xs font-black text-purple-600 dark:text-purple-400 hover:underline cursor-pointer inline-flex items-center space-x-1"
                    >
                      <span>Ver Todos los Cuadernillos &rarr;</span>
                    </button>
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

        {/* Nota Aclaratoria Oficial para Docentes Logueados (Visualización Única) */}
        <DocenteFooterNotice />
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

      <ResourceNoticeModal
        isOpen={noticeModal.isOpen}
        onClose={() => setNoticeModal({ isOpen: false, noticeType: null })}
        noticeType={noticeModal.noticeType}
        docenteEmail={docenteEmail}
      />

      <RestrictedAccessModal
        isOpen={restrictedModal.isOpen}
        onClose={() => setRestrictedModal({ isOpen: false, evaluationLabel: '', docenteAreas: [], accountState: 'ACTIVA', reason: 'PROFILE_MISMATCH' })}
        evaluationLabel={restrictedModal.evaluationLabel}
        docenteAreas={restrictedModal.docenteAreas}
        docenteNombre={restrictedModal.docenteNombre}
        docenteEmail={restrictedModal.docenteEmail}
        accountState={restrictedModal.accountState}
        reason={restrictedModal.reason}
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
