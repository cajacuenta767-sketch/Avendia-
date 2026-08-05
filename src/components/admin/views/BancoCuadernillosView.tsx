// src/components/admin/views/BancoCuadernillosView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getAniosAction,
  createAnioAction,
  createEvaluacionAction,
  getEvaluacionesAction,
  deleteEvaluacionAction,
} from '@/services/evaluacionesService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo, Evaluacion } from '@/types/evaluacion';

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

// Mapas de jerarquía y especialidades oficiales MINEDU Perú
const NIVELES_POR_MODALIDAD: Record<ModalidadEducativa, { value: NivelEducativo; label: string }[]> = {
  EBR: [
    { value: 'INICIAL', label: 'Inicial' },
    { value: 'PRIMARIA', label: 'Primaria' },
    { value: 'SECUNDARIA', label: 'Secundaria' },
  ],
  EBA: [
    { value: 'INICIAL', label: 'Ciclo Inicial e Intermedio' },
    { value: 'SECUNDARIA', label: 'Ciclo Avanzado' },
  ],
  EBE: [
    { value: 'INICIAL', label: 'Inicial EBE' },
    { value: 'PRIMARIA', label: 'Primaria EBE' },
  ],
  CETPRO: [
    { value: 'SECUNDARIA', label: 'Ciclo Técnico Productivo' },
  ],
};

const AREAS_POR_NIVEL: Record<string, string[]> = {
  INICIAL: ['Educación Inicial', 'AIP / Aula de Innovación Pedagógica'],
  PRIMARIA: ['Educación Primaria', 'Educación Física', 'AIP / Aula de Innovación Pedagógica'],
  SECUNDARIA: [
    'Matemática',
    'Comunicación',
    'Ciencia y Tecnología',
    'Ciencias Sociales',
    'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
    'Educación Física',
    'Inglés',
    'Educación para el Trabajo (EPT)',
    'Arte y Cultura',
    'Educación Religiosa',
    'AIP / Aula de Innovación Pedagógica',
  ],
  NO_APLICA: [
    'Acceso a cargos directivos',
    'Director de Institución Educativa',
    'Subdirector de Institución Educativa',
    'Especialista en Educación de UGEL',
    'Especialista en Educación de DRE',
    'Director de Gestión Pedagógica (DGP) de DRE',
    'Jefe de Gestión Pedagógica (JAGP) de UGEL',
    'Director de UGEL',
  ],
};

