// src/components/admin/views/BancoCuadernillosView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getAniosAction, createAnioAction, createEvaluacionAction } from '@/services/evaluacionesService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo } from '@/types/evaluacion';

interface DocumentState {
  file: File | null;
  base64Url: string;
  status: 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
}

export const BancoCuadernillosView: React.FC = () => {
  // 1. Clasificación Pedagógica
  const [proceso, setProceso] = useState<ProcesoMinedu>('NOMBRAMIENTO_DOCENTE');
  const [modalidad, setModalidad] = useState<ModalidadEducativa>('EBR');
  const [nivel, setNivel] = useState<NivelEducativo>('INICIAL');
  const [area, setArea] = useState('Inicial');

  // Gestión de Años desde PostgreSQL Local
  const [listaAnios, setListaAnios] = useState<string[]>(['2024', '2023', '2022', '2021', '2019']);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('2024');
  const [nuevoAnioInput, setNuevoAnioInput] = useState<string>('');

  const [fuente, setFuente] = useState('Prueba Única Nacional MINEDU');

  // 2. Archivos PDF Locales (0 Cloudflare R2 / 0 AWS)
  const [cuadernilloState, setCuadernilloState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [resolucionState, setResolucionState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });
  const [clavesState, setClavesState] = useState<DocumentState>({ file: null, base64Url: '', status: 'IDLE' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cargar Años desde PostgreSQL local al montar la vista
  useEffect(() => {
    async function loadAnios() {
      const res = await getAniosAction();
      if (res.success && res.data.length > 0) {
        setListaAnios(res.data);
        setAnioSeleccionado(res.data[0]);
      }
    }
    loadAnios();
  }, []);

  // Agregar nuevo Año a PostgreSQL local sin alert() nativo
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
      showToast(`✨ Año ${yearTrimmed} registrado en PostgreSQL local.`);
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
    showToast(`🗑️ Año ${anioSeleccionado} remevido del catálogo.`);
  };

  // Carga 100% Local de PDF usando FileReader Base64
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
      showToast(`✔ ${file.name} cargado localmente.`);
    };
    reader.onerror = () => {
      setState({ file: null, base64Url: '', status: 'ERROR' });
      showToast(`❌ Error al leer el archivo ${file.name}.`);
    };
    reader.readAsDataURL(file);
  };

  // Publicar Examen en PostgreSQL Local
  const handleGenerateThumbnails = async () => {
    if (cuadernilloState.status !== 'SUCCESS') {
      showToast('⚠️ Adjunta el PDF del Cuadernillo Principal antes de publicar.');
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
    });

    setIsSubmitting(false);

    if (res.success) {
      showToast('🎉 ¡Cuadernillo publicado exitosamente en PostgreSQL local!');
      setCuadernilloState({ file: null, base64Url: '', status: 'IDLE' });
      setResolucionState({ file: null, base64Url: '', status: 'IDLE' });
      setClavesState({ file: null, base64Url: '', status: 'IDLE' });
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 relative">
      {/* Banner Informativo Superior */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
            i
          </span>
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              VAS A SUBIR PDF PARA: {proceso} ({anioSeleccionado})
            </h2>
            <p className="text-xs text-slate-600">
              Modalidad: {modalidad} | Nivel: {nivel} | Área: {area}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-2xs">
            {proceso}
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
              Clasificación Pedagógica
            </h3>
          </div>

          {/* Selector 1: Proceso Evaluativo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              PROCESO EVALUATIVO MINEDU
            </label>
            <select
              value={proceso}
              onChange={(e) => setProceso(e.target.value as ProcesoMinedu)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            >
              <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente (Prueba Única Nacional)</option>
              <option value="ASCENSO_ESCALAFON">Ascenso de Escala Magisterial</option>
              <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Cargos Directivos y Especialistas</option>
            </select>
          </div>

          {/* Selector 2: Modalidad Educativa */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              MODALIDAD EDUCATIVA
            </label>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as ModalidadEducativa)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            >
              <option value="EBR">Educación Básica Regular (EBR)</option>
              <option value="EBA">Educación Básica Alternativa (EBA)</option>
              <option value="EBE">Educación Básica Especial (EBE)</option>
            </select>
          </div>

          {/* Selector 3: Nivel Educativo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              NIVEL EDUCATIVO
            </label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as NivelEducativo)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            >
              <option value="INICIAL">Inicial</option>
              <option value="PRIMARIA">Primaria</option>
              <option value="SECUNDARIA">Secundaria</option>
              <option value="NO_APLICA">No Aplica / Cargos Directivos</option>
            </select>
          </div>

          {/* Selector 4: Área / Especialidad */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              ÁREA / ESPECIALIDAD DOCENTE
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ej.: Comunicación, Matemática, Inicial..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          {/* Selector 5: Año del Proceso + Botón Nuevo Año */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              AÑO DE LA EVALUACIÓN
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
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
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs p-3 rounded-xl transition-colors"
              >
                🗑️
              </button>
            </div>

            {/* Input y Botón para Agregar Año Nuevo */}
            <div className="flex items-center space-x-2 pt-2">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0"
              >
                + AÑO
              </button>
            </div>
          </div>

          {/* Campo 6: Fuente Oficial */}
          <div className="space-y-2">
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
        </div>

        {/* Columna Derecha: SECCIÓN 2. ADJUNTA LOS DOCUMENTOS PDF */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                  Adjunta los documentos PDF
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Cada contenido se almacena como archivo independiente en PostgreSQL local.
              </p>
            </div>

            {/* Tarjeta 1: CUADERNILLO MINEDU (REQUERIDO) */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-blue-600">CUADERNILLO * REQUERIDO</span>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Cuadernillo de la prueba</h4>
                <p className="text-[11px] text-slate-500">Documento PDF oficial del examen MINEDU.</p>
              </div>

              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                <span>
                  {cuadernilloState.status === 'UPLOADING'
                    ? 'Cargando...'
                    : cuadernilloState.status === 'SUCCESS'
                    ? '✓ CARGADO'
                    : 'Subir PDF'}
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
            </div>

            {/* Tarjeta 2: RESOLUCIÓN DESARROLLADA (OPCIONAL) */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-500">RESOLUCIÓN OPCIONAL</span>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Resolución desarrollada</h4>
                <p className="text-[11px] text-slate-500">Solucionario paso a paso con explicaciones.</p>
              </div>

              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                <span>
                  {resolucionState.status === 'UPLOADING'
                    ? 'Cargando...'
                    : resolucionState.status === 'SUCCESS'
                    ? '✓ CARGADO'
                    : 'Subir PDF'}
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
            </div>

            {/* Tarjeta 3: CLAVES DE LA PRUEBA (OPCIONAL) */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-500">CLAVES OPCIONAL</span>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Claves de respuestas</h4>
                <p className="text-[11px] text-slate-500">Hoja oficial de respuestas correctas.</p>
              </div>

              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer shadow-2xs transition-colors shrink-0">
                <span>
                  {clavesState.status === 'UPLOADING'
                    ? 'Cargando...'
                    : clavesState.status === 'SUCCESS'
                    ? '✓ CARGADO'
                    : 'Subir PDF'}
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
            </div>
          </div>

          {/* Caja Cierre Inferior lavanda/slate */}
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
    </div>
  );
};
