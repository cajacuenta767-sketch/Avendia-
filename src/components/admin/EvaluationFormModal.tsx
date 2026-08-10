// src/components/admin/EvaluationFormModal.tsx
'use client';

import React, { useState } from 'react';
import { createEvaluationAction, generateR2UploadUrlAction } from '@/services/adminService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo } from '@/types/evaluacion';

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ESPECIALIDADES_DIRECTIVOS_LIST,
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
  const [proceso, setProceso] = useState<ProcesoMinedu>('NOMBRAMIENTO_DOCENTE');
  const [modalidad, setModalidad] = useState<ModalidadEducativa>('EBR');
  const [nivel, setNivel] = useState<NivelEducativo>('SECUNDARIA');
  const [especialidad, setEspecialidad] = useState('Matemática');
  const [anio, setAnio] = useState(2024);

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
      const cuadernilloKey = uploadRes.success ? uploadRes.data.key : `evaluations/2024/${cuadernilloFile.name}`;

      let resolucionKey: string | undefined;
      if (resolucionFile) {
        const resUpload = await generateR2UploadUrlAction(resolucionFile.name, 'application/pdf');
        resolucionKey = resUpload.success ? resUpload.data.key : undefined;
      }

      let clavesKey: string | undefined;
      if (clavesFile) {
        const clavUpload = await generateR2UploadUrlAction(clavesFile.name, 'application/pdf');
        clavesKey = clavUpload.success ? clavUpload.data.key : undefined;
      }

      // 2. Registrar Evaluación mediante Server Action
      const createRes = await createEvaluationAction({
        mineduCode,
        title,
        proceso,
        modalidad,
        nivel,
        especialidad,
        anio: Number(anio),
        cuadernilloKey: cuadernilloKey || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
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
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Proceso</label>
              <select
                value={proceso}
                onChange={(e) => {
                  const newProc = e.target.value as ProcesoMinedu;
                  setProceso(newProc);
                  if (newProc === 'ACCESO_CARGOS_DIRECTIVOS') {
                    setNivel('NO_APLICA');
                    setEspecialidad(ESPECIALIDADES_DIRECTIVOS_LIST[0]);
                  } else {
                    const list = NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
                    const primerNivel = list[0].value as NivelEducativo;
                    setNivel(primerNivel);
                    const areasList = AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[primerNivel] || [];
                    setEspecialidad(areasList[0] || '—');
                  }
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente</option>
                <option value="ASCENSO_ESCALAFON">Ascenso de Escala</option>
                <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Directivos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Modalidad</label>
              <select
                value={modalidad}
                disabled={proceso === 'ACCESO_CARGOS_DIRECTIVOS'}
                onChange={(e) => {
                  const newMod = e.target.value as ModalidadEducativa;
                  setModalidad(newMod);
                  const list = NIVELES_POR_MODALIDAD_DATA[newMod as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
                  const primerNivel = list[0].value as NivelEducativo;
                  setNivel(primerNivel);
                  const areasList = AREAS_POR_MODALIDAD_NIVEL[newMod as ModalidadKey]?.[primerNivel] || [];
                  setEspecialidad(areasList[0] || '—');
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs disabled:opacity-60"
              >
                {MODALIDADES_LIST.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nivel</label>
              <select
                value={modalidad === 'EBE' ? 'NO_APLICA' : nivel}
                disabled={proceso === 'ACCESO_CARGOS_DIRECTIVOS' || modalidad === 'EBE'}
                onChange={(e) => {
                  const newNiv = e.target.value as NivelEducativo;
                  setNivel(newNiv);
                  const areasList = AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[newNiv] || [];
                  setEspecialidad(areasList[0] || '—');
                }}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs disabled:opacity-60"
              >
                {modalidad === 'EBE' ? (
                  <option value="—">—</option>
                ) : (
                  (NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR).map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Especialidad / Área
            </label>
            {proceso === 'ACCESO_CARGOS_DIRECTIVOS' ? (
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs font-bold"
              >
                {ESPECIALIDADES_DIRECTIVOS_LIST.map((esp) => (
                  <option key={esp} value={esp}>
                    {esp}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={(AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel] || []).length === 0 ? '—' : especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                disabled={(AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel] || []).length === 0}
                className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs font-bold disabled:opacity-80"
              >
                {(AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel] || []).length === 0 ? (
                  <option value="—">—</option>
                ) : (
                  (AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel] || []).map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Clasificación Obligatoria para Nombramiento Docente */}
          {proceso === 'NOMBRAMIENTO_DOCENTE' && (
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
              <label className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
                Clasificación Obligatoria para Nombramiento Docente *
              </label>
              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                Selecciona la categoría correspondiente para que el docente pueda filtrar el material adecuadamente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  especialidad.toLowerCase().includes('habilidades generales') || especialidad.toLowerCase().includes('general')
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="categoriaNombramiento"
                    checked={especialidad.toLowerCase().includes('habilidades generales') || especialidad.toLowerCase().includes('general')}
                    onChange={() => setEspecialidad('Habilidades Generales')}
                    className="accent-purple-600"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">🧠 Habilidades Generales</span>
                    <span className="text-[10px] opacity-80 block">Comprensión Lectora / Razonamiento Lógico</span>
                  </div>
                </label>

                <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  !especialidad.toLowerCase().includes('habilidades generales') && !especialidad.toLowerCase().includes('general')
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="categoriaNombramiento"
                    checked={!especialidad.toLowerCase().includes('habilidades generales') && !especialidad.toLowerCase().includes('general')}
                    onChange={() => {
                      const areasList = AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nivel] || [];
                      setEspecialidad(areasList[0] || 'Matemática');
                    }}
                    className="accent-purple-600"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">📚 Conocimientos Curriculares</span>
                    <span className="text-[10px] opacity-80 block">Pedagógicos y Especialidad Disciplinar</span>
                  </div>
                </label>
              </div>
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