export const BancoCuadernillosView: React.FC = () => {
  // 1. Clasificación Pedagógica con Jerarquía en Cascada
  const [proceso, setProceso] = useState<ProcesoMinedu>('NOMBRAMIENTO_DOCENTE');
  const [modalidad, setModalidad] = useState<ModalidadEducativa>('EBR');
  const [nivel, setNivel] = useState<NivelEducativo>('INICIAL');
  const [area, setArea] = useState<string>('Educación Inicial');

  // Gestión de Años desde PostgreSQL Local
  const [listaAnios, setListaAnios] = useState<string[]>(['2024', '2023', '2022', '2021', '2019', '2018', '2014']);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('2024');
  const [nuevoAnioInput, setNuevoAnioInput] = useState<string>('');

  const [fuente, setFuente] = useState('Prueba Única Nacional MINEDU');

  // 2. Archivos PDF Locales
  const [cuadernilloState, setCuadernilloState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [resolucionState, setResolucionState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [clavesState, setClavesState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });

  // Orígenes de cada documento (MINEDU, AVEND, OTRO) modificables por el Administrador
  const [origenCuadernillo, setOrigenCuadernillo] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');
  const [origenResolucion, setOrigenResolucion] = useState<'AVEND' | 'MINEDU' | 'OTRO'>('AVEND');
  const [origenClaves, setOrigenClaves] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');

  // 3. Estado de Evaluaciones Existentes para Detección Automática por Filtros
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadEvaluaciones = async () => {
    const res = await getEvaluacionesAction({ proceso: 'TODOS', modalidad: 'TODOS', nivel: 'TODOS' });
    if (res.success) {
      setEvaluaciones(res.data);
    }
  };

  useEffect(() => {
    async function initData() {
      const resAnios = await getAniosAction();
      if (resAnios.success && resAnios.data.length > 0) {
        setListaAnios(resAnios.data);
        setAnioSeleccionado(resAnios.data[0]);
      }
      await loadEvaluaciones();
    }
    initData();
  }, []);

  // DETECCIÓN AUTOMÁTICA EN TIEMPO REAL POR FILTROS
  const existingEvaluacion = useMemo(() => {
    return evaluaciones.find(
      (e) =>
        e.proceso === proceso &&
        e.modalidad === modalidad &&
        e.nivel === nivel &&
        e.especialidad.toLowerCase().trim() === area.toLowerCase().trim() &&
        String(e.anio) === String(anioSeleccionado)
    );
  }, [evaluaciones, proceso, modalidad, nivel, area, anioSeleccionado]);

  // Habilitación de Documentos (si existe en DB o se adjuntaron archivos en la pantalla)
  const hasLocalFiles = cuadernilloState.status === 'SUCCESS' || resolucionState.status === 'SUCCESS' || clavesState.status === 'SUCCESS';
  const isDocAvailable = Boolean(existingEvaluacion || hasLocalFiles);

  // Niveles disponibles según la Modalidad activa
  const nivelesDisponibles = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      return [{ value: 'NO_APLICA' as NivelEducativo, label: 'Sin Nivel Específico (Cargos de Gestión)' }];
    }
    return NIVELES_POR_MODALIDAD[modalidad] || NIVELES_POR_MODALIDAD.EBR;
  }, [proceso, modalidad]);

  // Áreas/Especialidades disponibles según el Nivel activo
  const areasDisponibles = useMemo(() => {
    if (proceso === 'ACCESO_CARGOS_DIRECTIVOS' || nivel === 'NO_APLICA') {
      return AREAS_POR_NIVEL.NO_APLICA;
    }
    return AREAS_POR_NIVEL[nivel] || AREAS_POR_NIVEL.INICIAL;
  }, [proceso, nivel]);

  const handleProcesoChange = (nuevoProceso: ProcesoMinedu) => {
    setProceso(nuevoProceso);
    if (nuevoProceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      setNivel('NO_APLICA');
      setArea(AREAS_POR_NIVEL.NO_APLICA[0]);
    } else {
      const primerNivel = NIVELES_POR_MODALIDAD[modalidad][0].value;
      setNivel(primerNivel);
      setArea(AREAS_POR_NIVEL[primerNivel][0]);
    }
  };

  const handleModalidadChange = (nuevaModalidad: ModalidadEducativa) => {
    setModalidad(nuevaModalidad);
    if (proceso !== 'ACCESO_CARGOS_DIRECTIVOS') {
      const primerNivel = (NIVELES_POR_MODALIDAD[nuevaModalidad] || NIVELES_POR_MODALIDAD.EBR)[0].value;
      setNivel(primerNivel);
      const primerasAreas = AREAS_POR_NIVEL[primerNivel] || AREAS_POR_NIVEL.INICIAL;
      setArea(primerasAreas[0]);
    }
  };

  const handleNivelChange = (nuevoNivel: NivelEducativo) => {
    setNivel(nuevoNivel);
    const primerasAreas = AREAS_POR_NIVEL[nuevoNivel] || AREAS_POR_NIVEL.INICIAL;
    setArea(primerasAreas[0]);
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

  const handleEliminarAnio = () => {
    if (listaAnios.length <= 1) {
      showToast('⚠️ Debe existir al menos un año en el catálogo.');
      return;
    }
    const nuevaLista = listaAnios.filter((y) => y !== anioSeleccionado);
    setListaAnios(nuevaLista);
    setAnioSeleccionado(nuevaLista[0]);
    showToast(`🗑️ Año ${anioSeleccionado} removido del catálogo.`);
  };

  // Carga de PDF
  const handleFileUpload = (type: 'cuadernillo' | 'resolucion' | 'claves', file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('⚠️ El archivo debe ser en formato PDF.');
      return;
    }

    const setState = type === 'cuadernillo' ? setCuadernilloState : type === 'resolucion' ? setResolucionState : setClavesState;
    setState({ file, base64Url: '', status: 'UPLOADING' });

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      setState({ file, base64Url, status: 'SUCCESS' });
      showToast(`✔ ${file.name} cargado exitosamente.`);
    };
    reader.onerror = () => {
      setState({ file: null, base64Url: '', status: 'ERROR' });
      showToast(`❌ Error al leer el archivo ${file.name}.`);
    };
    reader.readAsDataURL(file);
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
    if (evalItem.resources?.cuadernilloKey) {
      docsList.push({ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: evalItem.resources.cuadernilloKey });
    }
    if (evalItem.resources?.resolucionKey) {
      docsList.push({ id: 'resolucion', label: '📘 Solucionario / Resolución', url: evalItem.resources.resolucionKey });
    }
    if (evalItem.resources?.clavesKey) {
      docsList.push({ id: 'claves', label: '🔑 Claves de Respuestas', url: evalItem.resources.clavesKey });
    }

    if (docsList.length === 0) {
      docsList.push({ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: '/uploads/cuadernillos/ejemplo.pdf' });
    }

    openMultiDocViewer(evalItem.titulo, docsList, targetDocId);
  };

  // Guardar / Publicar Examen con Orígenes Modificables por el Administrador
  const handleGenerateThumbnails = async () => {
    if (cuadernilloState.status !== 'SUCCESS') {
      showToast('⚠️ Adjunta el PDF del Cuadernillo Principal antes de publicar.');
      return;
    }

    if (!areasDisponibles.includes(area)) {
      showToast(`⚠️ El área o cargo "${area}" no es válida para el proceso seleccionado.`);
      return;
    }

    setIsSubmitting(true);

    const res = await createEvaluacionAction({
      proceso,
      modalidad,
      nivel,
      area,
      anio: anioSeleccionado,
      urlCuadernillo: cuadernilloState.base64Url,
      urlResolucion: resolucionState.base64Url || undefined,
      urlClaves: clavesState.base64Url || undefined,
      origenCuadernillo,
      origenResolucion,
      origenClaves,
    });

    setIsSubmitting(false);

    if (res.success) {
      showToast('🎉 ¡Cuadernillo publicado exitosamente con etiquetas de origen asignadas!');
      setCuadernilloState({ file: null, base64Url: '', status: 'IDLE' });
      setResolucionState({ file: null, base64Url: '', status: 'IDLE' });
      setClavesState({ file: null, base64Url: '', status: 'IDLE' });
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleDeleteEvaluacion = async (id: string, title: string) => {
    const res = await deleteEvaluacionAction(id);
    if (res.success) {
      showToast(`🗑️ Examen "${title}" eliminado.`);
      await loadEvaluaciones();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const activeDocObj = multiDocModal.docs.find((d) => d.id === multiDocModal.activeDocId) || multiDocModal.docs[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      {/* Banner Informativo Superior */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
            i
          </span>
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              CLASIFICACIÓN SELECCIONADA ({anioSeleccionado})
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Modalidad: <strong>{modalidad}</strong>
              {nivel && nivel.toUpperCase() !== 'NO_APLICA' && !nivel.toLowerCase().includes('no aplica') && (
                <> | Nivel: <strong>{nivel}</strong></>
              )}
              | Cargo / Especialidad: <strong className="text-blue-600">{area}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-2xs">
            {proceso.replace(/_/g, ' ')}
          </span>
          <span className="bg-slate-900 text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-2xs">
            AÑO {anioSeleccionado}
          </span>
        </div>
      </div>

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
              PROCESO EVALUATIVO MINEDU (NIVEL 1)
            </label>
            <select
              value={proceso}
              onChange={(e) => handleProcesoChange(e.target.value as ProcesoMinedu)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente (Prueba Única Nacional)</option>
              <option value="ASCENSO_ESCALAFON">Ascenso en la Carrera Pública Magisterial</option>
              <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Cargos Directivos y Especialistas</option>
            </select>
          </div>

          {/* Selector 2: Modalidad Educativa */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              MODALIDAD EDUCATIVA (NIVEL 2)
            </label>
            <select
              value={modalidad}
              disabled={proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
              onChange={(e) => handleModalidadChange(e.target.value as ModalidadEducativa)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 disabled:opacity-60 cursor-pointer"
            >
              <option value="EBR">Educación Básica Regular (EBR)</option>
              <option value="EBA">Educación Básica Alternativa (EBA)</option>
              <option value="EBE">Educación Básica Especial (EBE)</option>
              <option value="CETPRO">Técnico Productivo (CETPRO)</option>
            </select>
          </div>

          {/* Selector 3: Nivel Educativo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              NIVEL EDUCATIVO (NIVEL 3)
            </label>
            <select
              value={nivel}
              disabled={proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
              onChange={(e) => handleNivelChange(e.target.value as NivelEducativo)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-blue-500/80 dark:border-blue-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {nivelesDisponibles.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector 4: Área / Cargo Docente */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'CARGO A POSTULAR (MINEDU)' : 'ÁREA / ESPECIALIDAD DOCENTE (NIVEL 4)'}
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
            >
              {areasDisponibles.map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
            </select>
          </div>

          {/* Selector 5: Año del Proceso */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              AÑO DE LA EVALUACIÓN (NIVEL 5)
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
              >
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

            {/* Tarjeta 1: CUADERNILLO MINEDU */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-blue-600">CUADERNILLO * REQUERIDO</span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Cuadernillo de la prueba</h4>
                  <p className="text-[11px] text-slate-500">Documento PDF del examen.</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {cuadernilloState.status === 'SUCCESS' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openMultiDocViewer(`Cuadernillo de Prueba - ${area}`, [{ id: 'cuadernillo', label: '📄 Cuadernillo Principal', url: cuadernilloState.base64Url }])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        ✓ CARGADO (VER)
                      </button>
                      <label className="p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl cursor-pointer">
                        <span>🔄</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload('cuadernillo', f);
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                      <span>
                        {cuadernilloState.status === 'UPLOADING' ? 'Cargando...' : 'Subir PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
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

              {/* Selector de Origen de Cuadernillo */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setOrigenCuadernillo(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        origenCuadernillo === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tarjeta 2: RESOLUCIÓN DESARROLLADA */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">RESOLUCIÓN OPCIONAL</span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Resolución desarrollada</h4>
                  <p className="text-[11px] text-slate-500">Solucionario paso a paso con explicaciones.</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {resolucionState.status === 'SUCCESS' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openMultiDocViewer(`Resolución desarrollada - ${area}`, [{ id: 'resolucion', label: '📘 Solucionario / Resolución', url: resolucionState.base64Url }])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        ✓ CARGADO (VER)
                      </button>
                      <label className="p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl cursor-pointer">
                        <span>🔄</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload('resolucion', f);
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                      <span>
                        {resolucionState.status === 'UPLOADING' ? 'Cargando...' : 'Subir PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
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

              {/* Selector de Origen de Resolución */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['AVEND', 'MINEDU', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setOrigenResolucion(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        origenResolucion === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tarjeta 3: CLAVES DE LA PRUEBA */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">CLAVES OPCIONAL</span>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Claves de respuestas</h4>
                  <p className="text-[11px] text-slate-500">Hoja oficial de respuestas correctas.</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {clavesState.status === 'SUCCESS' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openMultiDocViewer(`Claves de respuestas - ${area}`, [{ id: 'claves', label: '🔑 Claves de Respuestas', url: clavesState.base64Url }])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        ✓ CARGADO (VER)
                      </button>
                      <label className="p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs rounded-xl cursor-pointer">
                        <span>🔄</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload('claves', f);
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                      <span>
                        {clavesState.status === 'UPLOADING' ? 'Cargando...' : 'Subir PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
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

              {/* Selector de Origen de Claves */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black uppercase text-slate-500">ORIGEN ETIQUETA:</span>
                <div className="flex items-center space-x-1.5">
                  {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setOrigenClaves(org)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        origenClaves === org
                          ? org === 'AVEND'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Caja Cierre Inferior */}
          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                ¿Terminaste de subir los PDF?
              </span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGenerateThumbnails}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl py-3 shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Procesando...' : '+ GENERAR MINIATURAS Y PUBLICAR MATERIAL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE HISTORIAL DE EXÁMENES CARGADOS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              HISTORIAL DE EXÁMENES CARGADOS
            </h3>
            <p className="text-xs text-slate-500">
              Panel de auditoría visual de todos los cuadernillos registrados y activos en PostgreSQL.
            </p>
          </div>
          <span className="bg-rose-50 text-rose-700 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-rose-200">
            {evaluaciones.length} Registros Activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">TÍTULO / EVALUACIÓN</th>
                <th className="p-4">PROCESO & MODALIDAD</th>
                <th className="p-4">CARGO / ESPECIALIDAD</th>
                <th className="p-4 text-center">AÑO</th>
                <th className="p-4 text-center">DOCUMENTOS ADJUNTOS</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {evaluaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No hay exámenes cargados aún en la plataforma.
                  </td>
                </tr>
              ) : (
                evaluaciones.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {item.titulo}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold rounded-lg">
                        {item.proceso}
                      </span>
                    </td>

                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.nivel && item.nivel.toUpperCase() !== 'NO_APLICA' && !item.nivel.toLowerCase().includes('no aplica')
                        ? `${item.nivel} • `
                        : ''}
                      <strong className="text-slate-900 dark:text-white">{item.especialidad}</strong>
                    </td>

                    <td className="p-4 text-center font-mono font-bold text-slate-800 dark:text-white">
                      {item.anio}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleVisualizarEvaluacionItem(item, 'cuadernillo')}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          title="Click para ver Cuadernillo Principal"
                        >
                          Cuadernillo ({item.resources?.origenCuadernillo || 'MINEDU'}) ✓
                        </button>

                        {item.resources?.resolucionKey && (
                          <button
                            type="button"
                            onClick={() => handleVisualizarEvaluacionItem(item, 'resolucion')}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                            title="Click para ver Solucionario / Resolución"
                          >
                            Solución ({item.resources?.origenResolucion || 'AVEND'}) ✓
                          </button>
                        )}

                        {item.resources?.clavesKey && (
                          <button
                            type="button"
                            onClick={() => handleVisualizarEvaluacionItem(item, 'claves')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                            title="Click para ver Claves de Respuestas"
                          >
                            Claves ({item.resources?.origenClaves || 'MINEDU'}) ✓
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
                          onClick={() => handleDeleteEvaluacion(item.id, item.titulo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar examen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                    onClick={() => setMultiDocModal((prev) => ({ ...prev, activeDocId: doc.id }))}
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

            {/* Visor Interactivo de PDF */}
            <div className="flex-1 bg-slate-900 p-2 overflow-hidden relative">
              {activeDocObj && (activeDocObj.url.startsWith('data:application/pdf') || activeDocObj.url.endsWith('.pdf')) ? (
                <iframe
                  key={activeDocObj.id}
                  src={activeDocObj.url}
                  className="w-full h-full rounded-2xl border-0 bg-white"
                  title={activeDocObj.label}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-6 text-white">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl">
                    📄
                  </div>
                  <h4 className="font-extrabold text-base">{activeDocObj?.label || 'Documento PDF'}</h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    Este documento se encuentra procesado y almacenado correctamente en PostgreSQL.
                  </p>
                  {activeDocObj?.url && (
                    <a
                      href={activeDocObj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors"
                    >
                      Abrir PDF en pestaña nueva ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
