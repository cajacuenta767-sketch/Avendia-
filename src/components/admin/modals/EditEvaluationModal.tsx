import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Evaluacion } from '@/types/evaluacion';
import { ESPECIALIDADES_DIRECTIVOS_LIST } from '@/data/cascadingData';

interface EditEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluacion: Evaluacion | null;
  onSuccess: () => void;
}

const getDocTypeInfo = (filename?: string | null) => {
  if (!filename) {
    return {
      label: 'PDF',
      icon: '📄',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    };
  }
  const clean = filename.toLowerCase().split('?')[0].split('#')[0];
  if (clean.endsWith('.pptx') || clean.endsWith('.ppt')) {
    return {
      label: 'PPTX / PRESENTACIÓN',
      icon: '📽️',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    };
  }
  if (clean.endsWith('.xlsx') || clean.endsWith('.xls')) {
    return {
      label: 'EXCEL / TABLA',
      icon: '📊',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (clean.endsWith('.csv')) {
    return {
      label: 'CSV / DATOS',
      icon: '📊',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (clean.endsWith('.docx') || clean.endsWith('.doc') || clean.endsWith('.txt')) {
    return {
      label: 'WORD / DOCUMENTO',
      icon: '📝',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    };
  }
  if (clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.webp')) {
    return {
      label: 'IMAGEN',
      icon: '🖼️',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    };
  }
  return {
    label: 'PDF',
    icon: '📄',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  };
};

const ALL_ALLOWED_EXTENSIONS = '.pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/csv,image/*';

export const EditEvaluationModal: React.FC<EditEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluacion,
  onSuccess,
}) => {
  const [titulo, setTitulo] = useState<string>('');
  const [proceso, setProceso] = useState<string>('');
  const [modalidad, setModalidad] = useState<string>('');
  const [nivel, setNivel] = useState<string>('');
  const [especialidad, setEspecialidad] = useState<string>('');
  const [anio, setAnio] = useState<string>('');
  const [tipoCuadernillo, setTipoCuadernillo] = useState<string>('');
  const [estado, setEstado] = useState<'PUBLICADO' | 'BORRADOR'>('BORRADOR');

  const [codigoCuadernillo, setCodigoCuadernillo] = useState<string>('');
  const [codigoResolucion, setCodigoResolucion] = useState<string>('');
  const [codigoClaves, setCodigoClaves] = useState<string>('');

  const [origenCuadernillo, setOrigenCuadernillo] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');
  const [origenResolucion, setOrigenResolucion] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('AVEND');
  const [origenClaves, setOrigenClaves] = useState<'MINEDU' | 'AVEND' | 'OTRO'>('MINEDU');

  const [fileCuadernillo, setFileCuadernillo] = useState<File | null>(null);
  const [fileResolucion, setFileResolucion] = useState<File | null>(null);
  const [fileClaves, setFileClaves] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Combobox para Directivos
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDirectivos = useMemo(() => {
    if (!especialidad.trim()) return ESPECIALIDADES_DIRECTIVOS_LIST;
    const term = especialidad.toLowerCase().trim();
    return ESPECIALIDADES_DIRECTIVOS_LIST.filter((o) => o.toLowerCase().includes(term));
  }, [especialidad]);

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    missingCuadernillo: boolean;
    missingClaves: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    missingCuadernillo: false,
    missingClaves: false,
  });

  useEffect(() => {
    if (evaluacion) {
      setTitulo(evaluacion.titulo || '');
      setProceso(evaluacion.proceso || '');
      setModalidad(evaluacion.modalidad || '');
      setNivel(evaluacion.nivel || '');
      setEspecialidad(evaluacion.especialidad || (evaluacion as any).area || '');
      setAnio(String(evaluacion.anio || ''));
      setTipoCuadernillo(evaluacion.tipoCuadernillo || '');
      setEstado((evaluacion.estado as 'PUBLICADO' | 'BORRADOR') || 'BORRADOR');

      setCodigoCuadernillo(evaluacion.resources?.codigoCuadernillo || (evaluacion as any).codigoCuadernillo || '');
      setCodigoResolucion(evaluacion.resources?.codigoResolucion || (evaluacion as any).codigoResolucion || '');
      setCodigoClaves(evaluacion.resources?.codigoClaves || (evaluacion as any).codigoClaves || '');

      setOrigenCuadernillo((evaluacion.resources?.origenCuadernillo as any) || 'MINEDU');
      setOrigenResolucion((evaluacion.resources?.origenResolucion as any) || 'AVEND');
      setOrigenClaves((evaluacion.resources?.origenClaves as any) || 'MINEDU');

      setFileCuadernillo(null);
      setFileResolucion(null);
      setFileClaves(null);
      setFeedback(null);
      setErrorModal({
        isOpen: false,
        title: '',
        description: '',
        missingCuadernillo: false,
        missingClaves: false,
      });
    }
  }, [evaluacion]);

  if (!isOpen || !evaluacion) return null;

  const currentCuadernilloUrl = evaluacion.resources?.cuadernilloKey || (evaluacion as any).urlCuadernillo || null;
  const currentResolucionUrl = evaluacion.resources?.resolucionKey || (evaluacion as any).urlResolucion || null;
  const currentClavesUrl = evaluacion.resources?.clavesKey || (evaluacion as any).urlClaves || null;

  const tieneCuadernillo = Boolean(fileCuadernillo || currentCuadernilloUrl);
  const tieneClaves = Boolean(fileClaves || currentClavesUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validación estricta solo si intenta publicar: Únicamente el Cuadernillo es obligatorio
    if (estado === 'PUBLICADO') {
      if (!tieneCuadernillo) {
        setErrorModal({
          isOpen: true,
          title: 'Cuadernillo Obligatorio Pendiente',
          description: 'Para publicar este examen en el catálogo docente, es obligatorio que cuente con su Cuadernillo principal.',
          missingCuadernillo: true,
          missingClaves: false,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('id', evaluacion.id);
      formData.append('titulo', titulo);
      formData.append('proceso', proceso);
      formData.append('modalidad', modalidad);
      formData.append('nivel', nivel);
      formData.append('area', especialidad);
      formData.append('anio', anio);
      formData.append('estado', estado);
      if (proceso === 'NOMBRAMIENTO_DOCENTE' && tipoCuadernillo) {
        formData.append('tipoCuadernillo', tipoCuadernillo);
      }

      formData.append('codigoCuadernillo', codigoCuadernillo);
      formData.append('codigoResolucion', codigoResolucion);
      formData.append('codigoClaves', codigoClaves);

      formData.append('origenCuadernillo', origenCuadernillo);
      formData.append('origenResolucion', origenResolucion);
      formData.append('origenClaves', origenClaves);

      if (fileCuadernillo) {
        formData.append('fileCuadernillo', fileCuadernillo);
      } else if (currentCuadernilloUrl) {
        formData.append('urlCuadernillo', currentCuadernilloUrl);
      }

      if (fileResolucion) {
        formData.append('fileResolucion', fileResolucion);
      } else if (currentResolucionUrl) {
        formData.append('urlResolucion', currentResolucionUrl);
      }

      if (fileClaves) {
        formData.append('fileClaves', fileClaves);
      } else if (currentClavesUrl) {
        formData.append('urlClaves', currentClavesUrl);
      }

      const res = await fetch('/api/evaluaciones/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setFeedback('✅ Examen y documentos actualizados correctamente en la base de datos.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setFeedback(`❌ Error al actualizar: ${json.error?.message || json.error}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Error de conexión: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cuadernilloDocInfo = getDocTypeInfo(fileCuadernillo?.name || currentCuadernilloUrl);
  const resolucionDocInfo = getDocTypeInfo(fileResolucion?.name || currentResolucionUrl);
  const clavesDocInfo = getDocTypeInfo(fileClaves?.name || currentClavesUrl);

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="responsive-modal-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-6 animate-in zoom-in-95">
        {/* Encabezado del Modal */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-lg font-black shrink-0 shadow-md shadow-blue-600/30">
              📁
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Adjuntar y Gestionar Documentos del Examen
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-md">
                {titulo || `ID: ${evaluacion.id}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Formulario Principal de Edición y Subida Multi-Formato */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {feedback && (
            <div className={`p-4 rounded-2xl text-xs font-bold ${
              feedback.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
            }`}>
              {feedback}
            </div>
          )}

          {/* Badges Informativos de Clasificación */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-3 py-1 rounded-lg">Proceso: {proceso}</span>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-1 rounded-lg">Modalidad: {modalidad}</span>
            {nivel && <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-1 rounded-lg">Nivel: {nivel}</span>}
            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg">Área: {especialidad}</span>
            <span className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-1 rounded-lg">Año: {anio}</span>
            {tipoCuadernillo && <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-3 py-1 rounded-lg">{tipoCuadernillo}</span>}
          </div>

          {/* Estado de Publicación y Título */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                Título del Examen
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="PUBLICADO">🚀 PUBLICADO (Visible)</option>
                <option value="BORRADOR">🔒 BORRADOR (Oculto)</option>
              </select>
            </div>
          </div>

          {/* Cargo / Área / Subcategoría Editable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? 'Cargo Evaluado / Subcategoría' : 'Área / Especialidad'}
              </label>
              {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
                <div className="relative w-full space-y-1" ref={dropdownRef}>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={especialidad}
                      onChange={(e) => {
                        setEspecialidad(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Ej. Directores de UGEL, Especialistas: Arte y Cultura..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pr-8 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full w-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-52 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95 duration-150">
                      {filteredDirectivos.length > 0 ? (
                        filteredDirectivos.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setEspecialidad(opt);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span>{opt}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 font-extrabold uppercase transition-opacity">
                              Seleccionar ↵
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-center">
                          <p className="text-xs font-semibold text-slate-500">
                            No hay sugerencias predefinidas para &quot;{especialidad}&quot;
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            ✓ Se guardará como cargo personalizado
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Área o Especialidad..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                Código Cuadernillo MINEDU
              </label>
              <input
                type="text"
                value={codigoCuadernillo}
                onChange={(e) => setCodigoCuadernillo(e.target.value)}
                placeholder="Ej. DIR-01, ESP-AC-24..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* SECCIÓN MULTI-FORMATO: CUADERNILLO, RESOLUCIÓN, CLAVES */}
          <div>
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <span>📁</span>
                <span>Documentos del Examen (PDF, PowerPoint, Excel, Word, Imágenes)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                Formatos: .pdf, .pptx, .xlsx, .docx, .png, .jpg
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 📄 1. CUADERNILLO PRINCIPAL */}
              <div className={`p-4 rounded-2xl border-2 space-y-3 transition-all ${
                tieneCuadernillo
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase">
                    📄 Cuadernillo *
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    tieneCuadernillo ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {tieneCuadernillo ? '✓ Adjuntado' : '✕ Sin Archivo'}
                  </span>
                </div>

                {tieneCuadernillo && (
                  <div className="flex items-center space-x-1.5 truncate text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>{cuadernilloDocInfo.icon}</span>
                    <span className="truncate text-[10.5px]">
                      {fileCuadernillo?.name || currentCuadernilloUrl?.split('/').pop() || 'cuadernillo_adjunto'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    {tieneCuadernillo ? 'Cambiar Archivo:' : 'Adjuntar Archivo:'}
                  </label>
                  <input
                    type="file"
                    accept={ALL_ALLOWED_EXTENSIONS}
                    onChange={(e) => setFileCuadernillo(e.target.files?.[0] || null)}
                    className="text-[10px] text-slate-600 dark:text-slate-300 w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>

                {/* Origen Cuadernillo */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] font-black uppercase text-slate-500">Origen:</span>
                  <div className="flex space-x-1">
                    {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                      <button
                        key={org}
                        type="button"
                        onClick={() => setOrigenCuadernillo(org)}
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                          origenCuadernillo === org ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Código:</label>
                  <input
                    type="text"
                    value={codigoCuadernillo}
                    onChange={(e) => setCodigoCuadernillo(e.target.value)}
                    placeholder="Ej. MINEDU-2024-C01"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* 📘 2. RESOLUCIÓN DESARROLLADA */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                    📘 Resolución (Opcional)
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    fileResolucion || currentResolucionUrl ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {fileResolucion || currentResolucionUrl ? '✓ Adjuntado' : '— Sin Archivo'}
                  </span>
                </div>

                {(fileResolucion || currentResolucionUrl) && (
                  <div className="flex items-center space-x-1.5 truncate text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>{resolucionDocInfo.icon}</span>
                    <span className="truncate text-[10.5px]">
                      {fileResolucion?.name || currentResolucionUrl?.split('/').pop() || 'resolucion_adjunta'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    {fileResolucion || currentResolucionUrl ? 'Cambiar Archivo:' : 'Adjuntar Archivo:'}
                  </label>
                  <input
                    type="file"
                    accept={ALL_ALLOWED_EXTENSIONS}
                    onChange={(e) => setFileResolucion(e.target.files?.[0] || null)}
                    className="text-[10px] text-slate-600 dark:text-slate-300 w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                {/* Origen Resolución */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] font-black uppercase text-slate-500">Origen:</span>
                  <div className="flex space-x-1">
                    {(['AVEND', 'MINEDU', 'OTRO'] as const).map((org) => (
                      <button
                        key={org}
                        type="button"
                        onClick={() => setOrigenResolucion(org)}
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                          origenResolucion === org ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Código:</label>
                  <input
                    type="text"
                    value={codigoResolucion}
                    onChange={(e) => setCodigoResolucion(e.target.value)}
                    placeholder="Ej. AVEND-2024-R01"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* 🔑 3. CLAVES OFICIALES */}
              <div className={`p-4 rounded-2xl border-2 space-y-3 transition-all ${
                tieneClaves
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase">
                    🔑 Claves *
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    tieneClaves ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {tieneClaves ? '✓ Adjuntado' : '✕ Sin Archivo'}
                  </span>
                </div>

                {tieneClaves && (
                  <div className="flex items-center space-x-1.5 truncate text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>{clavesDocInfo.icon}</span>
                    <span className="truncate text-[10.5px]">
                      {fileClaves?.name || currentClavesUrl?.split('/').pop() || 'claves_adjuntas'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    {tieneClaves ? 'Cambiar Archivo:' : 'Adjuntar Archivo:'}
                  </label>
                  <input
                    type="file"
                    accept={ALL_ALLOWED_EXTENSIONS}
                    onChange={(e) => setFileClaves(e.target.files?.[0] || null)}
                    className="text-[10px] text-slate-600 dark:text-slate-300 w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                  />
                </div>

                {/* Origen Claves */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] font-black uppercase text-slate-500">Origen:</span>
                  <div className="flex space-x-1">
                    {(['MINEDU', 'AVEND', 'OTRO'] as const).map((org) => (
                      <button
                        key={org}
                        type="button"
                        onClick={() => setOrigenClaves(org)}
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                          origenClaves === org ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Código:</label>
                  <input
                    type="text"
                    value={codigoClaves}
                    onChange={(e) => setCodigoClaves(e.target.value)}
                    placeholder="Ej. MINEDU-2024-K01"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botonera Inferior */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando en Base de Datos...' : '💾 GUARDAR CAMBIOS Y DOCUMENTOS'}
            </button>
          </div>
        </form>

        {/* PANTALLA FLOTANTE DE ERROR ENCIMA DEL MODAL */}
        {errorModal.isOpen && (
          <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner ring-4 ring-rose-500/20">
                ⚠️
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  PUBLICACIÓN BLOQUEADA
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
                  {errorModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {errorModal.description}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-left space-y-2.5 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">📄 Cuadernillo Principal:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black ${
                    errorModal.missingCuadernillo ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {errorModal.missingCuadernillo ? '✕ Falta adjuntar' : '✓ Listo'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">🔑 Claves Oficiales:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black ${
                    errorModal.missingClaves ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {errorModal.missingClaves ? '✕ Falta adjuntar' : '✓ Listo'}
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
                💡 <strong>Solución:</strong> Adjunta los archivos marcados en rojo en los formatos permitidos (PDF, Excel, Word, PPT o Imágenes), o cambia el estado a <strong>BORRADOR</strong> para guardar tu avance.
              </div>

              <button
                type="button"
                onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
              >
                Entendido, voy a adjuntar el archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
