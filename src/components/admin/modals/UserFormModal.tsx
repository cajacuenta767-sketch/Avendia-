// src/components/admin/modals/UserFormModal.tsx
'use client';

import React, { useState, useMemo } from 'react';

export interface UserFormData {
  fullName: string;
  email: string;
  modalidad: string;
  nivel: string;
  areas: string[];
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
}

const MODALIDADES = [
  { value: 'EBR', label: 'EBR' },
  { value: 'EBA', label: 'EBA' },
  { value: 'EBE', label: 'EBE' },
  { value: 'CETPRO', label: 'CETPRO' },
];

const NIVELES_POR_MODALIDAD: Record<string, { value: string; label: string }[]> = {
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

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [modalidad, setModalidad] = useState('EBR');
  const [nivel, setNivel] = useState('INICIAL');
  const [selectedAreaInput, setSelectedAreaInput] = useState('Educación Inicial');
  const [assignedAreas, setAssignedAreas] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Niveles disponibles según la modalidad activa
  const nivelesDisponibles = useMemo(() => {
    return NIVELES_POR_MODALIDAD[modalidad] || NIVELES_POR_MODALIDAD.EBR;
  }, [modalidad]);

  // Áreas disponibles según el nivel activo
  const areasDisponibles = useMemo(() => {
    return AREAS_POR_NIVEL[nivel] || AREAS_POR_NIVEL.INICIAL;
  }, [nivel]);

  if (!isOpen) return null;

  const handleModalidadChange = (nuevaMod: string) => {
    setModalidad(nuevaMod);
    const primerNivel = (NIVELES_POR_MODALIDAD[nuevaMod] || NIVELES_POR_MODALIDAD.EBR)[0].value;
    setNivel(primerNivel);
    const primerasAreas = AREAS_POR_NIVEL[primerNivel] || AREAS_POR_NIVEL.INICIAL;
    setSelectedAreaInput(primerasAreas[0]);
    setAssignedAreas([]);
  };

  const handleNivelChange = (nuevoNivel: string) => {
    setNivel(nuevoNivel);
    const primerasAreas = AREAS_POR_NIVEL[nuevoNivel] || AREAS_POR_NIVEL.INICIAL;
    setSelectedAreaInput(primerasAreas[0]);
    setAssignedAreas([]);
  };

  const handleAgregarTodas = () => {
    setAssignedAreas([...areasDisponibles]);
  };

  const handleAgregarIndividual = () => {
    const areaToAdd = selectedAreaInput || areasDisponibles[0];
    if (!areaToAdd) return;
    if (!assignedAreas.includes(areaToAdd)) {
      setAssignedAreas([...assignedAreas, areaToAdd]);
    }
  };

  const handleRemoverArea = (areaToRemove: string) => {
    setAssignedAreas(assignedAreas.filter((a) => a !== areaToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Ingresa el nombre y apellidos del docente.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      modalidad,
      nivel,
      areas: assignedAreas.length > 0 ? assignedAreas : [areasDisponibles[0]],
    });

    setFullName('');
    setEmail('');
    setAssignedAreas([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              NUEVO ACCESO
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Crear usuario Premium
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo: Nombre completo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre y apellidos del docente"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-600"
            />
          </div>

          {/* Campo: Correo electrónico */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@correo.com"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-600"
            />
          </div>

          {/* Selectores: Modalidad y Nivel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Modalidad
              </label>
              <select
                value={modalidad}
                onChange={(e) => handleModalidadChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nivel
              </label>
              <select
                value={nivel}
                onChange={(e) => handleNivelChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                {nivelesDisponibles.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección: Áreas o especialidades */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Áreas o especialidades
            </label>

            {/* Botones Superiores: AGREGAR TODAS vs AGREGAR INDIVIDUALMENTE */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAgregarTodas}
                className="bg-[#38a169] hover:bg-[#2f855a] text-white font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer text-center"
              >
                AGREGAR TODAS
              </button>

              <button
                type="button"
                onClick={handleAgregarIndividual}
                className="border-2 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer shadow-2xs active:scale-95"
              >
                AGREGAR INDIVIDUALMENTE
              </button>
            </div>

            {/* Panel de Selección Individual */}
            <div className="flex items-center space-x-2 pt-1">
              <select
                value={selectedAreaInput}
                onChange={(e) => setSelectedAreaInput(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                {areasDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAgregarIndividual}
                className="bg-[#38a169] hover:bg-[#2f855a] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                <span>✓ AGREGAR</span>
              </button>
            </div>

            {/* Listado de Control Dinámico */}
            <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  ÁREAS/ESPECIALIDADES AGREGADAS
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {assignedAreas.length} agregadas
                </span>
              </div>

              {assignedAreas.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium py-2 text-center">
                  Aún no agregaste ninguna. Selecciona una opción y pulsa Agregar.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {assignedAreas.map((areaItem) => (
                    <span
                      key={areaItem}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center space-x-2"
                    >
                      <span>{areaItem}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverArea(areaItem)}
                        className="text-slate-400 hover:text-rose-600 text-sm font-bold leading-none cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pie del Modal */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase shadow-md transition-colors cursor-pointer"
            >
              GUARDAR ACCESO PREMIUM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
