import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createEvaluationAction, generateR2UploadUrlAction } from '@/services/adminService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo } from '@/types/evaluacion';

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ESPECIALIDADES_DIRECTIVOS_LIST,
  TIPOS_CUADERNILLO_NOMBRAMIENTO,
  ModalidadKey,
} from '@/data/cascadingData';

interface EvaluationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EvaluationFormModal: React.FC<EvaluationFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mineduCode, setMineduCode] = useState('');
  const [title, setTitle] = useState('');
  const [proceso, setProceso] = useState<ProcesoMinedu | ''>('');
  const [tipoCuadernillo, setTipoCuadernillo] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadEducativa | ''>('');
  const [nivel, setNivel] = useState<NivelEducativo | ''>('');
  const [especialidad, setEspecialidad] = useState('');
  const [anio, setAnio] = useState(2024);

  // Dropdown combobox para Directivos
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

  // Orígenes Institucionales de Recursos
  const [origenCuadernillo, setOrigenCuadernillo] = useState<'MINEDU' | 'AVEND'>('MINEDU');
  const [origenResolucion, setOrigenResolucion] = useState<'AVEND' | 'MINEDU'>('AVEND');
  const [origenClaves, setOrigenClaves] = useState<'MINEDU' | 'AVEND'>('MINEDU');

  // Archivos PDF y progreso de carga R2
  const [cuadernilloFile, setCuadernilloFile] = useState<File | null>(null);
  const [resolucionFile, setResolucionFile] = useState<File | null>(null);
  const [clavesFile, setClavesFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const validatePdfFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'El archivo debe ser en formato PDF';
    }
    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxSizeBytes) {
      return 'El archivo excede el tamaño máximo permitido (20 MB)';
    }
    return null;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFileState: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validatePdfFile(file);
      if (error) {
        alert(error);
        e.target.value = '';
        return;
      }
      setFileState(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!proceso) {
      setErrorMessage('Selecciona el Proceso Evaluativo');
      return;
    }
    if (!modalidad && proceso !== 'ACCESO_CARGOS_DIRECTIVOS') {
      setErrorMessage('Selecciona la Modalidad Educativa');
      return;
    }
    const requiresNivelModal = proceso !== 'ACCESO_CARGOS_DIRECTIVOS' && Boolean(modalidad && modalidad !== 'EBE');
    if (requiresNivelModal && !nivel) {
      setErrorMessage('Selecciona el Nivel Educativo');
      return;
    }
    const areasDisponiblesModal = modalidad && nivel ? (AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel as NivelEducativo] || []) : [];
    const requiresAreaModal = proceso === 'ACCESO_CARGOS_DIRECTIVOS' || (Boolean(modalidad && modalidad !== 'EBE' && nivel) && areasDisponiblesModal.length > 0);

    if (requiresAreaModal && !especialidad) {
      setErrorMessage('Selecciona el Área o Especialidad / Cargo');
      return;
    }

    if (!mineduCode.trim() || !title.trim()) {
      setErrorMessage('Ingresa el código oficial y el título de la evaluación');
      return;
    }

    if (!cuadernilloFile) {
      setErrorMessage('El PDF del Cuadernillo Principal es obligatorio');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Obtener Presigned Upload URL para Cuadernillo desde R2
      const uploadRes = await generateR2UploadUrlAction(cuadernilloFile.name, 'application/pdf');
      if (!uploadRes.success) {
        setIsLoading(false);
        setErrorMessage(uploadRes.error.message);
        return;
      }
      const cuadernilloKey = uploadRes.data.key;

      let resolucionKey: string | undefined;
      if (resolucionFile) {
        const resUpload = await generateR2UploadUrlAction(resolucionFile.name, 'application/pdf');
        if (!resUpload.success) {
          setIsLoading(false);
          setErrorMessage(resUpload.error.message);
          return;
        }
        resolucionKey = resUpload.data.key;
      }

      let clavesKey: string | undefined;
      if (clavesFile) {
        const clavUpload = await generateR2UploadUrlAction(clavesFile.name, 'application/pdf');
        if (!clavUpload.success) {
          setIsLoading(false);
          setErrorMessage(clavUpload.error.message);
          return;
        }
        clavesKey = clavUpload.data.key;
      }

      // 2. Registrar Evaluación mediante Server Action
      const createRes = await createEvaluationAction({
        mineduCode: mineduCode.trim(),
        title: title.trim(),
        proceso: proceso as ProcesoMinedu,
        modalidad: (modalidad || 'EBR') as ModalidadEducativa,
        nivel: (nivel || 'NO_APLICA') as NivelEducativo,
        especialidad: requiresAreaModal ? especialidad.trim() : (especialidad.trim() || 'General'),
        tipoCuadernillo: proceso === 'NOMBRAMIENTO_DOCENTE' ? (tipoCuadernillo.trim() || undefined) : undefined,
        anio: Number(anio),
        cuadernilloKey,
        resolucionKey,
        clavesKey,
        origenCuadernillo,
        origenResolucion,
        origenClaves,
      });

      setIsLoading(false);

      if (createRes.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(createRes.error.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Ocurrió un error al cargar los archivos a R2');
    }
  };

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="responsive-modal-panel relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold uppercase tracking-wider border border-blue-100 dark:border-blue-900">
            ➕ Ingesta de Material MINEDU & AVEND
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                CÓDIGO: *
              </label>
              <input
                type="text"
                value={mineduCode}
                onChange={(e) => setMineduCode(e.target.value)}
                placeholder="MINEDU-2024-NOM-SEC-MAT"
                className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Año de Evaluación
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Título Completo de la Prueba
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prueba Única Nacional Nombramiento Docente 2024 - Secundaria Matemática"
              className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Proceso *</label>
              <select
                value={proceso}
                onChange={(e) => {
                  const newProc = e.target.value as ProcesoMinedu | '';
                  setProceso(newProc);
                  setModalidad('');
                  setNivel('');
                  setEspecialidad('');
                  if (newProc === 'ACCESO_CARGOS_DIRECTIVOS') {
                    setModalidad('EBR');
                    setNivel('NO_APLICA');
                    setEspecialidad('');
                  }
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <option value="">-- Seleccione Proceso --</option>
                <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente</option>
                <option value="ASCENSO_ESCALAFON">Ascenso de Escala</option>
                <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Directivos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Modalidad *</label>
              <select
                value={modalidad}
                disabled={!proceso || proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
                onChange={(e) => {
                  const newMod = e.target.value as ModalidadEducativa | '';
                  setModalidad(newMod);
                  setNivel('');
                  setEspecialidad('');
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs disabled:opacity-60"
              >
                <option value="">-- Seleccione Modalidad --</option>
                {MODALIDADES_LIST.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nivel *</label>
              <select
                value={modalidad === 'EBE' ? 'NO_APLICA' : nivel}
                disabled={!modalidad || proceso === 'ACCESO_CARGOS_DIRECTIVOS' || modalidad === 'EBE'}
                onChange={(e) => {
                  const newNiv = e.target.value as NivelEducativo | '';
                  setNivel(newNiv);
                  setEspecialidad('');
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs disabled:opacity-60"
              >
                <option value="">-- Seleccione Nivel --</option>
                {modalidad === 'EBE' ? (
                  <option value="—">—</option>
                ) : (
                  modalidad && (NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR).map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {(() => {
            const areasModal = modalidad && nivel ? (AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel as NivelEducativo] || []) : [];
            const reqArea = proceso === 'ACCESO_CARGOS_DIRECTIVOS' || (modalidad && nivel ? areasModal.length > 0 : true);

            return (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {proceso === 'ACCESO_CARGOS_DIRECTIVOS'
                    ? 'Cargo a Postular *'
                    : reqArea
                    ? 'Especialidad / Área *'
                    : 'Especialidad / Área'}
                </label>
                {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
                  <div className="relative w-full space-y-1" ref={dropdownRef}>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={especialidad}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEspecialidad(val);
                          setIsDropdownOpen(true);
                          if (!title.trim() || title.startsWith('Acceso a Cargos Directivos')) {
                            setTitle(`Acceso a Cargos Directivos y Especialistas ${anio} - ${val}`);
                          }
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Escribe o selecciona el cargo (ej. Especialistas: Arte y Cultura, Directores de UGEL...)"
                        className="w-full h-10 px-3 pr-10 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs font-bold text-emerald-900 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="absolute right-3 p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
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
                                if (!title.trim() || title.startsWith('Acceso a Cargos Directivos')) {
                                  setTitle(`Acceso a Cargos Directivos y Especialistas ${anio} - ${opt}`);
                                }
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
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      💡 Puedes seleccionar de la lista sugerida o escribir cualquier cargo libremente.
                    </p>
                  </div>
                ) : reqArea ? (
                  <select
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    disabled={!modalidad || !nivel}
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs font-bold disabled:opacity-60"
                  >
                    <option value="">-- Seleccione Especialidad / Área --</option>
                    {areasModal.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>✓ Sin especialidad específica (Nivel {nivel === 'INICIAL' ? 'Inicial' : nivel || 'General'})</span>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                      Aplica a todo el Nivel
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Campo Condicional Exclusivo para Nombramiento: Tipo de Cuadernillo */}
          {proceso === 'NOMBRAMIENTO_DOCENTE' && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold text-purple-950 dark:text-purple-300 uppercase tracking-wider">
                Tipo de Cuadernillo *
              </label>
              <select
                value={tipoCuadernillo}
                onChange={(e) => setTipoCuadernillo(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-xs font-black text-purple-950 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                <option value="">-- Selecciona el tipo de cuadernillo --</option>
                {TIPOS_CUADERNILLO_NOMBRAMIENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Origen de Recursos (MINEDU / AVEND) */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300">
              Configuración de Origen Institucional (Badges)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Origen Cuadernillo</label>
                <select
                  value={origenCuadernillo}
                  onChange={(e) => setOrigenCuadernillo(e.target.value as 'MINEDU' | 'AVEND')}
                  className="w-full h-9 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                >
                  <option value="MINEDU">MINEDU</option>
                  <option value="AVEND">AVEND</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Origen Resolución</label>
                <select
                  value={origenResolucion}
                  onChange={(e) => setOrigenResolucion(e.target.value as 'AVEND' | 'MINEDU')}
                  className="w-full h-9 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                >
                  <option value="AVEND">AVEND</option>
                  <option value="MINEDU">MINEDU</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Origen Claves</label>
                <select
                  value={origenClaves}
                  onChange={(e) => setOrigenClaves(e.target.value as 'MINEDU' | 'AVEND')}
                  className="w-full h-9 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                >
                  <option value="MINEDU">MINEDU</option>
                  <option value="AVEND">AVEND</option>
                </select>
              </div>
            </div>
          </div>

          {/* Zona de Subida a Cloudflare R2 */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300">
              Archivos en Cloudflare R2 (PDF máx. 20 MB)
            </h4>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                * PDF del Cuadernillo Principal (Requerido)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, setCuadernilloFile)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                PDF de la Resolución Explicada (Opcional)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, setResolucionFile)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                PDF de Tabla de Claves (Opcional)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, setClavesFile)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>GUARDAR Y PUBLICAR MATERIAL</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
