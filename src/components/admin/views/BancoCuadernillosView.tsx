// src/components/admin/views/BancoCuadernillosView.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  getAniosAction,
  createAnioAction,
  deleteAnioAction,
  createEvaluacionAction,
  createEvaluacionesMasivasAction,
  getEvaluacionesAction,
  deleteEvaluacionAction,
  deleteEvaluacionesMasivasAction,
  toggleEvaluacionEstadoAction,
  setEvaluacionEstadoAction,
  updateEvaluacionesEstadoMasivoAction,
  regularizarEstadosExamenesAction,
  depurarDuplicadosEvaluacionesAction,
} from '@/services/evaluacionesService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo, Evaluacion, getEvaluacionSignature } from '@/types/evaluacion';
import { formatEvaluationTitle } from '@/lib/evaluationPresentation';
import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ESPECIALIDADES_DIRECTIVOS_LIST,
  TIPOS_CUADERNILLO_NOMBRAMIENTO,
  CATEGORIAS_NOMBRAMIENTO_DOCENTE,
  CategoriaNombramiento,
  ModalidadKey,
} from '@/data/cascadingData';

import { EditEvaluationModal } from '../modals/EditEvaluationModal';
import { UniversalDocViewer } from '@/components/cuadernillos/UniversalDocViewer';

interface DocumentState {
  file: File | null;
  base64Url: string;
  status: 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
}

interface PdfDocItem {
  id: string;
  label: string;
  url: string;
}

function cleanNoAplicaText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/NO_APLICA\s*[-•]?\s*/gi, '')
    .replace(/No Aplica \/ Cargos Directivos\s*[-•]?\s*/gi, '')
    .replace(/No Aplica\s*[-•]?\s*/gi, '')
    .trim();
}

