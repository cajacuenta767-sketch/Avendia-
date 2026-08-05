// src/components/admin/EvaluationFormModal.tsx
'use client';

import React, { useState } from 'react';
import { createEvaluationAction, generateR2UploadUrlAction } from '@/services/adminService';
import { ProcesoMinedu, ModalidadEducativa, NivelEducativo } from '@/types/evaluacion';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                onChange={(e) => setProceso(e.target.value as ProcesoMinedu)}
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
                onChange={(e) => setModalidad(e.target.value as ModalidadEducativa)}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <option value="EBR">EBR</option>
                <option value="EBA">EBA</option>
                <option value="EBE">EBE</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nivel</label>
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value as NivelEducativo)}
                className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <option value="INICIAL">Inicial</option>
                <option value="PRIMARIA">Primaria</option>
                <option value="SECUNDARIA">Secundaria</option>
                <option value="SUPERIOR_TECNICO">Superior / Directivos</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Especialidad / Área
            </label>
            <input
              type="text"
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              placeholder="Matemática"
              className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs"
            />
          </div>

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
