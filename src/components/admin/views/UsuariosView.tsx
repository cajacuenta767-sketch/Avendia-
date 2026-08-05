// src/components/admin/views/UsuariosView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UserFormModal, UserFormData } from '@/components/admin/modals/UserFormModal';
import {
  getUsuariosAction,
  createUsuarioAction,
  updateUsuarioAction,
  deleteUsuarioAction,
  extenderLicenciaAction,
  toggleUserStatusAction,
  UsuarioDocenteItem,
} from '@/services/usuariosService';

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
};

export const UsuariosView: React.FC = () => {
  const [users, setUsers] = useState<UsuarioDocenteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rolFilter, setRolFilter] = useState('TODOS');
  const [periodoFilter, setPeriodoFilter] = useState('ESTA_SEMANA');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Administrador actualmente conectado
  const [adminUser, setAdminUser] = useState<{ name: string; role: string }>({
    name: 'Juan Avend',
    role: 'SUPERADMINISTRADOR',
  });

  useEffect(() => {
    const sessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed.name) {
          setAdminUser({ name: parsed.name, role: parsed.role || 'ADMINISTRADOR' });
        }
      } catch {}
    }
  }, []);

  // Modal para Editar Acceso (✏️ Botón 1)
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    user: UsuarioDocenteItem | null;
    nombre: string;
    email: string;
    modalidad: string;
    nivel: string;
    selectedAreaInput: string;
    areas: string[];
  }>({
    isOpen: false,
    user: null,
    nombre: '',
    email: '',
    modalidad: 'EBR',
    nivel: 'INICIAL',
    selectedAreaInput: 'Educación Inicial',
    areas: [],
  });

  // Modal para Ver Detalles de Auditoría (👁️ Botón 3)
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    user: UsuarioDocenteItem | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Modal para Eliminar (🗑️)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string | null }>({
    isOpen: false,
    id: null,
    name: null,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadUsers = async () => {
    const res = await getUsuariosAction();
    if (res.success) {
      setUsers(res.data);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUserFromModal = async (data: UserFormData) => {
    const res = await createUsuarioAction({
      nombre: data.fullName,
      email: data.email,
      modalidad: data.modalidad,
      nivel: data.nivel,
      areas: data.areas,
      creadoPor: adminUser.name,
    });

    if (res.success) {
      await loadUsers();
      showToast(`✨ Registro de suscripción creado por ${adminUser.name}.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Botón 1: ✏️ Abrir Pantalla Flotante de Edición
  const handleOpenEditModal = (user: UsuarioDocenteItem) => {
    const mod = user.modalidad || 'EBR';
    const niv = user.nivel || 'INICIAL';
    const areasAvail = AREAS_POR_NIVEL[niv] || AREAS_POR_NIVEL.INICIAL;
    const initialAreas = user.areas && user.areas.length > 0 ? user.areas : [areasAvail[0]];

    setEditModal({
      isOpen: true,
      user,
      nombre: user.nombre,
      email: user.email,
      modalidad: mod,
      nivel: niv,
      selectedAreaInput: areasAvail[0],
      areas: initialAreas,
    });
  };

  const areasDisponiblesEdicion = useMemo(() => {
    return AREAS_POR_NIVEL[editModal.nivel] || AREAS_POR_NIVEL.INICIAL;
  }, [editModal.nivel]);

  const nivelesDisponiblesEdicion = useMemo(() => {
    return NIVELES_POR_MODALIDAD[editModal.modalidad] || NIVELES_POR_MODALIDAD.EBR;
  }, [editModal.modalidad]);

  const handleEditModalidadChange = (nuevaMod: string) => {
    const primerNivel = (NIVELES_POR_MODALIDAD[nuevaMod] || NIVELES_POR_MODALIDAD.EBR)[0].value;
    const primerasAreas = AREAS_POR_NIVEL[primerNivel] || AREAS_POR_NIVEL.INICIAL;
    setEditModal((prev) => ({
      ...prev,
      modalidad: nuevaMod,
      nivel: primerNivel,
      selectedAreaInput: primerasAreas[0],
      areas: [primerasAreas[0]],
    }));
  };

  const handleEditNivelChange = (nuevoNivel: string) => {
    const primerasAreas = AREAS_POR_NIVEL[nuevoNivel] || AREAS_POR_NIVEL.INICIAL;
    setEditModal((prev) => ({
      ...prev,
      nivel: nuevoNivel,
      selectedAreaInput: primerasAreas[0],
      areas: [primerasAreas[0]],
    }));
  };

  const handleAgregarTodasEdicion = () => {
    setEditModal((prev) => ({
      ...prev,
      areas: [...areasDisponiblesEdicion],
    }));
  };

  const handleAgregarIndividualEdicion = () => {
    const areaToAdd = editModal.selectedAreaInput || areasDisponiblesEdicion[0];
    if (!areaToAdd) return;
    if (!editModal.areas.includes(areaToAdd)) {
      setEditModal((prev) => ({
        ...prev,
        areas: [...prev.areas, areaToAdd],
      }));
    }
  };

  const handleRemoverAreaEdicion = (areaToRemove: string) => {
    setEditModal((prev) => ({
      ...prev,
      areas: prev.areas.filter((a) => a !== areaToRemove),
    }));
  };

  // Botón DENTRO del Modal de Edición: ⭐ Agregar +30 Días de Suscripción
  const handleExtenderDesdeModal = async () => {
    if (!editModal.user) return;
    const res = await extenderLicenciaAction(editModal.user.id, 30, adminUser.name);
    if (res.success) {
      await loadUsers();
      showToast(`⭐ +30 Días agregados por ${adminUser.name} a la suscripción de ${editModal.nombre.split(' ')[0]}.`);
      setEditModal((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, fechaFin: res.data.fechaFin, modificadoPor: adminUser.name } : null,
      }));
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Guardar Cambios del Modal de Edición
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.user) return;

    const res = await updateUsuarioAction(editModal.user.id, {
      nombre: editModal.nombre,
      email: editModal.email,
      modalidad: editModal.modalidad,
      nivel: editModal.nivel,
      areas: editModal.areas.length > 0 ? editModal.areas : [areasDisponiblesEdicion[0]],
      modificadoPor: adminUser.name,
    });

    if (res.success) {
      await loadUsers();
      showToast(`✨ Cambios de ${editModal.nombre.split(' ')[0]} guardados por ${adminUser.name}.`);
      setEditModal({ isOpen: false, user: null, nombre: '', email: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'Educación Inicial', areas: [] });
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Botón 2: ⏸️ / ▶️ Pausar o Reactivar Estado en PostgreSQL
  const handleTogglePausa = async (user: UsuarioDocenteItem) => {
    const res = await toggleUserStatusAction(user.id, adminUser.name);
    if (res.success) {
      await loadUsers();
      if (res.data.nuevoEstado === 'VENCIDO') {
        showToast(`⏸️ Acceso de ${user.nombre.split(' ')[0]} pausado por ${adminUser.name}.`);
      } else {
        showToast(`▶️ Acceso de ${user.nombre.split(' ')[0]} reactivado por ${adminUser.name}.`);
      }
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Botón 3: 👁️ Abrir Ficha de Auditoría de Acceso SaaS
  const handleVerDetalles = (user: UsuarioDocenteItem) => {
    setDetailModal({
      isOpen: true,
      user,
    });
  };

  const handleExportarExcel = () => {
    showToast('📊 Exportando reporte completo de Usuarios y Accesos a Excel...');
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.id) return;

    const res = await deleteUsuarioAction(deleteModal.id);
    if (res.success) {
      await loadUsers();
      showToast(`🗑️ Docente "${deleteModal.name}" eliminado por ${adminUser.name}.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
    setDeleteModal({ isOpen: false, id: null, name: null });
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.nombre.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.creadoPor && u.creadoPor.toLowerCase().includes(query)) ||
      (u.modificadoPor && u.modificadoPor.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header con Formato SaaS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            PANEL DE ADMINISTRACIÓN AVEND
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Usuarios y accesos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestiona las suscripciones y trazabilidad de accesos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUserModalOpen(true)}
          className="px-5 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs uppercase rounded-2xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ AGREGAR USUARIO</span>
        </button>
      </div>

      {/* 2. Banner Informativo Dinámico según el Rol del Usuario Conectado */}
      <div className="bg-indigo-50/70 dark:bg-slate-800/70 border border-indigo-100 dark:border-slate-700 text-indigo-950 dark:text-slate-200 rounded-2xl p-4 text-xs flex items-center space-x-3 shadow-2xs">
        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
          i
        </div>
        <div className="leading-tight text-xs">
          <strong className="font-extrabold text-indigo-900 dark:text-white">
            Vista de {adminUser.role.toLowerCase()} ({adminUser.name})
          </strong>{' '}
          Puedes ver todos los accesos y la trazabilidad SaaS de quién creó o modificó cada registro.
        </div>
      </div>

      {/* Toast Notificación */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl border border-slate-800 flex items-center justify-between animate-in fade-in duration-200">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 3. Barra de Filtros Completa */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-bold text-slate-400">Rol</span>
            <select
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="TODOS">Todos</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-bold text-slate-400">Periodo</span>
            <select
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ESTA_SEMANA">Esta semana</option>
              <option value="ESTE_MES">Este mes</option>
              <option value="TODOS">Todos los tiempos</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportarExcel}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-slate-700 dark:text-slate-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
          >
            <span>📊 Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* 4. Tabla de Control SaaS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">DOCENTE / CORREO</th>
                <th className="p-4">ROL</th>
                <th className="p-4">MODALIDAD</th>
                <th className="p-4">NIVEL</th>
                <th className="p-4">ÁREA/ESPECIALIDAD</th>
                <th className="p-4">INICIO</th>
                <th className="p-4">FIN</th>
                <th className="p-4">MODIFICACIÓN</th>
                <th className="p-4 bg-indigo-50/40 dark:bg-slate-800/80 text-indigo-900 dark:text-indigo-300">
                  CREADO/MODIFICADO POR
                </th>
                <th className="p-4">ESTADO</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400 font-bold">
                    No se encontraron registros de accesos.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isVencido = u.estado === 'VENCIDO';
                  const areasList = u.areas || [];
                  const mainArea = areasList[0] || 'Todas las especialidades';
                  const extraCount = areasList.length > 1 ? areasList.length - 1 : 0;

                  const editorNombre = u.modificadoPor || u.creadoPor || 'Juan Avend';
                  const creadorNombre = u.creadoPor || 'Juan Avend';
                  const tieneEdicionDiferente = u.modificadoPor && u.modificadoPor !== u.creadoPor;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* 0. DOCENTE / CORREO */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {u.nombre}
                          </p>
                          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 font-mono truncate max-w-[200px]">
                            {u.email}
                          </p>
                        </div>
                      </td>

                      {/* 1. ROL */}
                      <td className="p-4">
                        <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                          Premium
                        </span>
                      </td>

                      {/* 2. MODALIDAD */}
                      <td className="p-4 font-bold text-slate-800 dark:text-white">
                        {u.modalidad || 'EBR'}
                      </td>

                      {/* 3. NIVEL */}
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                        {u.nivel || 'Inicial'}
                      </td>

                      {/* 4. ÁREA/ESPECIALIDAD */}
                      <td className="p-4 max-w-xs">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                            {mainArea}
                          </span>
                          {extraCount > 0 && (
                            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                              +{extraCount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. INICIO */}
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {u.fechaInicio}
                      </td>

                      {/* 6. FIN */}
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {u.fechaFin}
                      </td>

                      {/* 7. MODIFICACIÓN */}
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {u.fechaModificacion || u.fechaInicio}
                      </td>

                      {/* 8. CREADO/MODIFICADO POR (Trazabilidad SaaS Dinámica) */}
                      <td className="p-4 font-extrabold text-slate-900 dark:text-white bg-indigo-50/20 dark:bg-slate-800/40 whitespace-nowrap">
                        {tieneEdicionDiferente ? (
                          <div className="space-y-0.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold block">
                              {editorNombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block">
                              (Creado por: {creadorNombre})
                            </span>
                          </div>
                        ) : (
                          <span>{editorNombre}</span>
                        )}
                      </td>

                      {/* 9. ESTADO */}
                      <td className="p-4">
                        {isVencido ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                            Expirado
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                            Activo
                          </span>
                        )}
                      </td>

                      {/* 10. ACCIONES FUNCIONALES */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* BOTÓN 1: EDITAR / PANTALLA FLOTANTE */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Abrir pantalla flotante de edición"
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            ✏️
                          </button>

                          {/* BOTÓN 2: PAUSAR O REANUDAR */}
                          <button
                            type="button"
                            onClick={() => handleTogglePausa(u)}
                            title={isVencido ? 'Reactivar suscripción Premium' : 'Pausar o suspender suscripción'}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95 ${
                              isVencido
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {isVencido ? '▶️' : '⏸️'}
                          </button>

                          {/* BOTÓN 3: VER DETALLES DE AUDITORÍA SAAS */}
                          <button
                            type="button"
                            onClick={() => handleVerDetalles(u)}
                            title="Ver Ficha de Auditoría de Acceso SaaS"
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            👁️
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
      </div>

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleAddUserFromModal}
      />

      {/* Modal Botón 1: Pantalla Flotante de Edición con ÁREAS/ESPECIALIDADES (✏️) */}
      {editModal.isOpen && editModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                  EDITAR REGISTRO DE ACCESO
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Editar Usuario Premium
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'Educación Inicial', areas: [] })}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nombre completo</label>
                <input
                  type="text"
                  value={editModal.nombre}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Correo electrónico</label>
                <input
                  type="email"
                  value={editModal.email}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Modalidad</label>
                  <select
                    value={editModal.modalidad}
                    onChange={(e) => handleEditModalidadChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="EBR">EBR</option>
                    <option value="EBA">EBA</option>
                    <option value="EBE">EBE</option>
                    <option value="CETPRO">CETPRO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nivel Educativo</label>
                  <select
                    value={editModal.nivel}
                    onChange={(e) => handleEditNivelChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    {nivelesDisponiblesEdicion.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECCIÓN DE ÁREAS O ESPECIALIDADES IDENTICA A CREAR USUARIO */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Áreas o especialidades
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleAgregarTodasEdicion}
                    className="bg-[#38a169] hover:bg-[#2f855a] text-white font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer text-center"
                  >
                    AGREGAR TODAS
                  </button>

                  <button
                    type="button"
                    onClick={handleAgregarIndividualEdicion}
                    className="border-2 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 font-extrabold text-[11px] uppercase py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer shadow-2xs active:scale-95"
                  >
                    AGREGAR INDIVIDUALMENTE
                  </button>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <select
                    value={editModal.selectedAreaInput}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, selectedAreaInput: e.target.value }))}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {areasDisponiblesEdicion.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAgregarIndividualEdicion}
                    className="bg-[#38a169] hover:bg-[#2f855a] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>✓ AGREGAR</span>
                  </button>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      ÁREAS/ESPECIALIDADES AGREGADAS
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {editModal.areas.length} agregadas
                    </span>
                  </div>

                  {editModal.areas.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium py-2 text-center">
                      Aún no agregaste ninguna. Selecciona una opción y pulsa Agregar.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {editModal.areas.map((areaItem) => (
                        <span
                          key={areaItem}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center space-x-2"
                        >
                          <span>{areaItem}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoverAreaEdicion(areaItem)}
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

              {/* Sección Extensión de Suscripción dentro del Modal */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-indigo-950 dark:text-indigo-200">
                    Vigencia Actual: {editModal.user.fechaFin}
                  </span>
                  <button
                    type="button"
                    onClick={handleExtenderDesdeModal}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>⭐ +30 Días de Suscripción</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Presiona el botón superior para agregar 30 días adicionales de acceso Premium a este usuario.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'Educación Inicial', areas: [] })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  GUARDAR CAMBIOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Botón 3: Ficha de Auditoría de Acceso SaaS (👁️) */}
      {detailModal.isOpen && detailModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                  FICHA DE AUDITORÍA SAAS
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Detalles del Acceso Premium
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, user: null })}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Docente Suscrito</span>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">{detailModal.user.nombre}</h4>
                <p className="text-slate-500 font-medium">{detailModal.user.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Modalidad y Nivel</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {detailModal.user.modalidad || 'EBR'} - {detailModal.user.nivel || 'INICIAL'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado Actual</span>
                  <span className={`font-black uppercase text-[11px] ${detailModal.user.estado === 'PREMIUM' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ● {detailModal.user.estado === 'PREMIUM' ? 'Activo (Premium)' : 'Expirado / Pausado'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Áreas o Especialidades Autorizadas</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(detailModal.user.areas || []).map((area) => (
                    <span key={area} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sellos de Tiempo y Trazabilidad SaaS */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-bold">Fecha/Hora de Inicio (Alta):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailModal.user.fechaInicio}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-bold">Fecha/Hora de Fin (Vencimiento):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailModal.user.fechaFin}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-bold">Última Modificación:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailModal.user.fechaModificacion}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-indigo-600 font-extrabold">Creado Por:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                    {detailModal.user.creadoPor || 'Juan Avend'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-indigo-600 font-extrabold">Último Agente Editor:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                    {detailModal.user.modificadoPor || detailModal.user.creadoPor || 'Juan Avend'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, user: null })}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Cerrar Ficha de Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Eliminar (🗑️) */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-lg">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">¿Deseas eliminar este registro?</h3>
            <p className="text-xs text-slate-500">Se eliminará la cuenta de "{deleteModal.name}". Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null, name: null })}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
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
