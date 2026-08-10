// src/components/admin/modals/UserFormModal.tsx
'use client';

import React, { useState, useMemo } from 'react';

export interface UserFormData {
  fullName: string;
  email: string;
  modalidad: string;
  nivel: string;
  areas: string[];
  duracionOption?: '1_year' | '1_month' | '6_months' | 'custom';
  fechaInicio?: string;
  fechaFin?: string;
  tiposAcceso?: string[];
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
}

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ModalidadKey,
  formatAccessBadge,
} from '@/data/cascadingData';

const getTodayFormatted = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateEndDate = (startDateStr: string, option: '1_year' | '1_month' | '6_months' | 'custom') => {
  if (option === 'custom') return startDateStr;
  const d = new Date(startDateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return startDateStr;
  if (option === '1_year') {
    d.setFullYear(d.getFullYear() + 1);
  } else if (option === '1_month') {
    d.setMonth(d.getMonth() + 1);
  } else if (option === '6_months') {
    d.setMonth(d.getMonth() + 6);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  // Suscripción y Tipo de Acceso
  const [duracionOption, setDuracionOption] = useState<'1_year' | '1_month' | '6_months' | 'custom'>('6_months');
  const [fechaInicio, setFechaInicio] = useState(getTodayFormatted());
  const [fechaFin, setFechaFin] = useState(calculateEndDate(getTodayFormatted(), '6_months'));
  const [tiposAcceso, setTiposAcceso] = useState<{ Ascenso: boolean; Nombramiento: boolean; Directivo: boolean }>({
    Ascenso: true,
    Nombramiento: true,
    Directivo: true,
  });

  // Niveles disponibles según la modalidad activa
  const nivelesDisponibles = useMemo(() => {
    const list = NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
    return list.map((item) => ({ value: item.value, label: item.label }));
  }, [modalidad]);

  // Áreas disponibles según el nivel activo
  const areasDisponibles = useMemo(() => {
    const modObj = AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey];
    if (!modObj) return [];
    return modObj[nivel] || [];
  }, [modalidad, nivel]);

  if (!isOpen) return null;

  const handleModalidadChange = (nuevaMod: string) => {
    setModalidad(nuevaMod);
    const list = NIVELES_POR_MODALIDAD_DATA[nuevaMod as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
    const primerNivel = list[0].value;
    setNivel(primerNivel);
    const primerasAreas = AREAS_POR_MODALIDAD_NIVEL[nuevaMod as ModalidadKey]?.[primerNivel] || [];
    setSelectedAreaInput(primerasAreas[0] || '—');
  };

  const handleNivelChange = (nuevoNivel: string) => {
    setNivel(nuevoNivel);
    const primerasAreas = AREAS_POR_MODALIDAD_NIVEL[modalidad as ModalidadKey]?.[nuevoNivel] || [];
    setSelectedAreaInput(primerasAreas[0] || '—');
  };

  const handleAgregarTodas = () => {
    const modKey = modalidad as ModalidadKey;
    const list = NIVELES_POR_MODALIDAD_DATA[modKey] || [];
    const nivelObj = list.find((n) => n.value === nivel);
    const nivelLabel = nivelObj ? nivelObj.label : nivel;

    let targetBadge = '';
    if (areasDisponibles.length === 0) {
      targetBadge = formatAccessBadge(modalidad, nivel);
    } else {
      targetBadge = `${modalidad} - ${nivelLabel} - General`;
    }

    const prefixToClear = `${modalidad} - ${nivelLabel} - `;
    const filtered = assignedAreas.filter((b) => !b.startsWith(prefixToClear));

    if (!filtered.includes(targetBadge)) {
      setAssignedAreas([...filtered, targetBadge]);
    } else {
      setAssignedAreas(filtered);
    }
  };

  const handleAgregarIndividual = () => {
    let badgeToAdd = '';
    if (areasDisponibles.length === 0) {
      badgeToAdd = formatAccessBadge(modalidad, nivel);
    } else {
      const areaSel = selectedAreaInput || areasDisponibles[0];
      badgeToAdd = formatAccessBadge(modalidad, nivel, areaSel);
    }
    if (!badgeToAdd) return;
    if (!assignedAreas.includes(badgeToAdd)) {
      const nextAreas = [...assignedAreas, badgeToAdd];

      const modKey = modalidad as ModalidadKey;
      const list = NIVELES_POR_MODALIDAD_DATA[modKey] || [];
      const nivelObj = list.find((n) => n.value === nivel);
      const nivelLabel = nivelObj ? nivelObj.label : nivel;

      if (areasDisponibles.length > 0) {
        const expectedBadges = areasDisponibles.map((a) => formatAccessBadge(modalidad, nivel, a));
        const hasAllIndividual = expectedBadges.every((b) => nextAreas.includes(b));
        if (hasAllIndividual) {
          const generalBadge = `${modalidad} - ${nivelLabel} - General`;
          const filtered = nextAreas.filter((b) => !expectedBadges.includes(b));
          if (!filtered.includes(generalBadge)) {
            filtered.push(generalBadge);
          }
          setAssignedAreas(filtered);
          return;
        }
      }

      setAssignedAreas(nextAreas);
    }
  };

  const handleRemoverArea = (areaToRemove: string) => {
    setAssignedAreas(assignedAreas.filter((a) => a !== areaToRemove));
  };

  const handleDuracionOptionChange = (option: '1_year' | '1_month' | '6_months' | 'custom') => {
    setDuracionOption(option);
    if (option !== 'custom') {
      setFechaFin(calculateEndDate(fechaInicio, option));
    }
  };

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val);
    if (duracionOption !== 'custom') {
      setFechaFin(calculateEndDate(val, duracionOption));
    }
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

    const selectedTiposAcceso = Object.entries(tiposAcceso)
      .filter(([_, val]) => val)
      .map(([key]) => key);

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      modalidad,
      nivel,
      areas: assignedAreas.length > 0 ? assignedAreas : [areasDisponibles[0]],
      duracionOption,
      fechaInicio,
      fechaFin,
      tiposAcceso: selectedTiposAcceso,
    });

    setFullName('');
    setEmail('');
    setAssignedAreas([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabecera Fija del Modal */}
        <div className="p-6 sm:px-8 sm:pt-6 sm:pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-start justify-between">
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

        {/* Formulario Scrollable Interno con Scrollbar Elegante Integrado */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-xs">
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
                {MODALIDADES_LIST.map((m) => (
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
                value={modalidad === 'EBE' ? '—' : nivel}
                disabled={modalidad === 'EBE'}
                onChange={(e) => handleNivelChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {modalidad === 'EBE' ? (
                  <option value="—">—</option>
                ) : (
                  nivelesDisponibles.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))
                )}
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
                disabled={modalidad === 'EBE'}
                onClick={handleAgregarTodas}
                className="bg-[#38a169] hover:bg-[#2f855a] text-white font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                AGREGAR TODAS
              </button>

              <button
                type="button"
                disabled={modalidad === 'EBE'}
                onClick={handleAgregarIndividual}
                className="border-2 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                AGREGAR INDIVIDUALMENTE
              </button>
            </div>

            {/* Panel de Selección Individual */}
            <div className="flex items-center space-x-2 pt-1">
              <select
                value={
                  modalidad === 'EBE'
                    ? '—'
                    : areasDisponibles.length === 0
                    ? (NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || []).find((n) => n.value === nivel)?.label || nivel
                    : selectedAreaInput
                }
                disabled={modalidad === 'EBE'}
                onChange={(e) => setSelectedAreaInput(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {modalidad === 'EBE' ? (
                  <option value="—">—</option>
                ) : areasDisponibles.length === 0 ? (
                  <option
                    value={
                      (NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || []).find((n) => n.value === nivel)?.label || nivel
                    }
                  >
                    {
                      (NIVELES_POR_MODALIDAD_DATA[modalidad as ModalidadKey] || []).find((n) => n.value === nivel)?.label || nivel
                    }
                  </option>
                ) : (
                  areasDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))
                )}
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

            {/* 1. SECCIÓN: INFORMACIÓN DE SUSCRIPCIÓN */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Información de Suscripción</span>
              </div>

              <div className="space-y-2 pl-1">
                {[
                  { key: '1_year', label: '1 año desde hoy' },
                  { key: '1_month', label: '1 mes desde hoy' },
                  { key: '6_months', label: '6 meses desde hoy' },
                  { key: 'custom', label: 'Elegir fecha específica' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center space-x-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="duracionOptionModal"
                      checked={duracionOption === item.key}
                      onChange={() => handleDuracionOptionChange(item.key as any)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">F. Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => handleFechaInicioChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">F. Fin / Expiración</label>
                  <input
                    type="date"
                    value={fechaFin}
                    disabled={duracionOption !== 'custom'}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2. SECCIÓN: TIPO DE ACCESO* */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Tipo de Acceso*</span>
              </div>

              <div className="space-y-2 pl-1">
                {[
                  { key: 'Ascenso', label: 'Ascenso' },
                  { key: 'Nombramiento', label: 'Nombramiento' },
                  { key: 'Directivo', label: 'Directivo' },
                ].map((acc) => (
                  <label key={acc.key} className="flex items-center space-x-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tiposAcceso[acc.key as keyof typeof tiposAcceso]}
                      onChange={(e) => setTiposAcceso((prev) => ({ ...prev, [acc.key]: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>{acc.label}</span>
                  </label>
                ))}
              </div>
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
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase shadow-md transition-colors cursor-pointer"
            >
              Guardar usuario
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
