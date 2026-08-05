// src/components/admin/views/CuadernillosView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getCuadernillosAction,
  crearCuadernilloAction,
  actualizarCuadernilloAction,
  eliminarCuadernilloAction,
  CuadernilloItem,
} from '@/services/cuadernillosService';

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
  NO_APLICA: ['No Aplica / Cargos Directivos', 'Directivos de IE', 'Especialistas de DRE/UGEL'],
};

export const CuadernillosView: React.FC = () => {
  const [items, setItems] = useState<CuadernilloItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal para Crear / Editar
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    targetId: string | null;
    titulo: string;
    proceso: string;
    modalidad: string;
    nivel: string;
    area: string;
    anio: string;
    urlCuadernillo: string;
    esPremium: boolean;
  }>({
    isOpen: false,
    mode: 'CREATE',
    targetId: null,
    titulo: '',
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBR',
    nivel: 'SECUNDARIA',
    area: 'Matemática',
    anio: '2024',
    urlCuadernillo: '',
    esPremium: false,
  });

  // Modal para Eliminar
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; titulo: string | null }>({
    isOpen: false,
    id: null,
    titulo: null,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    const res = await getCuadernillosAction();
    if (res.success) {
      setItems(res.data);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'CREATE',
      targetId: null,
      titulo: '',
      proceso: 'NOMBRAMIENTO_DOCENTE',
      modalidad: 'EBR',
      nivel: 'SECUNDARIA',
      area: 'Matemática',
      anio: '2024',
      urlCuadernillo: '',
      esPremium: false,
    });
  };

  const handleOpenEdit = (item: CuadernilloItem) => {
    setModalState({
      isOpen: true,
      mode: 'EDIT',
      targetId: item.id,
      titulo: item.titulo,
      proceso: item.proceso,
      modalidad: item.modalidad,
      nivel: item.nivel,
      area: item.area,
      anio: item.anio,
      urlCuadernillo: item.urlCuadernillo || '',
      esPremium: item.esPremium,
    });
  };

  // Reseteo en Cascada cuando cambia la Modalidad en el Modal Admin
  const handleModalidadChange = (nuevaModalidad: string) => {
    const niveles = NIVELES_POR_MODALIDAD[nuevaModalidad] || NIVELES_POR_MODALIDAD.EBR;
    const primerNivel = niveles[0].value;
    const primerasAreas = AREAS_POR_NIVEL[primerNivel] || AREAS_POR_NIVEL.INICIAL;

    setModalState((prev) => ({
      ...prev,
      modalidad: nuevaModalidad,
      nivel: primerNivel,
      area: primerasAreas[0],
    }));
  };

  // Reseteo en Cascada cuando cambia el Nivel en el Modal Admin (Evita que quede 'Inicial' en 'Secundaria')
  const handleNivelChange = (nuevoNivel: string) => {
    const primerasAreas = AREAS_POR_NIVEL[nuevoNivel] || AREAS_POR_NIVEL.INICIAL;

    setModalState((prev) => ({
      ...prev,
      nivel: nuevoNivel,
      area: primerasAreas[0], // RESETEA AUTOMÁTICAMENTE EL ÁREA AL NUEVO NIVEL
    }));
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalState.mode === 'CREATE') {
      const res = await crearCuadernilloAction({
        titulo: modalState.titulo,
        proceso: modalState.proceso,
        modalidad: modalState.modalidad,
        nivel: modalState.nivel,
        area: modalState.area,
        anio: modalState.anio,
        urlCuadernillo: modalState.urlCuadernillo,
        esPremium: modalState.esPremium,
      });

      if (res.success) {
        showToast('✨ Cuadernillo registrado exitosamente.');
        setModalState((prev) => ({ ...prev, isOpen: false }));
        await loadData();
      } else {
        showToast(`❌ ${res.error.message}`);
      }
    } else if (modalState.mode === 'EDIT' && modalState.targetId) {
      const res = await actualizarCuadernilloAction(modalState.targetId, {
        titulo: modalState.titulo,
        proceso: modalState.proceso,
        modalidad: modalState.modalidad,
        nivel: modalState.nivel,
        area: modalState.area,
        anio: modalState.anio,
        urlCuadernillo: modalState.urlCuadernillo,
        esPremium: modalState.esPremium,
      });

      if (res.success) {
        showToast('✨ Cuadernillo actualizado correctamente.');
        setModalState((prev) => ({ ...prev, isOpen: false }));
        await loadData();
      } else {
        showToast(`❌ ${res.error.message}`);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    const res = await eliminarCuadernilloAction(deleteModal.id);
    if (res.success) {
      showToast('🗑️ Cuadernillo eliminado correctamente de PostgreSQL.');
      setDeleteModal({ isOpen: false, id: null, titulo: null });
      await loadData();
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const nivelesDisponiblesModal = useMemo(() => {
    if (modalState.proceso === 'ACCESO_CARGOS_DIRECTIVOS') {
      return [{ value: 'NO_APLICA', label: 'No Aplica / Cargos Directivos' }];
    }
    return NIVELES_POR_MODALIDAD[modalState.modalidad] || NIVELES_POR_MODALIDAD.EBR;
  }, [modalState.proceso, modalState.modalidad]);

  const areasDisponiblesModal = useMemo(() => {
    if (modalState.proceso === 'ACCESO_CARGOS_DIRECTIVOS' || modalState.nivel === 'NO_APLICA') {
      return AREAS_POR_NIVEL.NO_APLICA;
    }
    return AREAS_POR_NIVEL[modalState.nivel] || AREAS_POR_NIVEL.INICIAL;
  }, [modalState.proceso, modalState.nivel]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Banco de Cuadernillos MINEDU
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestiona evaluaciones, pruebas oficiales y restricciones Premium guardadas en PostgreSQL.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Agregar Nuevo Cuadernillo</span>
        </button>
      </div>

      {/* Tabla de Cuadernillos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Cargando cuadernillos...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No se encontraron cuadernillos en PostgreSQL.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-extrabold text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Título / Evaluación</th>
                  <th className="px-4 py-3.5">Proceso</th>
                  <th className="px-4 py-3.5">Nivel / Área</th>
                  <th className="px-4 py-3.5 text-center">Año</th>
                  <th className="px-4 py-3.5 text-center">Acceso</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {item.titulo}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-extrabold">
                        {item.proceso}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                      {item.nivel} • <strong className="text-slate-900 dark:text-slate-200">{item.area}</strong>
                    </td>
                    <td className="px-4 py-4 text-center font-bold">{item.anio}</td>
                    <td className="px-4 py-4 text-center">
                      {item.esPremium ? (
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full font-bold text-[10px]">
                          ⭐ PREMIUM
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-bold text-[10px]">
                          LIBRE / FREE
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModal({ isOpen: true, id: item.id, titulo: item.titulo })}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        🗑️ Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar en Panel Administrador */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {modalState.mode === 'CREATE' ? '➕ Agregar Nuevo Cuadernillo' : '✏️ Editar Cuadernillo'}
            </h2>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Título de Evaluación</label>
                <input
                  type="text"
                  required
                  value={modalState.titulo}
                  onChange={(e) => setModalState({ ...modalState, titulo: e.target.value })}
                  placeholder="ej. PUN Nombramiento 2024 - Secundaria Matemática"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Proceso</label>
                  <select
                    value={modalState.proceso}
                    onChange={(e) => {
                      const nuevoProc = e.target.value;
                      if (nuevoProc === 'ACCESO_CARGOS_DIRECTIVOS') {
                        setModalState((prev) => ({ ...prev, proceso: nuevoProc, nivel: 'NO_APLICA', area: AREAS_POR_NIVEL.NO_APLICA[0] }));
                      } else {
                        setModalState((prev) => ({ ...prev, proceso: nuevoProc }));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="NOMBRAMIENTO_DOCENTE">Nombramiento Docente</option>
                    <option value="ASCENSO_ESCALAFON">Ascenso de Escala</option>
                    <option value="ACCESO_CARGOS_DIRECTIVOS">Acceso a Directivos</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Modalidad</label>
                  <select
                    value={modalState.modalidad}
                    onChange={(e) => handleModalidadChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="EBR">EBR</option>
                    <option value="EBA">EBA</option>
                    <option value="EBE">EBE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Nivel</label>
                  <select
                    value={modalState.nivel}
                    onChange={(e) => handleNivelChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {nivelesDisponiblesModal.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Área / Especialidad</label>
                  <select
                    value={modalState.area}
                    onChange={(e) => setModalState({ ...modalState, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {areasDisponiblesModal.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Año</label>
                  <input
                    type="text"
                    required
                    value={modalState.anio}
                    onChange={(e) => setModalState({ ...modalState, anio: e.target.value })}
                    placeholder="2024"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">Enlace / Ruta PDF</label>
                <input
                  type="text"
                  value={modalState.urlCuadernillo}
                  onChange={(e) => setModalState({ ...modalState, urlCuadernillo: e.target.value })}
                  placeholder="/uploads/cuadernillos/ejemplo.pdf"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-2">Restricción de Acceso</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setModalState({ ...modalState, esPremium: false })}
                    className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
                      !modalState.esPremium
                        ? 'bg-slate-800 text-white border-2 border-slate-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🌐 Acceso Libre (Gratuito)
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalState({ ...modalState, esPremium: true })}
                    className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
                      modalState.esPremium
                        ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ⭐ Exclusivo Premium
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Guardar Cuadernillo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              ¿Eliminar cuadernillo?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Se eliminará físicamente de PostgreSQL el cuadernillo <strong className="text-slate-800 dark:text-slate-200">{deleteModal.titulo}</strong>.
            </p>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null, titulo: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