// Función helper para remover tildes y diacríticos
const normalizeText = (text?: string | null): string => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const BancoCuadernillosView: React.FC = () => {
  const [editingEvaluacionModalItem, setEditingEvaluacionModalItem] = useState<Evaluacion | null>(null);
  // 1. Clasificación Pedagógica con Jerarquía en Cascada (Valores iniciales en blanco)
  const [proceso, setProceso] = useState<ProcesoMinedu | ''>('');
  const [modalidad, setModalidad] = useState<ModalidadEducativa | ''>('');
  const [nivel, setNivel] = useState<NivelEducativo | ''>('');
  const [area, setArea] = useState<string>('');

  // Gestión de Años desde PostgreSQL Local
  const [listaAnios, setListaAnios] = useState<string[]>(['2025', '2024', '2023', '2022', '2021', '2019', '2018', '2017', '2015', '2014']);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('');
  const [aniosSeleccionados, setAniosSeleccionados] = useState<string[]>(['2024']);
  const [nuevoAnioInput, setNuevoAnioInput] = useState<string>('');

  // Control Combobox Dropdown para Directivos
  const [isDirectivosDropdownOpen, setIsDirectivosDropdownOpen] = useState<boolean>(false);
  const directivosDropdownRef = useRef<HTMLDivElement | null>(null);

  const [fuente, setFuente] = useState('Prueba Única Nacional MINEDU');
  const [tipoCuadernillo, setTipoCuadernillo] = useState<string>('');

  // Control de Selección Múltiple Condicional para "Habilidades Generales"
  const [selectedCategories, setSelectedCategories] = useState<CategoriaNombramiento[]>([]);
  const isHabilidadesGenerales = proceso === 'NOMBRAMIENTO_DOCENTE' && tipoCuadernillo === 'Habilidades Generales';

  // Limpiar selección si se desactiva "Habilidades Generales" o preseleccionar EBR por conveniencia
  useEffect(() => {
    if (!isHabilidadesGenerales) {
      setSelectedCategories([]);
    } else if (selectedCategories.length === 0) {
      // Por conveniencia al activar, preseleccionar las de EBR
      setSelectedCategories(CATEGORIAS_NOMBRAMIENTO_DOCENTE.filter((c) => c.grupo.startsWith('EBR')));
    }
  }, [isHabilidadesGenerales]);

  // Agrupamiento estructurado de categorías para la grilla de checkboxes
  const categoryGroups = useMemo(() => {
    const groups: { [key: string]: CategoriaNombramiento[] } = {
      'EBR Inicial': [],
      'EBR Primaria': [],
      'EBR Secundaria': [],
      'EBA': [],
      'EBE': [],
      'CETPRO': [],
    };
    CATEGORIAS_NOMBRAMIENTO_DOCENTE.forEach((cat) => {
      if (groups[cat.grupo]) {
        groups[cat.grupo].push(cat);
      }
    });
    return groups;
  }, []);

  const handleToggleCategory = (cat: CategoriaNombramiento) => {
    setSelectedCategories((prev) =>
      prev.some((c) => c.id === cat.id) ? prev.filter((c) => c.id !== cat.id) : [...prev, cat]
    );
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(CATEGORIAS_NOMBRAMIENTO_DOCENTE);
  };

  const handleSelectOnlyEbr = () => {
    setSelectedCategories(CATEGORIAS_NOMBRAMIENTO_DOCENTE.filter((c) => c.grupo.startsWith('EBR')));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleRemoveCategory = (catId: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  // Click outside listener para el dropdown de Directivos
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        directivosDropdownRef.current &&
        !directivosDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDirectivosDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Opciones filtradas de Directivos para Combobox
  const filteredDirectivosOptions = useMemo(() => {
    if (!area.trim()) return ESPECIALIDADES_DIRECTIVOS_LIST;
    const term = normalizeText(area);
    return ESPECIALIDADES_DIRECTIVOS_LIST.filter((opt) => normalizeText(opt).includes(term));
  }, [area]);

  // Handlers para Selección Múltiple de Años (Directivos)
  const handleToggleYear = (year: string) => {
    setAniosSeleccionados((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleSelectAllYears = () => {
    setAniosSeleccionados([...listaAnios]);
  };

  const handleClearYears = () => {
    setAniosSeleccionados([]);
  };

  const handleSelectLast3Years = () => {
    const last3 = [...listaAnios].slice(0, 3);
    setAniosSeleccionados(last3);
  };

  // 2. Archivos PDF Locales
  const [cuadernilloState, setCuadernilloState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [resolucionState, setResolucionState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [clavesState, setClavesState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });

  // Orígenes de cada documento (MINEDU, AVEND, OTRO) modificables por el Administrador
  const [origenCuadernillo, setOrigenCuadernillo] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');
  const [origenResolucion, setOrigenResolucion] = useState<'AVEND' | 'MINEDU' | 'OTRO'>('AVEND');
  const [origenClaves, setOrigenClaves] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');

  // Códigos de Examen independientes para trazabilidad
  const [codigoCuadernillo, setCodigoCuadernillo] = useState('');
  const [codigoResolucion, setCodigoResolucion] = useState('');
  const [codigoClaves, setCodigoClaves] = useState('');

  // 3. Estado de Evaluaciones Existentes para Detección Automática por Filtros
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [selectedEvaluationIds, setSelectedEvaluationIds] = useState<string[]>([]);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [hasCuadernilloError, setHasCuadernilloError] = useState<boolean>(false);
  const [hasClavesError, setHasClavesError] = useState<boolean>(false);
  const [duplicateWarningModal, setDuplicateWarningModal] = useState<{
    isOpen: boolean;
    existingExam: Evaluacion | null;
    targetEstado: 'PUBLICADO' | 'BORRADOR';
  }>({
    isOpen: false,
    existingExam: null,
    targetEstado: 'BORRADOR',
  });
  const [draftSavedModal, setDraftSavedModal] = useState<{
    isOpen: boolean;
    titulo?: string;
    anio?: string | number;
    hasCuadernillo: boolean;
    hasClaves: boolean;
    hasResolucion: boolean;
  }>({
    isOpen: false,
    hasCuadernillo: false,
    hasClaves: false,
    hasResolucion: false,
  });
  const [publishBlockedModal, setPublishBlockedModal] = useState<{
    isOpen: boolean;
    exam: Evaluacion | null;
    missingCuadernillo: boolean;
    missingClaves: boolean;
  }>({
    isOpen: false,
    exam: null,
    missingCuadernillo: false,
    missingClaves: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado del buscador del historial en tiempo real
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Evaluaciones filtradas por el buscador en tiempo real
  const filteredEvaluaciones = useMemo(() => {
    if (!searchQuery.trim()) return evaluaciones;
    const term = normalizeText(searchQuery);

    return evaluaciones.filter((item) => {
      const tituloNorm = normalizeText(item.titulo);
      const codigoCuadNorm = normalizeText(item.codigoCuadernillo || item.resources?.codigoCuadernillo);
      const codigoResolNorm = normalizeText(item.codigoResolucion || item.resources?.codigoResolucion);
      const codigoClavNorm = normalizeText(item.codigoClaves || item.resources?.codigoClaves);
      const procesoNorm = normalizeText(item.proceso);
      const modalidadNorm = normalizeText(item.modalidad);
      const nivelNorm = normalizeText(item.nivel);
      const areaNorm = normalizeText(item.especialidad || (item as any).area);
      const anioStr = item.anio ? String(item.anio) : '';

      return (
        tituloNorm.includes(term) ||
        codigoCuadNorm.includes(term) ||
        codigoResolNorm.includes(term) ||
        codigoClavNorm.includes(term) ||
        procesoNorm.includes(term) ||
        modalidadNorm.includes(term) ||
        nivelNorm.includes(term) ||
        areaNorm.includes(term) ||
        anioStr.includes(term)
      );
    });
  }, [evaluaciones, searchQuery]);

  // Paginación fija de 20 en 20 items para el historial del administrador
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Resetear a página 1 cuando cambia el filtro de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredEvaluaciones.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEvaluaciones = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredEvaluaciones.slice(start, start + itemsPerPage);
  }, [filteredEvaluaciones, safeCurrentPage, itemsPerPage]);

  // Modal Visor Multidocumento con Pestañas
  const [multiDocModal, setMultiDocModal] = useState<{
    isOpen: boolean;
    title: string;
    docs: PdfDocItem[];
    activeDocId: string;
  }>({
    isOpen: false,
    title: '',
    docs: [],
    activeDocId: '',
  });
  const [isMultiDocLoading, setIsMultiDocLoading] = useState<boolean>(true);
  // Modal de Confirmación al Publicar sin Claves Oficiales
  const [confirmPublishNoClavesModal, setConfirmPublishNoClavesModal] = useState<boolean>(false);
  const [confirmPublishExamId, setConfirmPublishExamId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadEvaluaciones = async () => {
    const res = await getEvaluacionesAction({ proceso: 'TODOS', modalidad: 'TODOS', nivel: 'TODOS', includeDrafts: true });
    if (res.success) {
      setEvaluaciones(res.data);
    }
  };

  // Función interna de guardado y persistencia
  const executeSaveEvaluacion = async (targetIdToUse?: string | null, estadoTarget: 'PUBLICADO' | 'BORRADOR' = 'BORRADOR') => {
    const nivelFinal = requiresNivel ? (nivel || 'NO_APLICA') : ((modalidad as string) === 'EBE' ? 'NO_APLICA' : (nivel || 'NO_APLICA'));
    const areaFinal = requiresArea ? area : ((modalidad as string) === 'EBE' ? 'EBE / GENERAL' : (area || 'General'));

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      const finalId = targetIdToUse || editingEvaluationId;
      if (finalId && proceso !== 'ACCESO_CARGOS_DIRECTIVOS') {
        formData.append('id', finalId);
      }
      formData.append('proceso', proceso);
      formData.append('modalidad', modalidad || 'EBR');
      formData.append('nivel', nivelFinal);
      formData.append('area', areaFinal);
      if (proceso === 'NOMBRAMIENTO_DOCENTE' && tipoCuadernillo.trim()) {
        formData.append('tipoCuadernillo', tipoCuadernillo.trim());
      }
      if (isHabilidadesGenerales && selectedCategories.length > 0) {
        formData.append('categorias', JSON.stringify(selectedCategories));
      }
      if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
        const yearsToUse = aniosSeleccionados.length > 0 ? aniosSeleccionados : (anioSeleccionado ? [anioSeleccionado] : ['2024']);
        formData.append('anios', JSON.stringify(yearsToUse));
        formData.append('anio', String(yearsToUse[0]));
      } else {
        formData.append('anio', String(anioSeleccionado));
      }
      formData.append('estado', estadoTarget);
      if (origenCuadernillo) formData.append('origenCuadernillo', origenCuadernillo);
      if (origenResolucion) formData.append('origenResolucion', origenResolucion);
      if (origenClaves) formData.append('origenClaves', origenClaves);
      if (codigoCuadernillo.trim()) formData.append('codigoCuadernillo', codigoCuadernillo.trim());
      if (codigoResolucion.trim()) formData.append('codigoResolucion', codigoResolucion.trim());
      if (codigoClaves.trim()) formData.append('codigoClaves', codigoClaves.trim());

      // Adjuntar archivos reales (PDF, Excel, Word, PPT, Imágenes)
      if (cuadernilloState.file) {
        formData.append('fileCuadernillo', cuadernilloState.file);
      } else if (cuadernilloState.base64Url && !cuadernilloState.base64Url.startsWith('blob:')) {
        formData.append('urlCuadernillo', cuadernilloState.base64Url);
      }

      if (resolucionState.file) {
        formData.append('fileResolucion', resolucionState.file);
      } else if (resolucionState.base64Url && !resolucionState.base64Url.startsWith('blob:')) {
        formData.append('urlResolucion', resolucionState.base64Url);
      }

      if (clavesState.file) {
        formData.append('fileClaves', clavesState.file);
      } else if (clavesState.base64Url && !clavesState.base64Url.startsWith('blob:')) {
        formData.append('urlClaves', clavesState.base64Url);
      }

      const res = await fetch('/api/evaluaciones/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setIsRedAlertDismissed(true);
        setConfirmPublishNoClavesModal(false);
        const countInfo = data.data?.count ? ` (${data.data.count} años sincronizados)` : '';
        showToast(
          estadoTarget === 'PUBLICADO'
            ? `🚀 ¡Examen publicado con éxito en el catálogo docente${countInfo}!`
            : `💾 Examen guardado en Borrador correctamente${countInfo}.`
        );
        setEditingEvaluationId(null);
        setCuadernilloState({ file: null, base64Url: '', status: 'IDLE' });
        setResolucionState({ file: null, base64Url: '', status: 'IDLE' });
        setClavesState({ file: null, base64Url: '', status: 'IDLE' });
        await loadEvaluaciones();
      } else {
        showToast(`❌ Error: ${data.error || 'No se pudo guardar la evaluación'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error de conexión: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar Examen con Validación Dura y Detección de Duplicados (6 Criterios)
  const handleSaveEvaluacion = async (estadoTarget: 'PUBLICADO' | 'BORRADOR' = 'BORRADOR', forcePublishNoClaves: boolean = false) => {
    if (!proceso) {
      showToast('⚠️ Selecciona el Proceso Evaluativo antes de guardar.');
      return;
    }

    // VALIDACIÓN ESTRICTA SOLO AL PUBLICAR AL CATÁLOGO DOCENTE
    if (estadoTarget === 'PUBLICADO') {
      const tieneCuadernillo = (cuadernilloState.status === 'SUCCESS' && Boolean(cuadernilloState.file)) || Boolean(editingEvaluationId && (cuadernilloState.base64Url || cuadernilloState.status === 'SUCCESS'));
      const tieneClaves = (clavesState.status === 'SUCCESS' && Boolean(clavesState.file)) || Boolean(editingEvaluationId && (clavesState.base64Url || clavesState.status === 'SUCCESS'));

      if (!tieneCuadernillo) {
        setHasCuadernilloError(true);
        showToast('⚠️ Para publicar este examen en el catálogo docente, es obligatorio adjuntar el archivo del Cuadernillo.');
        return;
      }

      // Si falta la clave y no se ha confirmado: Desplegar Modal de Confirmación Preventiva
      if (!tieneClaves && !forcePublishNoClaves) {
        setConfirmPublishNoClavesModal(true);
        return;
      }
      // Nota: La Resolución es totalmente opcional para publicar.
    }

    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      const hasAnyYear = aniosSeleccionados.length > 0 || Boolean(anioSeleccionado);
      if (!hasAnyYear) {
        showToast('⚠️ Selecciona al menos un Año de evaluación para Directivos.');
        return;
      }
      if (!area.trim()) {
        showToast('⚠️ Ingresa o selecciona el Cargo a postular.');
        return;
      }
    } else if (isHabilidadesGenerales) {
      if (selectedCategories.length === 0) {
        showToast('⚠️ Selecciona al menos una categoría para la asignación transversal de Habilidades Generales.');
        return;
      }
      if (!anioSeleccionado) {
        showToast('⚠️ Selecciona el Año de la evaluación.');
        return;
      }
    } else {
      if (!modalidad) {
        showToast('⚠️ Selecciona la Modalidad Educativa.');
        return;
      }
      if (requiresNivel && !nivel) {
        showToast('⚠️ Selecciona el Nivel Educativo.');
        return;
      }
      if (requiresArea && !area) {
        showToast('⚠️ Selecciona el Área o Cargo a postular.');
        return;
      }
      if (!anioSeleccionado) {
        showToast('⚠️ Selecciona el Año de la evaluación.');
        return;
      }

      if (requiresArea && !areasDisponibles.includes(area)) {
        showToast(`⚠️ El área "${area}" no es válida para el nivel seleccionado.`);
        return;
      }
    }

    const nivelFinal = requiresNivel ? (nivel || 'NO_APLICA') : ((modalidad as string) === 'EBE' ? 'NO_APLICA' : (nivel || 'NO_APLICA'));
    const areaFinal = requiresArea ? area : ((modalidad as string) === 'EBE' ? 'EBE / GENERAL' : (area || 'General'));

    // DETECCIÓN RIGUROSA DE DUPLICADOS (6 CRITERIOS EXACTOS - CERO FALSOS POSITIVOS)
    if (!editingEvaluationId && !isHabilidadesGenerales && proceso !== 'ACCESO_CARGOS_DIRECTIVOS') {
      const currentSig = getEvaluacionSignature({
        proceso,
        modalidad: modalidad || 'EBR',
        nivel: nivelFinal,
        area: areaFinal,
        anio: anioSeleccionado,
        tipoCuadernillo: tipoCuadernillo.trim() || null,
      });

      const duplicateExam = evaluaciones.find((e) => {
        const eSig = getEvaluacionSignature({
          proceso: e.proceso,
          modalidad: e.modalidad,
          nivel: e.nivel,
          area: e.especialidad || (e as any).area || '',
          anio: e.anio,
          tipoCuadernillo: e.tipoCuadernillo,
        });
        return eSig === currentSig;
      });

      if (duplicateExam) {
        setDuplicateWarningModal({
          isOpen: true,
          existingExam: duplicateExam,
          targetEstado: estadoTarget,
        });
        return;
      }
    }

    await executeSaveEvaluacion(editingEvaluationId, estadoTarget);
  };

  const handleToggleEvaluacionEstado = async (id: string, forcePublishNoClaves: boolean = false) => {
    const targetExam = evaluaciones.find((e) => e.id === id);
    const isCurrentlyDraft = targetExam?.estado === 'BORRADOR';

    if (isCurrentlyDraft) {
      const hasCuadernillo = Boolean(
        targetExam?.resources?.cuadernilloKey ||
        (targetExam as any)?.urlCuadernillo
      );
      const hasClaves = Boolean(
        targetExam?.resources?.clavesKey ||
        (targetExam as any)?.urlClaves
      );

      if (!hasCuadernillo) {
        showToast('⚠️ Para publicar este examen en el catálogo docente, es obligatorio que cuente con su Cuadernillo.');
        return;
      }

      if (!hasClaves && !forcePublishNoClaves) {
        setConfirmPublishExamId(id);
        setConfirmPublishNoClavesModal(true);
        return;
      }
    }

    const res = await toggleEvaluacionEstadoAction(id);
    if (res.success) {
      showToast(`⚡ Estado actualizado a ${res.data.estado}`);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handlePublicarEvaluacion = async (id: string, forcePublishNoClaves: boolean = false) => {
    const targetExam = evaluaciones.find((e) => e.id === id);
    const hasCuadernillo = Boolean(
      targetExam?.resources?.cuadernilloKey ||
      (targetExam as any)?.urlCuadernillo
    );
    const hasClaves = Boolean(
      targetExam?.resources?.clavesKey ||
      (targetExam as any)?.urlClaves
    );

    if (!hasCuadernillo) {
      showToast('⚠️ Para publicar este examen en el catálogo docente, es obligatorio que cuente con su Cuadernillo.');
      return;
    }

    if (!hasClaves && !forcePublishNoClaves) {
      setConfirmPublishExamId(id);
      setConfirmPublishNoClavesModal(true);
      return;
    }

    const res = await setEvaluacionEstadoAction(id, 'PUBLICADO');
    if (res.success) {
      showToast('🚀 ¡Examen publicado a los docentes exitosamente!');
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleMoverABorradorEvaluacion = async (id: string) => {
    const res = await setEvaluacionEstadoAction(id, 'BORRADOR');
    if (res.success) {
      showToast('📁 Examen movido a borrador (oculto para docentes).');
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState<boolean>(false);

  const handlePublicarMasivo = async () => {
    if (selectedEvaluationIds.length === 0) return;
    const res = await updateEvaluacionesEstadoMasivoAction(selectedEvaluationIds, 'PUBLICADO');
    if (res.success) {
      if (res.data.count < selectedEvaluationIds.length) {
        const omitidos = selectedEvaluationIds.length - res.data.count;
        showToast(`🚀 Se publicaron ${res.data.count} exámenes (${omitidos} omitidos por no tener PDF de cuadernillo cargado).`);
      } else {
        showToast(`🚀 ¡${res.data.count} exámenes publicados exitosamente a docentes!`);
      }
      setSelectedEvaluationIds([]);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleBorradorMasivo = async () => {
    if (selectedEvaluationIds.length === 0) return;
    const res = await updateEvaluacionesEstadoMasivoAction(selectedEvaluationIds, 'BORRADOR');
    if (res.success) {
      showToast(`📁 ${res.data.count} exámenes cambiados a borrador (ocultos).`);
      setSelectedEvaluationIds([]);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleEliminarMasivo = async () => {
    if (selectedEvaluationIds.length === 0) return;
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteMasivo = async () => {
    if (selectedEvaluationIds.length === 0) return;
    const countToDelete = selectedEvaluationIds.length;
    const idsToDelete = [...selectedEvaluationIds];

    // Purga y Actualización React en 0ms
    setEvaluaciones((prev) => prev.filter((e) => !idsToDelete.includes(e.id)));
    setSelectedEvaluationIds([]);
    setIsConfirmDeleteModalOpen(false);

    const res = await deleteEvaluacionesMasivasAction(idsToDelete);
    if (res.success) {
      showToast(`🗑️ ¡${countToDelete} exámenes eliminados permanentemente!`);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
      await loadEvaluaciones();
    }
  };

  const isAllCurrentPageSelected =
    paginatedEvaluaciones.length > 0 &&
    paginatedEvaluaciones.every((e) => selectedEvaluationIds.includes(e.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedEvaluaciones.map((e) => e.id));
      setSelectedEvaluationIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedEvaluationIds, ...paginatedEvaluaciones.map((e) => e.id)]);
      setSelectedEvaluationIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedEvaluationIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    async function initData() {
      await regularizarEstadosExamenesAction();
      const resAnios = await getAniosAction();
      if (resAnios.success && resAnios.data.length > 0) {
        setListaAnios(resAnios.data);
      }
      await loadEvaluaciones();
    }
    initData();
  }, []);

  // Niveles disponibles según la Modalidad activa
  const nivelesDisponibles = useMemo(() => {
    if (!modalidad || proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      return [{ value: 'NO_APLICA' as NivelEducativo, label: 'Sin Nivel Específico (Cargos de Gestión)' }];
    }
    const modKey = modalidad as ModalidadKey;
    const list = NIVELES_POR_MODALIDAD_DATA[modKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
    return list.map((item) => ({ value: item.value as NivelEducativo, label: item.label }));
  }, [proceso, modalidad]);

  // Determina si la modalidad actual requiere obligatoriamente un nivel
  const requiresNivel = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') return false;
    if (!modalidad || (modalidad as string) === 'EBE') return false;
    const modKey = modalidad as ModalidadKey;
    const list = NIVELES_POR_MODALIDAD_DATA[modKey] || [];
    return list.length > 0 && !(list.length === 1 && list[0].value === 'NO_APLICA');
  }, [proceso, modalidad]);

  // Áreas/Especialidades disponibles según la Modalidad y Nivel activos
  const areasDisponibles = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      return ESPECIALIDADES_DIRECTIVOS_LIST;
    }
    if (!modalidad || !nivel || nivel === 'NO_APLICA' || (modalidad as string) === 'EBE') return [];
    const modKey = modalidad as ModalidadKey;
    const areasObj = AREAS_POR_MODALIDAD_NIVEL[modKey];
    if (!areasObj) return [];
    return areasObj[nivel] || [];
  }, [proceso, modalidad, nivel]);

  // Determina si el nivel/modalidad actual requiere obligatoriamente un área/especialidad
  const requiresArea = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') return true;
    if (!modalidad || (modalidad as string) === 'EBE') return false;
    if (!nivel) return false;
    return areasDisponibles.length > 0;
  }, [proceso, modalidad, nivel, areasDisponibles]);

  // DETECCIÓN AUTOMÁTICA EN TIEMPO REAL POR FILTROS (6 CRITERIOS EXACTOS)
  const existingEvaluacion = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') return null;
    if (!proceso || !anioSeleccionado) return null;
    if (requiresArea && !area) return null;
    if (requiresNivel && !nivel) return null;
    if (isHabilidadesGenerales) return null;

    const nivelFinal = requiresNivel ? (nivel || 'NO_APLICA') : ((modalidad as string) === 'EBE' ? 'NO_APLICA' : (nivel || 'NO_APLICA'));
    const areaFinal = requiresArea ? area : ((modalidad as string) === 'EBE' ? 'EBE / GENERAL' : (area || 'General'));

    const currentSig = getEvaluacionSignature({
      proceso,
      modalidad: modalidad || 'EBR',
      nivel: nivelFinal,
      area: areaFinal,
      anio: anioSeleccionado,
      tipoCuadernillo: tipoCuadernillo.trim() || null,
    });

    return evaluaciones.find((e) => {
      const eSig = getEvaluacionSignature({
        proceso: e.proceso,
        modalidad: e.modalidad,
        nivel: e.nivel,
        area: e.especialidad || (e as any).area || '',
        anio: e.anio,
        tipoCuadernillo: e.tipoCuadernillo,
      });
      return eSig === currentSig;
    }) || null;
  }, [evaluaciones, proceso, modalidad, nivel, area, anioSeleccionado, tipoCuadernillo, isHabilidadesGenerales, requiresArea, requiresNivel]);

  // Si el examen ya está repetido y no estamos en modo edición, bloquear subida del lado derecho
  const isDuplicateBlocked = Boolean(existingEvaluacion && !editingEvaluationId);

  // Habilitación de Documentos (si existe en DB o se adjuntaron archivos en la pantalla)
  const hasLocalFiles = cuadernilloState.status === 'SUCCESS' || resolucionState.status === 'SUCCESS' || clavesState.status === 'SUCCESS';
  const isDocAvailable = Boolean(existingEvaluacion || hasLocalFiles);
  const [isRedAlertDismissed, setIsRedAlertDismissed] = useState<boolean>(false);

  useEffect(() => {
    setIsRedAlertDismissed(false);
  }, [proceso, modalidad, nivel, area, anioSeleccionado, tipoCuadernillo]);

  // Cargar datos de examen existente en los controles del formulario para editar / reemplazar PDFs
  const handleCargarEvaluacionParaEditar = (evalTarget: Evaluacion) => {
    if (!evalTarget) return;
    setEditingEvaluationId(evalTarget.id);
    setCodigoCuadernillo(evalTarget.resources?.codigoCuadernillo || evalTarget.codigoCuadernillo || '');
    setCodigoResolucion(evalTarget.resources?.codigoResolucion || evalTarget.codigoResolucion || '');
    setCodigoClaves(evalTarget.resources?.codigoClaves || evalTarget.codigoClaves || '');
    setOrigenCuadernillo((evalTarget.resources?.origenCuadernillo as any) || 'MINEDU');
    setOrigenResolucion((evalTarget.resources?.origenResolucion as any) || 'AVEND');
    setOrigenClaves((evalTarget.resources?.origenClaves as any) || 'MINEDU');
    if (evalTarget.tipoCuadernillo) {
      setTipoCuadernillo(evalTarget.tipoCuadernillo);
    }

    // Cargar rutas existentes y marcar status como 'SUCCESS' para no bloquear el guardado
    const existingPdf = evalTarget.resources?.cuadernilloKey || (evalTarget as any).urlCuadernillo || '';
    if (existingPdf) {
      setCuadernilloState({ file: null, base64Url: existingPdf, status: 'SUCCESS' });
    }
    const existingRes = evalTarget.resources?.resolucionKey || (evalTarget as any).urlResolucion || '';
    if (existingRes) {
      setResolucionState({ file: null, base64Url: existingRes, status: 'SUCCESS' });
    }
    const existingCla = evalTarget.resources?.clavesKey || (evalTarget as any).urlClaves || '';
    if (existingCla) {
      setClavesState({ file: null, base64Url: existingCla, status: 'SUCCESS' });
    }

    showToast(`✏️ Datos de "${formatEvaluationTitle(evalTarget.titulo)}" cargados en el formulario. Puedes modificar datos o reemplazar archivos PDF.`);
  };

  const handleSelectEvaluacionParaEditarFromTable = (item: Evaluacion) => {
    if (!item) return;
    setProceso(item.proceso as ProcesoMinedu);
    setModalidad(item.modalidad as ModalidadEducativa);
    setNivel(item.nivel as NivelEducativo);
    setArea(item.especialidad || (item as any).area || '');
    setAnioSeleccionado(String(item.anio));
    handleCargarEvaluacionParaEditar(item);
    setIsRedAlertDismissed(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProcesoChange = (nuevoProceso: ProcesoMinedu | '') => {
    setEditingEvaluationId(null);
    setProceso(nuevoProceso);
    setTipoCuadernillo('');
    setModalidad('');
    setNivel('');
    setArea('');
    if (nuevoProceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      setModalidad('EBR');
      setNivel('NO_APLICA');
      setArea('');
    }
  };

  const handleModalidadChange = (nuevaModalidad: ModalidadEducativa | '') => {
    setModalidad(nuevaModalidad);
    if ((nuevaModalidad as string) === 'EBE') {
      setNivel('NO_APLICA');
      setArea('');
    } else {
      setNivel('');
      setArea('');
    }
  };

  const handleNivelChange = (nuevoNivel: NivelEducativo | '') => {
    setNivel(nuevoNivel);
    setArea(nuevoNivel === 'INICIAL' ? 'General' : '');
  };

  const handleAgregarAnio = async () => {
    const yearTrimmed = nuevoAnioInput.trim();
    if (!/^\d{4}$/.test(yearTrimmed)) {
      showToast('⚠️ Ingresa un año válido de 4 dígitos (Ej.: 2027)');
      return;
    }

    const res = await createAnioAction(yearTrimmed);
    if (res.success) {
      const nuevaLista = Array.from(new Set([yearTrimmed, ...listaAnios])).sort((a, b) => Number(b) - Number(a));
      setListaAnios(nuevaLista);
      setAnioSeleccionado(yearTrimmed);
      setNuevoAnioInput('');
      showToast(`✨ Año ${yearTrimmed} registrado en el catálogo.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleEliminarAnio = async () => {
    if (listaAnios.length <= 1) {
      showToast('⚠️ Debe existir al menos un año en el catálogo.');
      return;
    }
    const anioABorrar = anioSeleccionado;
    const confirmado = window.confirm(
      `¿Estás seguro de que deseas eliminar el año "${anioABorrar}" del catálogo?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    const res = await deleteAnioAction(anioABorrar);
    if (res.success) {
      const nuevaLista = listaAnios.filter((y) => y !== anioABorrar);
      setListaAnios(nuevaLista);
      setAnioSeleccionado(nuevaLista[0] || '');
      showToast(`🗑️ Año ${anioABorrar} eliminado del catálogo.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Carga de archivo multi-formato (PDF, Excel, Word, PowerPoint, Imágenes)
  const handleFileUpload = (type: 'cuadernillo' | 'resolucion' | 'claves', file: File) => {
    const allowedExtensions = [
      '.pdf',
      '.xlsx',
      '.xls',
      '.docx',
      '.doc',
      '.pptx',
      '.ppt',
      '.csv',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
    ];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      showToast('⚠️ Formato no permitido. Sube archivos en PDF, Excel (.xlsx/.xls), Word (.docx), PowerPoint (.pptx) o Imágenes.');
      return;
    }

    if (type === 'cuadernillo') {
      setHasCuadernilloError(false);
    }
    if (type === 'claves') {
      setHasClavesError(false);
    }

    const setState =
      type === 'cuadernillo'
        ? setCuadernilloState
        : type === 'resolucion'
        ? setResolucionState
        : setClavesState;

    // Generar un Blob URL nativo de respuesta inmediata (0ms de latencia sin congelar la interfaz)
    const blobUrl = URL.createObjectURL(file);
    setState({ file, base64Url: blobUrl, status: 'SUCCESS' });
    showToast(`✔ ${file.name} listo para guardar.`);
  };

  // Helper para identificar formato de archivo (PowerPoint, Excel, Word, Imagen, PDF)
  const getDocTypeInfo = (filenameOrUrl: string) => {
    const clean = filenameOrUrl.toLowerCase().split('?')[0].split('#')[0];
    const ext = clean.substring(clean.lastIndexOf('.'));

    // 📽️ PowerPoint / Presentaciones
    if (['.pptx', '.ppt'].includes(ext)) {
      return {
        label: 'PPTX / PRESENTACIÓN',
        icon: '📽️',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
      };
    }
    // 📊 Excel / Datos
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      return {
        label: ext === '.csv' ? 'CSV / DATOS' : 'EXCEL / TABLA',
        icon: '📊',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      };
    }
    // 📝 Word / Documentos de texto
    if (['.docx', '.doc', '.txt'].includes(ext)) {
      return {
        label: 'WORD / DOCUMENTO',
        icon: '📝',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      };
    }
    // 🖼️ Imágenes
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return {
        label: 'IMAGEN',
        icon: '🖼️',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      };
    }
    // 📄 PDF por defecto
    return {
      label: 'PDF',
      icon: '📄',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    };
  };

  // Abrir Visor Multidocumento con todos los PDF disponibles
  const openMultiDocViewer = (title: string, docsList: PdfDocItem[], defaultDocId?: string) => {
    if (!docsList || docsList.length === 0) {
      showToast('⚠️ No hay documentos PDF cargados para visualizar.');
      return;
    }
    const activeId = defaultDocId && docsList.some((d) => d.id === defaultDocId) ? defaultDocId : docsList[0].id;
    setMultiDocModal({
      isOpen: true,
      title,
      docs: docsList,
      activeDocId: activeId,
    });
  };

  // Botón Principal VISUALIZAR (Recopila todos los PDF del filtro activo)
  const handleVisualizarGeneral = () => {
    const docsList: PdfDocItem[] = [];

    if (cuadernilloState.base64Url) {
      docsList.push({ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: cuadernilloState.base64Url });
    }
    if (resolucionState.base64Url) {
      docsList.push({ id: 'resolucion', label: '📘 Solucionario / Resolución', url: resolucionState.base64Url });
    }
    if (clavesState.base64Url) {
      docsList.push({ id: 'claves', label: '🔑 Claves de Respuestas', url: clavesState.base64Url });
    }

    if (docsList.length === 0 && existingEvaluacion) {
      if (existingEvaluacion.resources?.cuadernilloKey) {
        docsList.push({ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: existingEvaluacion.resources.cuadernilloKey });
      }
      if (existingEvaluacion.resources?.resolucionKey) {
        docsList.push({ id: 'resolucion', label: '📘 Solucionario / Resolución', url: existingEvaluacion.resources.resolucionKey });
      }
      if (existingEvaluacion.resources?.clavesKey) {
        docsList.push({ id: 'claves', label: '🔑 Claves de Respuestas', url: existingEvaluacion.resources.clavesKey });
      }
    }

    if (docsList.length === 0) {
      showToast('⚠️ No se encontraron documentos PDF para esta combinación.');
      return;
    }

    const titleStr = existingEvaluacion ? existingEvaluacion.titulo : `Evaluación MINEDU ${anioSeleccionado} - ${area}`;
    openMultiDocViewer(titleStr, docsList);
  };

  // Visualizar una Evaluación específica de la Tabla del Historial
  const handleVisualizarEvaluacionItem = (evalItem: Evaluacion, targetDocId: string = 'cuadernillo') => {
    const docsList: PdfDocItem[] = [];
    if (evalItem.resources?.cuadernilloKey && !evalItem.resources.cuadernilloKey.includes('ejemplo.pdf')) {
      docsList.push({ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: evalItem.resources.cuadernilloKey });
    }
    if (evalItem.resources?.resolucionKey && !evalItem.resources.resolucionKey.includes('ejemplo.pdf')) {
      docsList.push({ id: 'resolucion', label: '📘 Solucionario / Resolución', url: evalItem.resources.resolucionKey });
    }
    if (evalItem.resources?.clavesKey && !evalItem.resources.clavesKey.includes('ejemplo.pdf')) {
      docsList.push({ id: 'claves', label: '🔑 Claves de Respuestas', url: evalItem.resources.clavesKey });
    }

    if (docsList.length === 0) {
      showToast('⚠️ Este examen no tiene ningún archivo PDF subido actualmente. Puedes cargarlo desde "Editar".');
      return;
    }

    const effectiveDocId = docsList.some((d) => d.id === targetDocId) ? targetDocId : docsList[0].id;
    openMultiDocViewer(evalItem.titulo, docsList, effectiveDocId);
  };

  const handleDeleteEvaluacion = async (id: string, title: string) => {
    const confirmado = window.confirm(
      `¿Estás seguro de que deseas eliminar el examen "${title}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    // Purga y Actualización React en 0ms
    setEvaluaciones((prev) => prev.filter((e) => e.id !== id));
    const res = await deleteEvaluacionAction(id);
    if (res.success) {
      showToast(`🗑️ Examen "${title}" eliminado de la base de datos.`);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
      await loadEvaluaciones();
    }
  };

  const activeDocObj = multiDocModal.docs.find((d) => d.id === multiDocModal.activeDocId) || multiDocModal.docs[0];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-10 sm:pb-16 relative min-w-0">
      {/* Banner Informativo Superior */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
            i
          </span>
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              CLASIFICACIÓN SELECCIONADA ({anioSeleccionado})
            </h2>
            <p className="text-xs text-slate-600 font-medium break-words">
              Modalidad: <strong>{modalidad}</strong>
              {nivel && nivel.toUpperCase() !== 'NO_APLICA' && !nivel.toLowerCase().includes('no aplica') && (
                <> | Nivel: <strong>{nivel}</strong></>
              )}
              | Cargo / Especialidad: <strong className="text-blue-600">{area}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 max-w-full overflow-x-auto">
          <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-2xs">
            {proceso.replace(/_/g, ' ')}
          </span>
          <span className="bg-slate-900 text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-2xs">
            AÑO {anioSeleccionado}
          </span>
        </div>
      </div>

      {/* ALERTA EN MEDIO DE LA PANTALLA FLOTANTE (CENTRADISIMA) */}
      {existingEvaluacion && !isRedAlertDismissed && !editingEvaluationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-rose-950 text-white border-2 border-rose-500 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 space-y-4 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🚨</span>
                <h4 className="text-sm font-black uppercase tracking-wider text-rose-300">
                  ¡ALERTA! ESTE EXAMEN YA SE ENCUENTRA SUBIDO EN EL SISTEMA
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsRedAlertDismissed(true)}
                className="w-8 h-8 rounded-full bg-rose-900/80 hover:bg-rose-800 text-rose-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                title="Cerrar Alerta"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm font-extrabold text-white leading-snug bg-rose-900/60 p-3.5 rounded-2xl border border-rose-800/80">
              {formatEvaluationTitle(existingEvaluacion.titulo)}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg font-black uppercase bg-rose-900 text-rose-200 border border-rose-700">
                Estado: {existingEvaluacion.estado}
              </span>
              <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                existingEvaluacion.resources?.cuadernilloKey ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-rose-900 text-rose-300 border-rose-800'
              }`}>
                Cuadernillo: {existingEvaluacion.resources?.cuadernilloKey ? '✅ Registrado' : '❌ Sin PDF'}
              </span>
              <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                existingEvaluacion.resources?.resolucionKey ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-rose-900 text-rose-300 border-rose-800'
              }`}>
                Resolución: {existingEvaluacion.resources?.resolucionKey ? '✅ Disponible' : '❌ Pendiente'}
              </span>
              <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                existingEvaluacion.resources?.clavesKey ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-rose-900 text-rose-300 border-rose-800'
              }`}>
                Claves: {existingEvaluacion.resources?.clavesKey ? '✅ Disponibles' : '❌ Pendientes'}
              </span>
            </div>

            <div className="pt-2 border-t border-rose-900/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsRedAlertDismissed(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
              >
                Entendido / Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in flex items-center space-x-3">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Rejilla Principal de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: SECCIÓN 1. CLASIFICACIÓN PEDAGÓGICA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
              Clasificación Pedagógica MINEDU
            </h3>
          </div>

          {/* Selector 1: Proceso Evaluativo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              PROCESO EVALUATIVO MINEDU (NIVEL 1) *
            </label>
            <select
              value={proceso}
              onChange={(e) => handleProcesoChange(e.target.value as ProcesoMinedu | '')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="" disabled hidden>-- Selecciona el Proceso Evaluativo --</option>
              <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente (Prueba Única Nacional)</option>
              <option value="ASCENSO_ESCALAFON">Ascenso en la Carrera Pública Magisterial</option>
              <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Cargos Directivos y Especialistas</option>
            </select>
          </div>

          {/* Selector 2: Modalidad Educativa (Siempre Visible) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              MODALIDAD EDUCATIVA (NIVEL 2) *
            </label>
            <select
              value={modalidad}
              disabled={!proceso || proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
              onChange={(e) => handleModalidadChange(e.target.value as ModalidadEducativa | '')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 disabled:opacity-60 cursor-pointer"
            >
              <option value="" disabled hidden>-- Selecciona la Modalidad Educativa --</option>
              <option value="EBR">Educación Básica Regular (EBR)</option>
              <option value="EBA">Educación Básica Alternativa (EBA)</option>
              <option value="EBE">Educación Básica Especial (EBE)</option>
              <option value="CETPRO">Técnico Productivo (CETPRO)</option>
            </select>
          </div>

          {/* Selector 3: Nivel Educativo (Siempre Visible) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              NIVEL EDUCATIVO (NIVEL 3) {requiresNivel ? '*' : ''}
            </label>
            {requiresNivel ? (
              <select
                value={nivel}
                disabled={!modalidad || proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
                onChange={(e) => handleNivelChange(e.target.value as NivelEducativo | '')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-blue-500/80 dark:border-blue-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 disabled:opacity-60 cursor-pointer shadow-2xs"
              >
                <option value="" disabled hidden>-- Selecciona el Nivel Educativo --</option>
                {nivelesDisponibles.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>✓ Sin nivel específico ({(modalidad as string) === 'EBE' ? 'Educación Básica Especial' : 'Aplica a toda la Modalidad'})</span>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  Aplica a toda la Modalidad
                </span>
              </div>
            )}
          </div>

          {/* Selector 4: Área / Especialidad Docente (Siempre Visible) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {proceso === 'ACCESO_CARGOS_DIRECTIVOS'
                ? 'CARGO A POSTULAR / SUBCATEGORÍA *'
                : requiresArea
                ? 'ÁREA / ESPECIALIDAD DOCENTE (NIVEL 4) *'
                : 'ÁREA / ESPECIALIDAD DOCENTE (NIVEL 4)'}
            </label>
            {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
              <div className="relative w-full space-y-1" ref={directivosDropdownRef}>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      setIsDirectivosDropdownOpen(true);
                    }}
                    onFocus={() => setIsDirectivosDropdownOpen(true)}
                    placeholder="Escribe o selecciona el cargo de Directivos (ej. Especialistas: Arte y Cultura)..."
                    className="w-full bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700 rounded-xl p-3 pr-10 text-xs font-bold text-emerald-900 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDirectivosDropdownOpen(!isDirectivosDropdownOpen)}
                    className="absolute right-3 p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isDirectivosDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {isDirectivosDropdownOpen && (
                  <div className="absolute left-0 top-full w-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    {filteredDirectivosOptions.length > 0 ? (
                      filteredDirectivosOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setArea(opt);
                            setIsDirectivosDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <span>{opt}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 font-extrabold uppercase transition-opacity">
                            Seleccionar ↵
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3.5 py-3 text-center">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          No hay sugerencias predefinidas para &quot;{area}&quot;
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          ✓ Se guardará como cargo personalizado de Directivos
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 Puedes elegir una sugerencia de la lista o redactar cualquier cargo libremente.
                </p>
              </div>
            ) : requiresArea ? (
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={!proceso || (!modalidad || !nivel)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="" disabled hidden>
                  -- Selecciona el Área o Especialidad --
                </option>
                {areasDisponibles.map((esp) => (
                  <option key={esp} value={esp}>
                    {esp}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <span>
                  {(modalidad as string) === 'EBE'
                    ? '✓ EBE / GENERAL — Nombramiento Docente EB Educación Básica Especial'
                    : `✓ Sin especialidad específica (${nivel === 'INICIAL' ? 'Nivel Inicial' : nivel || 'General'})`}
                </span>
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase bg-purple-100 dark:bg-purple-900/80 px-2 py-0.5 rounded-md">
                  {(modalidad as string) === 'EBE' ? 'EBE / GENERAL' : 'Aplica a todo el Nivel'}
                </span>
              </div>
            )}
          </div>

          {/* Selector 5: Tipo de Cuadernillo (Exclusivo para Nombramiento Docente) */}
          {proceso === 'NOMBRAMIENTO_DOCENTE' && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                TIPO DE CUADERNILLO
              </label>
              <select
                value={tipoCuadernillo}
                onChange={(e) => setTipoCuadernillo(e.target.value)}
                className="w-full bg-purple-50/70 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 rounded-xl p-3 text-xs font-black text-purple-950 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                <option value="">-- Selecciona el tipo de cuadernillo (Opcional) --</option>
                {TIPOS_CUADERNILLO_NOMBRAMIENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* MÓDULO CONDICIONAL: ASIGNACIÓN MÚLTIPLE TRANSVERSAL (DIRECTAMENTE DEBAJO DE HABILIDADES GENERALES) */}
          {isHabilidadesGenerales && (
            <div className="w-full bg-gradient-to-br from-purple-50 via-purple-50/70 to-indigo-50/80 dark:from-purple-950/40 dark:via-purple-950/20 dark:to-indigo-950/30 border-2 border-purple-300 dark:border-purple-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Encabezado del Módulo y Botones Rápidos */}
              <div className="space-y-2 border-b border-purple-200 dark:border-purple-800 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🏷️</span>
                    <h4 className="text-xs font-black uppercase tracking-wide text-purple-950 dark:text-purple-200">
                      DISTRIBUCIÓN TRANSVERSAL
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-purple-200/90 dark:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                    {selectedCategories.length} de {CATEGORIAS_NOMBRAMIENTO_DOCENTE.length}
                  </span>
                </div>
                <p className="text-[11px] text-purple-900/80 dark:text-purple-300/90 font-medium leading-tight">
                  Al guardar o publicar este cuadernillo, se vinculará automáticamente a todas las especialidades que marques:
                </p>

                {/* Barra de Botones Rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-[10.5px] font-black transition-all shadow-xs cursor-pointer"
                  >
                    ✓ Marcar Todas ({CATEGORIAS_NOMBRAMIENTO_DOCENTE.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyEbr}
                    className="px-2.5 py-1 bg-white dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded-lg text-[10.5px] font-black transition-all cursor-pointer"
                  >
                    ✓ Solo EBR (24)
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllCategories}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-600 border border-slate-300 dark:border-slate-700 rounded-lg text-[10.5px] font-black transition-all cursor-pointer"
                  >
                    ✕ Desmarcar
                  </button>
                </div>
              </div>

              {/* Lista Scrollable de Categorías por Modalidad/Nivel */}
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {Object.entries(categoryGroups).map(([groupName, cats]) => {
                  if (cats.length === 0) return null;
                  const allInGroupSelected = cats.every((c) => selectedCategories.some((sc) => sc.id === c.id));
                  const selectedInGroupCount = cats.filter((c) => selectedCategories.some((sc) => sc.id === c.id)).length;

                  return (
                    <div
                      key={groupName}
                      className="bg-white/95 dark:bg-slate-900/90 border border-purple-200 dark:border-purple-900 rounded-xl p-3 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="text-[11px] font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
                          <span>{groupName}</span>
                          <span className="text-[9.5px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                            {selectedInGroupCount}/{cats.length}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (allInGroupSelected) {
                              setSelectedCategories((prev) => prev.filter((sc) => !cats.some((c) => c.id === sc.id)));
                            } else {
                              const toAdd = cats.filter((c) => !selectedCategories.some((sc) => sc.id === c.id));
                              setSelectedCategories((prev) => [...prev, ...toAdd]);
                            }
                          }}
                          className="text-[10px] font-extrabold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          {allInGroupSelected ? 'Desmarcar' : 'Marcar todo'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {cats.map((cat) => {
                          const isChecked = selectedCategories.some((c) => c.id === cat.id);
                          return (
                            <label
                              key={cat.id}
                              className={`flex items-center space-x-2 p-2 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-all ${
                                isChecked
                                  ? 'bg-purple-100 dark:bg-purple-900/60 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-100 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCategory(cat)}
                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
                              />
                              <span className="leading-tight truncate text-[10.5px]" title={cat.label}>
                                {cat.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chips Resumen de Asignación */}
              <div className="bg-white/95 dark:bg-slate-900/90 border border-purple-200 dark:border-purple-800 rounded-xl p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[10.5px] font-black text-purple-950 dark:text-purple-200 uppercase">
                  <span>📌 Resumen: {selectedCategories.length} especialidades</span>
                  {selectedCategories.length === 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold normal-case text-[10px]">
                      ⚠️ Marca al menos una
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedCategories.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">Ninguna categoría seleccionada aún.</span>
                  ) : (
                    selectedCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-950 dark:text-purple-200 text-[10px] font-bold border border-purple-300 dark:border-purple-700"
                      >
                        <span className="truncate max-w-[120px]">{cat.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="w-3.5 h-3.5 rounded-full bg-purple-300 dark:bg-purple-800 hover:bg-rose-500 hover:text-white text-purple-950 flex items-center justify-center text-[9px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selector 6: Año del Proceso (Multi-select para Directivos, Single-select para Nombramiento/Ascenso) */}
          {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
            <div className="space-y-3 p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  AÑOS DE EVALUACIÓN APLICABLES (DIRECTIVOS) *
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllYears}
                    className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 cursor-pointer"
                  >
                    Seleccionar Todos
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleSelectLast3Years}
                    className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 cursor-pointer"
                  >
                    Últimos 3 Años
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearYears}
                    className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Grid de Chips de Años */}
              <div className="flex flex-wrap gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                {listaAnios.map((year) => {
                  const isSelected = aniosSeleccionados.includes(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleToggleYear(year)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 scale-105 border border-emerald-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{year}</span>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Contador de Años Seleccionados */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {aniosSeleccionados.length === 0
                    ? '⚠️ No has seleccionado ningún año para Directivos'
                    : `✓ ${aniosSeleccionados.length} ${aniosSeleccionados.length === 1 ? 'año seleccionado' : 'años seleccionados'}: ${[...aniosSeleccionados].sort((a, b) => Number(b) - Number(a)).join(', ')}`}
                </span>
              </div>

              {/* Añadir nuevo año */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  placeholder="Agregar nuevo año (Ej: 2026)"
                  value={nuevoAnioInput}
                  onChange={(e) => setNuevoAnioInput(e.target.value)}
                  maxLength={4}
                  className="flex-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const newYearVal = nuevoAnioInput.trim();
                    await handleAgregarAnio();
                    if (newYearVal.length === 4) {
                      setAniosSeleccionados((prev) => Array.from(new Set([...prev, newYearVal])));
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  + AÑO
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                AÑO DE LA EVALUACIÓN (NIVEL 5) *
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={anioSeleccionado}
                  onChange={(e) => setAnioSeleccionado(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="" disabled hidden>-- Selecciona el Año --</option>
                  {listaAnios.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleEliminarAnio}
                  title="Eliminar año seleccionado"
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs p-3 rounded-xl transition-colors cursor-pointer"
                >
                  🗑️
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  placeholder="Año nuevo (Ej: 2027)"
                  value={nuevoAnioInput}
                  onChange={(e) => setNuevoAnioInput(e.target.value)}
                  maxLength={4}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAgregarAnio}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  + AÑO
                </button>
              </div>
            </div>
          )}

          {/* Campo 6: Fuente Oficial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              FUENTE DE ORIGEN
            </label>
            <input
              type="text"
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          {/* Widget de Previsualización en Tiempo Real de la Tarjeta Miniatura ("Cuadernito") */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-base">👁️</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Previsualización de Tarjeta ("Cuadernito")
                </span>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                En Tiempo Real
              </span>
            </div>

            <div className="flex justify-center items-center py-2">
              {/* Tarjeta Miniatura Fidedigna Minimalista */}
              <div className="w-52 min-h-[220px] bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-col justify-between shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-300/60 dark:border-slate-700/60">
                      <span className="text-[8.5px] font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                        CARGOS DIRECTIVOS
                      </span>
                      <span className="text-xs">🇵🇪</span>
                    </div>

                    <div className="py-2 space-y-1.5">
                      <div>
                        <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block">
                          CATEGORÍA
                        </span>
                        <span className="text-[9.5px] font-black text-gray-900 dark:text-white uppercase leading-tight block mt-0.5 px-1">
                          Acceso a Cargos Directivos y Especialistas
                        </span>
                      </div>

                      <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-1.5">
                        <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block">
                          SUBCATEGORÍA
                        </span>
                        <span className="text-[10px] font-bold text-gray-800 dark:text-slate-200 block leading-snug uppercase px-1 line-clamp-2">
                          {area || 'Directivos y Especialistas'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (!requiresNivel && !requiresArea) ? (
                  /* Caso Solo Modalidad en el Preview Admin: Centrado Verticalmente en el Medio + Tipo de Cuadernillo debajo */
                  <div className="flex-1 flex flex-col justify-center items-center text-center my-auto py-3 space-y-2 w-full">
                    <div className="w-full space-y-0.5">
                      <span className="text-[9px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-widest block">
                        MODALIDAD
                      </span>
                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase leading-snug tracking-tight px-1 block">
                        {(modalidad as string) === 'EBE' ? 'Educación Básica Especial' : (modalidad as string) === 'CETPRO' ? 'Educación Técnico - Productiva' : (modalidad || 'MODALIDAD')}
                      </span>
                    </div>

                    {/* Previsualización en Tiempo Real del Tipo de Cuadernillo Justo Debajo */}
                    {tipoCuadernillo && (
                      <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 w-full space-y-0.5 animate-in fade-in">
                        <span className="text-[8px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                          TIPO DE CUADERNILLO
                        </span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase text-center leading-tight block px-1">
                          {tipoCuadernillo}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-start">
                    {/* MODALIDAD */}
                    <div>
                      <span className="text-[8.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                        MODALIDAD
                      </span>
                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase block mt-0.5">
                        {modalidad || 'MODALIDAD'}
                      </span>
                    </div>

                    {/* NIVEL (Solo si aplica) */}
                    {requiresNivel && nivel && nivel !== 'NO_APLICA' && !nivel.toLowerCase().includes('no aplica') && (nivel as string) !== '—' && (nivel as string) !== '-' && (
                      <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 my-1">
                        <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                          NIVEL
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 text-center block mt-1 capitalize">
                          {nivel.toLowerCase()}
                        </span>
                      </div>
                    )}

                    {/* ESPECIALIDAD (Solo si no es Inicial, requiresArea, área seleccionada y no es redundante con el nivel) */}
                    {requiresArea &&
                      area &&
                      !nivel.toUpperCase().includes('INICIAL') &&
                      area !== 'General' &&
                      area !== 'NO_APLICA' &&
                      area !== '—' &&
                      area !== '-' &&
                      area.toLowerCase().trim() !== nivel.toLowerCase().trim() && (
                      <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 my-1">
                        <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                          ESPECIALIDAD
                        </span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5 line-clamp-2">
                          {area}
                        </span>
                      </div>
                    )}

                    {/* TIPO DE CUADERNILLO (Previsualización en tiempo real) */}
                    {tipoCuadernillo && (
                      <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2 my-1">
                        <span className="text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center block">
                          TIPO DE CUADERNILLO
                        </span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white text-center leading-tight block mt-0.5 line-clamp-2">
                          {tipoCuadernillo}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* PIE DEL CUADERNITO */}
                <div className="border-t border-gray-300/60 dark:border-slate-700/60 pt-2.5 mt-auto flex items-end justify-between w-full">
                  <span className="text-[9px] font-extrabold text-gray-600 dark:text-slate-400 uppercase leading-none tracking-wider">
                    {proceso === 'ACCESO_CARGOS_DIRECTIVOS'
                      ? 'MINEDU'
                      : proceso === 'ASCENSO_ESCALAFON'
                      ? 'CONCURSO DE ASCENSO'
                      : 'CONCURSO DE NOMBRAMIENTO'}
                  </span>
                  <span className="text-sm font-black text-gray-900 dark:text-white leading-none">
                    {proceso === 'ACCESO_CARGOS_DIRECTIVOS'
                      ? (aniosSeleccionados.length > 0
                          ? (aniosSeleccionados.length === 1
                              ? aniosSeleccionados[0]
                              : `${[...aniosSeleccionados].sort((a, b) => Number(b) - Number(a))[0]} (+${aniosSeleccionados.length - 1})`)
                          : (anioSeleccionado || '—'))
                      : (anioSeleccionado || '—')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES INFERIORES CON COMPROBACIÓN TOTAL */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Botón VISUALIZAR */}
              <button
                type="button"
                disabled={!isDocAvailable}
                onClick={handleVisualizarGeneral}
                className={`py-3 px-4 rounded-2xl border-2 font-black text-xs uppercase text-center transition-all cursor-pointer shadow-2xs ${
                  isDocAvailable
                    ? 'border-rose-500 text-rose-600 bg-rose-50/70 hover:bg-rose-100 active:scale-95'
                    : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                }`}
              >
                VISUALIZAR
              </button>

              {/* Botón SÍ HAY / NO HAY DOCUMENTOS CARGADOS */}
              <div
                className={`py-3 px-3 rounded-2xl border-2 font-black text-[11px] uppercase text-center flex items-center justify-center ${
                  isDocAvailable
                    ? 'border-rose-500 text-rose-600 bg-rose-50/70'
                    : 'border-slate-200 text-slate-400 bg-slate-50'
                }`}
              >
                {isDocAvailable ? 'SÍ HAY DOCUMENTOS CARGADOS' : 'NO HAY DOCUMENTOS CARGADOS'}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: SECCIÓN 2. ADJUNTA LOS DOCUMENTOS PDF Y ASIGNA ETIQUETA DE ORIGEN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                  Adjunta los documentos PDF y Asigna su Origen
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Selecciona si el documento proviene de MINEDU, AVEND u otro origen antes de publicar.
              </p>
            </div>

            {/* Aviso si la subida está bloqueada por examen repetido */}
            {isDuplicateBlocked && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-3.5 flex items-center space-x-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold animate-in fade-in">
                <span className="text-base">🔒</span>
                <span>Subida de archivos desactivada: este examen ya se encuentra registrado en el sistema.</span>
              </div>
            )}

            {/* Tarjeta 1: CUADERNILLO MINEDU */}
            <div className={`border-2 rounded-2xl p-4 space-y-3 transition-all ${
              hasCuadernilloError
                ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-md shadow-rose-500/10 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              {hasCuadernilloError && (
                <div className="bg-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center space-x-2 animate-in fade-in">
                  <span>⚠️</span>
                  <span>El archivo del Cuadernillo es OBLIGATORIO para que los docentes puedan descargarlo.</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className={`text-[10px] font-black uppercase ${hasCuadernilloError ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600'}`}>
                    CUADERNILLO * REQUERIDO
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Cuadernillo de la prueba</h4>
                  <p className="text-[11px] text-slate-500">Documento de evaluación (PDF, Word, PPT, Excel).</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {cuadernilloState.status === 'SUCCESS' ? (
                    <label className={`p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 ${isDuplicateBlocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`} title={isDuplicateBlocked ? 'Subida bloqueada: examen ya existe' : 'Reemplazar archivo de cuadernillo'}>
                      <span>🔄</span>
                      <span>Cambiar Archivo</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('cuadernillo', f);
                        }}
                      />
                    </label>
                  ) : (
                    <label className={`font-bold text-xs rounded-xl px-4 py-2.5 shadow-2xs transition-colors shrink-0 flex items-center space-x-1.5 ${isDuplicateBlocked ? 'bg-slate-400 dark:bg-slate-600 text-slate-200 opacity-50 cursor-not-allowed pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'}`}>
                      <span>📄</span>
                      <span>
                        {cuadernilloState.status === 'UPLOADING' ? 'Cargando...' : 'Adjuntar Archivo'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('cuadernillo', f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Indicador de Archivo Cargado / Verificado con Badge Dinámico */}
              {cuadernilloState.status === 'SUCCESS' && (
                (() => {
                  const fileName = cuadernilloState.file?.name || cuadernilloState.base64Url || 'cuadernillo_adjunto.pdf';
                  const docInfo = getDocTypeInfo(fileName);
                  return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm">{docInfo.icon}</span>
                        <span className="font-bold text-emerald-950 dark:text-emerald-200 truncate text-[11px]">
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${docInfo.badgeClass}`}>
                          {docInfo.label}
                        </span>
                        <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md">
                          ✓ Verificado
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Selector de Origen de Cuadernillo */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      disabled={isDuplicateBlocked}
                      onClick={() => setOrigenCuadernillo(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        isDuplicateBlocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-500'
                          : origenCuadernillo === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs cursor-pointer'
                            : 'bg-rose-600 text-white shadow-2xs cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>

              {/* CÓDIGO DE EXAMEN: CUADERNILLO */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                  CÓDIGO DE EXAMEN:
                </label>
                <input
                  type="text"
                  value={codigoCuadernillo}
                  disabled={isDuplicateBlocked}
                  onChange={(e) => setCodigoCuadernillo(e.target.value)}
                  placeholder="Ej.: MINEDU-2024-C01"
                  className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 shadow-2xs transition-colors ${
                    isDuplicateBlocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Tarjeta 2: RESOLUCIÓN DESARROLLADA (Multi-Formato: PDF, Excel, Word, PowerPoint, Imágenes) */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-emerald-600">RESOLUCIÓN (OPCIONAL)</span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Resolución desarrollada</h4>
                  <p className="text-[11px] text-slate-500">Documento en PDF, Excel (.xlsx/.xls), Word (.docx), PowerPoint (.pptx) o Imágenes.</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {resolucionState.status === 'SUCCESS' ? (
                    <label className={`p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 ${isDuplicateBlocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`} title={isDuplicateBlocked ? 'Subida bloqueada: examen ya existe' : 'Reemplazar archivo de resolución'}>
                      <span>🔄</span>
                      <span>Cambiar Archivo</span>
                      <input
                        type="file"
                        accept=".pptx,.ppt,.xlsx,.xls,.docx,.doc,.pdf,.csv,.png,.jpg,.jpeg,.webp,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,image/*"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('resolucion', f);
                        }}
                      />
                    </label>
                  ) : (
                    <label className={`font-bold text-xs rounded-xl px-4 py-2.5 shadow-2xs transition-colors shrink-0 flex items-center space-x-1.5 ${isDuplicateBlocked ? 'bg-slate-400 dark:bg-slate-600 text-slate-200 opacity-50 cursor-not-allowed pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}>
                      <span>📘</span>
                      <span>
                        {resolucionState.status === 'UPLOADING' ? 'Cargando...' : 'Adjuntar Archivo'}
                      </span>
                      <input
                        type="file"
                        accept=".pptx,.ppt,.xlsx,.xls,.docx,.doc,.pdf,.csv,.png,.jpg,.jpeg,.webp,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,image/*"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('resolucion', f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Indicador de Archivo Cargado / Verificado con Badge Dinámico */}
              {resolucionState.status === 'SUCCESS' && (
                (() => {
                  const fileName = resolucionState.file?.name || resolucionState.base64Url || 'resolucion_adjunta.pdf';
                  const docInfo = getDocTypeInfo(fileName);
                  return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm">{docInfo.icon}</span>
                        <span className="font-bold text-emerald-950 dark:text-emerald-200 truncate text-[11px]">
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${docInfo.badgeClass}`}>
                          {docInfo.label}
                        </span>
                        <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md">
                          ✓ Verificado
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Selector de Origen de Resolución */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['AVEND', 'MINEDU', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      disabled={isDuplicateBlocked}
                      onClick={() => setOrigenResolucion(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        isDuplicateBlocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-500'
                          : origenResolucion === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs cursor-pointer'
                            : 'bg-rose-600 text-white shadow-2xs cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>

              {/* CÓDIGO DE EXAMEN: RESOLUCIÓN */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                  CÓDIGO DE EXAMEN:
                </label>
                <input
                  type="text"
                  value={codigoResolucion}
                  disabled={isDuplicateBlocked}
                  onChange={(e) => setCodigoResolucion(e.target.value)}
                  placeholder="Ej.: AVEND-2024-R01"
                  className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 shadow-2xs transition-colors ${
                    isDuplicateBlocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Tarjeta 3: CLAVES DE LA PRUEBA */}
            <div className={`border-2 rounded-2xl p-4 space-y-3 transition-all ${
              hasClavesError
                ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-md shadow-rose-500/10 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              {hasClavesError && (
                <div className="bg-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center space-x-2 animate-in fade-in">
                  <span>⚠️</span>
                  <span>El archivo de Claves Oficiales es OBLIGATORIO para registrar la evaluación.</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className={`text-[10px] font-black uppercase ${hasClavesError ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600'}`}>
                    CLAVES MINEDU * REQUERIDAS
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Claves de respuestas</h4>
                  <p className="text-[11px] text-slate-500">Hoja oficial de respuestas (Excel, Word, PDF, PPT).</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {clavesState.status === 'SUCCESS' ? (
                    <label className={`p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 ${isDuplicateBlocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`} title={isDuplicateBlocked ? 'Subida bloqueada: examen ya existe' : 'Reemplazar archivo de claves'}>
                      <span>🔄</span>
                      <span>Cambiar Archivo</span>
                      <input
                        type="file"
                        accept=".pptx,.ppt,.xlsx,.xls,.docx,.doc,.pdf,.csv,.png,.jpg,.jpeg,.webp,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,text/csv,image/*"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('claves', f);
                        }}
                      />
                    </label>
                  ) : (
                    <label className={`font-bold text-xs rounded-xl px-4 py-2.5 shadow-2xs transition-colors shrink-0 flex items-center space-x-2 ${isDuplicateBlocked ? 'bg-slate-400 dark:bg-slate-600 text-slate-200 opacity-50 cursor-not-allowed pointer-events-none' : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'}`}>
                      <svg 
                        className="w-4 h-4 text-white shrink-0" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M15.75 2.25a6 6 0 00-5.918 5.068L2.47 14.682a1.5 1.5 0 00-.47 1.061V18.75a1.5 1.5 0 001.5 1.5H5.25a.75.75 0 00.75-.75V18h1.5a.75.75 0 00.75-.75v-1.5h1.5a.75.75 0 00.53-.22l1.64-1.64a6 6 0 103.83-11.64zm0 2.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm0 2.25a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <span>
                        {clavesState.status === 'UPLOADING' ? 'Cargando...' : 'Adjuntar Archivo'}
                      </span>
                      <input
                        type="file"
                        accept=".pptx,.ppt,.xlsx,.xls,.docx,.doc,.pdf,.csv,.png,.jpg,.jpeg,.webp,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,text/csv,image/*"
                        disabled={isDuplicateBlocked}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('claves', f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Indicador de Archivo Cargado / Verificado con Badge Dinámico */}
              {clavesState.status === 'SUCCESS' && (
                (() => {
                  const fileName = clavesState.file?.name || clavesState.base64Url || 'claves_adjuntas.pdf';
                  const docInfo = getDocTypeInfo(fileName);
                  return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm">{docInfo.icon}</span>
                        <span className="font-bold text-emerald-950 dark:text-emerald-200 truncate text-[11px]">
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${docInfo.badgeClass}`}>
                          {docInfo.label}
                        </span>
                        <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md">
                          ✓ Verificado
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Selector de Origen de Claves */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      disabled={isDuplicateBlocked}
                      onClick={() => setOrigenClaves(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        isDuplicateBlocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-500'
                          : origenClaves === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs cursor-pointer'
                            : 'bg-rose-600 text-white shadow-2xs cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>

              {/* CÓDIGO DE EXAMEN: CLAVES */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                  CÓDIGO DE EXAMEN:
                </label>
                <input
                  type="text"
                  value={codigoClaves}
                  disabled={isDuplicateBlocked}
                  onChange={(e) => setCodigoClaves(e.target.value)}
                  placeholder="Ej.: MINEDU-2024-K01"
                  className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 shadow-2xs transition-colors ${
                    isDuplicateBlocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Caja Cierre Inferior: Guardar por defecto en Borrador */}
          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Persistencia Segura en Borrador
              </span>
              <span className="text-[11px] text-slate-500">
                El examen se guarda en estado Borrador para su publicación desde el historial.
              </span>
            </div>
            <div className="pt-1">
              <button
                type="button"
                disabled={isSubmitting || isDuplicateBlocked}
                onClick={() => handleSaveEvaluacion('BORRADOR')}
                className={`w-full font-black text-xs rounded-xl py-3.5 shadow-md transition-all flex items-center justify-center space-x-2 border ${
                  isDuplicateBlocked
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 cursor-pointer active:scale-95'
                }`}
              >
                <span>{isSubmitting ? 'Guardando en Borrador...' : isDuplicateBlocked ? '🔒 SUBIDA DESACTIVADA (EXAMEN YA REGISTRADO)' : '💾 GUARDAR EXAMEN (BORRADOR LISTO PARA PUBLICAR)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE HISTORIAL DE EXÁMENES CARGADOS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Cabecera con Buscador Integrado */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* Título y Subtítulo */}
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center space-x-2">
              <span>HISTORIAL DE EXÁMENES Y PUBLICACIÓN</span>
            </h3>
            <p className="text-xs text-slate-500">
              Gestiona el estado de publicación en 1-clic de forma individual o masiva hacia el catálogo docente.
            </p>
          </div>

          {/* Barra de Búsqueda + Contador en Tiempo Real */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Input de Búsqueda Intuitivo */}
            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, área, nivel, año..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {/* Botón para Limpiar Búsqueda */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Contador de Registros / Resultados */}
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                {searchQuery.trim() ? (
                  <span className="text-blue-600 dark:text-blue-400">
                    {filteredEvaluaciones.length} de {evaluaciones.length}
                  </span>
                ) : (
                  `${evaluaciones.length} Registros Totales`
                )}
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES MASIVAS */}
        {selectedEvaluationIds.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <span className="text-sm">📌</span>
              <span className="text-xs font-black text-blue-950 dark:text-blue-200">
                {selectedEvaluationIds.length} {selectedEvaluationIds.length === 1 ? 'examen seleccionado' : 'exámenes seleccionados'}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {/* Publicar */}
              <button
                type="button"
                onClick={handlePublicarMasivo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <span>🚀</span>
                <span>Publicar seleccionados ({selectedEvaluationIds.length})</span>
              </button>
              {/* Pasar a Borrador */}
              <button
                type="button"
                onClick={handleBorradorMasivo}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <span>📁</span>
                <span>Pasar a Borrador ({selectedEvaluationIds.length})</span>
              </button>
              {/* Eliminar Masivo */}
              <button
                type="button"
                onClick={handleEliminarMasivo}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <span>🗑️</span>
                <span>Eliminar ({selectedEvaluationIds.length})</span>
              </button>
              {/* Desmarcar */}
              <button
                type="button"
                onClick={() => setSelectedEvaluationIds([])}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕ Desmarcar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Seleccionar / Deseleccionar todos los visibles de esta página"
                  />
                </th>
                <th className="p-4">TÍTULO / EVALUACIÓN</th>
                <th className="p-4">PROCESO & MODALIDAD</th>
                <th className="p-4">CARGO / ESPECIALIDAD</th>
                <th className="p-4 text-center">AÑO</th>
                <th className="p-4 text-center">ESTADO & PUBLICACIÓN (1-CLIC)</th>
                <th className="p-4 text-center">DOCUMENTOS ADJUNTOS</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEvaluaciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                      🔍
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        {searchQuery.trim()
                          ? `No se encontraron exámenes para "${searchQuery}"`
                          : 'No hay exámenes cargados aún en la plataforma.'}
                      </p>
                      {searchQuery.trim() && (
                        <p className="text-xs text-slate-400">
                          Intenta buscando por código MINEDU, nombre de especialidad o año.
                        </p>
                      )}
                    </div>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        ✕ Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEvaluaciones.map((item) => {
                  const isSelected = selectedEvaluationIds.includes(item.id);
                  const isPublicado = (item.estado || 'BORRADOR') === 'PUBLICADO';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* COLUMNA 1: TÍTULO / EVALUACIÓN */}
                      <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white block leading-snug">
                            {item.proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'Evaluación de Cargos Directivos' : 'Prueba Única Nacional'}
                          </span>
                          {item.tipoCuadernillo && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              {item.tipoCuadernillo}
                            </span>
                          )}
                          {(item.codigoCuadernillo || item.resources?.codigoCuadernillo) && (
                            <span className="block font-mono text-[10px] text-rose-600 font-bold">
                              CÓDIGO: {item.codigoCuadernillo || item.resources?.codigoCuadernillo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* COLUMNA 2: PROCESO & MODALIDAD */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1 items-start">
                          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black rounded-lg uppercase">
                            {item.proceso === 'ASCENSO_ESCALAFON'
                              ? 'Ascenso'
                              : item.proceso === 'ACCESO_CARGOS_DIRECTIVOS'
                              ? 'Directivos'
                              : 'Nombramiento'}
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold rounded-lg">
                            {item.modalidad}
                          </span>
                        </div>
                      </td>

                      {/* COLUMNA 3: CARGO / ESPECIALIDAD & NIVEL (Formateo Total Sin Huecos en Blanco) */}
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="space-y-0.5">
                          {(() => {
                            const rawNivel = (item.nivel || '').toUpperCase();
                            const rawModalidad = (item.modalidad || '').toUpperCase();
                            const isDirectivos = item.proceso === 'ACCESO_CARGOS_DIRECTIVOS';

                            let nivelEtiqueta = '';

                            if (isDirectivos) {
                              nivelEtiqueta = 'CARGO: GESTIÓN DIRECTIVA';
                            } else if (rawModalidad === 'EBE' || (rawNivel === 'NO_APLICA' && rawModalidad === 'EBE')) {
                              nivelEtiqueta = 'NIVEL: EBE GENERAL';
                            } else if (rawModalidad === 'CETPRO' || rawNivel.includes('CETPRO') || rawNivel.includes('TECNICO')) {
                              nivelEtiqueta = 'NIVEL: CICLO TÉCNICO Y AUXILIAR';
                            } else if (rawNivel === 'EBA_AVANZADO' || rawNivel === 'AVANZADO') {
                              nivelEtiqueta = 'NIVEL: AVANZADO';
                            } else if (rawNivel === 'EBA_INICIAL_INTERMEDIO' || rawNivel.includes('INTERMEDIO')) {
                              nivelEtiqueta = 'NIVEL: INICIAL - INTERMEDIO';
                            } else if (rawNivel === 'INICIAL') {
                              nivelEtiqueta = 'NIVEL: INICIAL';
                            } else if (rawNivel === 'PRIMARIA') {
                              nivelEtiqueta = 'NIVEL: PRIMARIA';
                            } else if (rawNivel === 'SECUNDARIA') {
                              nivelEtiqueta = 'NIVEL: SECUNDARIA';
                            } else if (rawNivel && rawNivel !== 'NO_APLICA' && !rawNivel.includes('NO APLICA')) {
                              nivelEtiqueta = `NIVEL: ${item.nivel.replace(/^EBA_/i, '').replace(/^EBR_/i, '').replace(/_/g, ' ').toUpperCase()}`;
                            } else {
                              nivelEtiqueta = `MODALIDAD: ${item.modalidad || 'GENERAL'}`;
                            }

                            return (
                              <span className="text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 block uppercase tracking-tight">
                                {nivelEtiqueta}
                              </span>
                            );
                          })()}

                          {/* Especialidad o Cargo */}
                          <strong className="text-xs font-black text-slate-900 dark:text-white block">
                            {(() => {
                              const espLimpia = cleanNoAplicaText(item.especialidad);
                              if (espLimpia && espLimpia.trim()) return espLimpia;
                              if (item.modalidad === 'EBE') return 'General / Sin Especialidad';
                              if (item.nivel === 'INICIAL') return 'Educación Inicial (General)';
                              return 'General';
                            })()}
                          </strong>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-slate-800 dark:text-white">
                        {item.anio}
                      </td>

                      {/* ESTADO & PUBLICACIÓN (1-CLIC) */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {isPublicado ? (
                          <div className="inline-flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                              ✓ Publicado
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMoverABorradorEvaluacion(item.id)}
                              className="text-[10px] font-bold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline cursor-pointer transition-colors"
                              title="Ocultar a docentes y cambiar a Borrador"
                            >
                              Ocultar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              📁 Borrador
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePublicarEvaluacion(item.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10.5px] px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95 border border-emerald-500"
                              title="Subir ahora: Cambiar estado a Publicado inmediatamente"
                            >
                              <span>🚀</span>
                              <span>Subir ahora</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* COLUMNA: DOCUMENTOS ADJUNTOS (Siempre los 3 estados visibles y fijos) */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* 1. CUADERNILLO */}
                          {item.resources?.cuadernilloKey ? (
                            <button
                              type="button"
                              onClick={() => handleVisualizarEvaluacionItem(item, 'cuadernillo')}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer shadow-2xs"
                              title="Click para ver Cuadernillo Principal"
                            >
                              Cuadernillo ({item.resources?.origenCuadernillo || 'MINEDU'}) ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingEvaluacionModalItem(item)}
                              className="bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60 cursor-pointer transition-colors shadow-2xs"
                              title="⚠️ Falta Cuadernillo. Haz clic para adjuntar archivo (PDF, Word, PPT, Excel)."
                            >
                              Cuadernillo ✕ Sin Archivo
                            </button>
                          )}

                          {/* 2. SOLUCIÓN / RESOLUCIÓN */}
                          {item.resources?.resolucionKey ? (
                            <button
                              type="button"
                              onClick={() => handleVisualizarEvaluacionItem(item, 'resolucion')}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shadow-2xs"
                              title="Click para ver Solucionario / Resolución"
                            >
                              Solución ({item.resources?.origenResolucion || 'AVEND'}) ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingEvaluacionModalItem(item)}
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                              title="Opcional. Haz clic para adjuntar Solucionario (PDF, Excel, Word, PPT, Imágenes)."
                            >
                              Solución ✕ Sin Archivo
                            </button>
                          )}

                          {/* 3. CLAVES */}
                          {item.resources?.clavesKey ? (
                            <button
                              type="button"
                              onClick={() => handleVisualizarEvaluacionItem(item, 'claves')}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer shadow-2xs"
                              title="Click para ver Claves de Respuestas"
                            >
                              Claves ({item.resources?.origenClaves || 'MINEDU'}) ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingEvaluacionModalItem(item)}
                              className="bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60 cursor-pointer transition-colors shadow-2xs"
                              title="⚠️ Faltan Claves. Haz clic para adjuntar hoja de respuestas (Excel, Word, PDF, PPT)."
                            >
                              Claves ✕ Sin Archivo
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleVisualizarEvaluacionItem(item)}
                            className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            👁️ VISUALIZAR TODO
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEvaluacionModalItem(item)}
                            className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer text-xs font-extrabold flex items-center space-x-1"
                            title="Editar datos y reemplazar PDFs"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvaluacion(item.id, item.titulo)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar examen"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación Avanzada (Máximo 20 elementos por página) */}
        {filteredEvaluaciones.length > 0 && (
          <div className="mt-4 px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
            {/* Contador Informativo */}
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Mostrando{' '}
              <span className="font-black text-slate-900 dark:text-white">
                {(safeCurrentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              -{' '}
              <span className="font-black text-slate-900 dark:text-white">
                {Math.min(safeCurrentPage * itemsPerPage, filteredEvaluaciones.length)}
              </span>{' '}
              de{' '}
              <span className="font-black text-blue-600 dark:text-blue-400">
                {filteredEvaluaciones.length}
              </span>{' '}
              {searchQuery.trim() ? 'resultados encontrados' : 'exámenes subidos'}
            </div>

            {/* Paginador Numerado (1, 2, 3...) */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full py-1 touch-pan-x">
                {/* Botón Anterior */}
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                  className="shrink-0 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
                >
                  ‹ <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de Página */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[36px] h-[36px] px-3 shrink-0 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center border ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Botón Siguiente */}
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Página siguiente"
                  className="shrink-0 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
                >
                  <span className="hidden sm:inline">Siguiente </span>›
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Visor Multidocumento con Pestañas */}
      {multiDocModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full h-[88vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase text-rose-600">AUDITORÍA DE DOCUMENTOS EXAMEN</span>
                  <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {multiDocModal.docs.length} Documentos PDF
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {multiDocModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMultiDocModal({ isOpen: false, title: '', docs: [], activeDocId: '' })}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Barra Superior de Pestañas */}
            <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2 overflow-x-auto">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 pr-2 shrink-0">
                VER DOCUMENTO:
              </span>
              {multiDocModal.docs.map((doc) => {
                const isActive = doc.id === multiDocModal.activeDocId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setIsMultiDocLoading(true);
                      setMultiDocModal((prev) => ({ ...prev, activeDocId: doc.id }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{doc.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Visor Universal en Vivo (Excel Cuadrícula, Word HTML, Imágenes, Diapositivas, PDF) */}
            <div className="flex-1 bg-slate-950 p-2 sm:p-3 overflow-hidden relative flex flex-col items-center justify-center">
              {activeDocObj && (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                  <UniversalDocViewer
                    fileUrl={activeDocObj.url}
                    fileName={activeDocObj.label}
                    isAdmin={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta de Duplicidad Preventiva */}
      {duplicateWarningModal.isOpen && duplicateWarningModal.existingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-amber-300 dark:border-amber-700/80 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Posible Examen Duplicado Detectado
              </h3>
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
              Ya se ha subido anteriormente un cuadernillo en esta modalidad, nivel y especialidad. ¿Está seguro que desea continuar?
            </p>

            {/* Ficha Resumen del Registro Existente */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug">
                {formatEvaluationTitle(duplicateWarningModal.existingExam.titulo)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Año:</span> {duplicateWarningModal.existingExam.anio}</div>
                <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Modalidad:</span> {duplicateWarningModal.existingExam.modalidad}</div>
                <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Nivel:</span> {duplicateWarningModal.existingExam.nivel || '—'}</div>
                <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Especialidad:</span> {duplicateWarningModal.existingExam.especialidad || (duplicateWarningModal.existingExam as any).area}</div>
              </div>
              {duplicateWarningModal.existingExam.tipoCuadernillo && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Tipo:</span> {duplicateWarningModal.existingExam.tipoCuadernillo}
                </div>
              )}
              {/* Indicadores de Documentos */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[10px] font-black">
                <span className={`px-2 py-0.5 rounded-md ${duplicateWarningModal.existingExam.resources?.cuadernilloKey || (duplicateWarningModal.existingExam as any).urlCuadernillo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  Cuadernillo: {duplicateWarningModal.existingExam.resources?.cuadernilloKey || (duplicateWarningModal.existingExam as any).urlCuadernillo ? '✓ Cargado' : '✕ Sin PDF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md ${duplicateWarningModal.existingExam.resources?.resolucionKey || (duplicateWarningModal.existingExam as any).urlResolucion ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                  Solución: {duplicateWarningModal.existingExam.resources?.resolucionKey || (duplicateWarningModal.existingExam as any).urlResolucion ? '✓ Cargado' : '✕ Sin PDF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md ${duplicateWarningModal.existingExam.resources?.clavesKey || (duplicateWarningModal.existingExam as any).urlClaves ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  Claves: {duplicateWarningModal.existingExam.resources?.clavesKey || (duplicateWarningModal.existingExam as any).urlClaves ? '✓ Cargado' : '✕ Sin PDF'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateWarningModal({ isOpen: false, existingExam: null, targetEstado: 'BORRADOR' })}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
              >
                ✕ Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = duplicateWarningModal.existingExam!.id;
                  const targetEst = duplicateWarningModal.targetEstado;
                  setDuplicateWarningModal({ isOpen: false, existingExam: null, targetEstado: 'BORRADOR' });
                  await executeSaveEvaluacion(targetId, targetEst);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 transition-all cursor-pointer text-center"
              >
                🔄 Sobrescribir Registro Existente
              </button>
              <button
                type="button"
                onClick={() => {
                  const examToEdit = duplicateWarningModal.existingExam!;
                  setDuplicateWarningModal({ isOpen: false, existingExam: null, targetEstado: 'BORRADOR' });
                  handleCargarEvaluacionParaEditar(examToEdit);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer text-center"
              >
                ✏️ Cargar Existente para Editar / Reemplazar PDFs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Interactivo de Edición Completa */}
      <EditEvaluationModal
        isOpen={Boolean(editingEvaluacionModalItem)}
        onClose={() => setEditingEvaluacionModalItem(null)}
        evaluacion={editingEvaluacionModalItem}
        onSuccess={async () => {
          showToast('✏️ Examen actualizado con éxito en la base de datos.');
          await loadEvaluaciones();
        }}
      />

      {/* Modal de Confirmación de Eliminación Masiva */}
      {isConfirmDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                ¿Eliminar {selectedEvaluationIds.length} exámenes seleccionados?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Esta acción eliminará de forma permanente los <strong className="text-rose-600 font-bold">{selectedEvaluationIds.length}</strong> registros seleccionados de la base de datos. Esta operación no se puede deshacer.
            </p>
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMasivo}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
              >
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFORMATIVO: GUARDADO EN BORRADOR */}
      {draftSavedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
              📁
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                MODO BORRADOR ACTIVO
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white pt-2">
                Examen Guardado en Borrador
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                Este examen se guardó exitosamente como <strong className="text-amber-600 dark:text-amber-400 font-black">BORRADOR</strong> en el panel de administración.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">📄 Cuadernillo:</span>
                <span className={`font-black text-[11px] ${draftSavedModal.hasCuadernillo ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {draftSavedModal.hasCuadernillo ? '✓ Adjuntado' : '⏳ Pendiente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">🔑 Claves Oficiales:</span>
                <span className={`font-black text-[11px] ${draftSavedModal.hasClaves ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {draftSavedModal.hasClaves ? '✓ Adjuntado' : '⏳ Pendiente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">📘 Resolución:</span>
                <span className={`font-black text-[11px] ${draftSavedModal.hasResolucion ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {draftSavedModal.hasResolucion ? '✓ Adjuntado' : '— Opcional'}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3 text-[11.5px] text-amber-900 dark:text-amber-200 text-left leading-snug">
              🔒 <strong>100% Oculto para docentes:</strong> Los docentes no verán este material hasta que adjuntes su Cuadernillo y Claves Oficiales y presiones <strong>"PUBLICAR"</strong>.
            </div>

            <button
              type="button"
              onClick={() => setDraftSavedModal((prev) => ({ ...prev, isOpen: false }))}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE ERROR DE PUBLICACIÓN (DOCUMENTOS PENDIENTES) */}
      {publishBlockedModal.isOpen && publishBlockedModal.exam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner ring-4 ring-rose-500/20">
              ⚠️
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                NO SE PUEDE PUBLICAR EL EXAMEN
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
                Faltan Documentos Obligatorios
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Para que este examen sea visible a los docentes en el catálogo, es obligatorio que cuente con su <strong className="text-slate-900 dark:text-white">Cuadernillo</strong> y sus <strong className="text-slate-900 dark:text-white">Claves Oficiales</strong>.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-left space-y-2.5 text-xs font-bold">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">📄 Cuadernillo Principal:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black ${
                  publishBlockedModal.missingCuadernillo ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {publishBlockedModal.missingCuadernillo ? '✕ Falta adjuntar' : '✓ Listo'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">🔑 Claves Oficiales:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black ${
                  publishBlockedModal.missingClaves ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {publishBlockedModal.missingClaves ? '✕ Falta adjuntar' : '✓ Listo'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">📘 Solución / Resolución:</span>
                <span className="text-slate-400 text-[10.5px] font-bold">
                  — Opcional
                </span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3 text-[11.5px] text-amber-900 dark:text-amber-200 text-left leading-snug font-medium">
              💡 <strong>Acción requerida:</strong> Haz clic en el botón de abajo para adjuntar los archivos faltantes en cualquier formato permitido (PDF, Excel, Word, PPT o Imágenes).
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const examToEdit = publishBlockedModal.exam;
                  setPublishBlockedModal({ isOpen: false, exam: null, missingCuadernillo: false, missingClaves: false });
                  if (examToEdit) {
                    setEditingEvaluacionModalItem(examToEdit);
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                📁 Adjuntar Archivos Faltantes Ahora
              </button>
              <button
                type="button"
                onClick={() => setPublishBlockedModal({ isOpen: false, exam: null, missingCuadernillo: false, missingClaves: false })}
                className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Mantener en Borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Preventiva al Publicar sin Claves Oficiales */}
      {confirmPublishNoClavesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border-2 border-amber-400 dark:border-amber-600 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Publicación sin Claves Oficiales
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
              Este examen se publicará <strong>sin hoja de claves oficiales</strong> (como ocurre en evaluaciones históricas donde el MINEDU no las emitió).<br /><br />
              Cuando los docentes hagan clic en <em>"VER CLAVES"</em>, se les informará que <strong>"El MINEDU no publicó las claves oficiales de este examen"</strong>.<br /><br />
              ¿Está seguro de que desea continuar y publicarlo en el catálogo docente?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmPublishNoClavesModal(false);
                  setConfirmPublishExamId(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold text-xs cursor-pointer"
              >
                Cancelar / Adjuntar Claves
              </button>

              <button
                type="button"
                onClick={async () => {
                  const examId = confirmPublishExamId;
                  setConfirmPublishExamId(null);
                  setConfirmPublishNoClavesModal(false);
                  if (examId) {
                    await handlePublicarEvaluacion(examId, true);
                  } else {
                    await handleSaveEvaluacion('PUBLICADO', true);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                🟢 Sí, Publicar sin Claves
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
