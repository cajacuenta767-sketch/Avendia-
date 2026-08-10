// src/components/admin/views/UsuariosView.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserFormModal, UserFormData } from '@/components/admin/modals/UserFormModal';
import { AdminUserFormModal } from '@/components/admin/modals/AdminUserFormModal';
import {
  getUsuariosAction,
  createUsuarioAction,
  updateUsuarioAction,
  deleteUsuarioAction,
  extenderLicenciaAction,
  toggleUserStatusAction,
  UsuarioDocenteItem,
} from '@/services/usuariosService';
import {
  getAdminUsersAction,
  updateAdminUserAction,
  deleteAdminUserAction,
  AdminUserItem,
} from '@/services/adminService';

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ModalidadKey,
  formatAccessBadge,
} from '@/data/cascadingData';

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

  const isSuperAdmin = adminUser.role.toUpperCase().includes('SUPER');

  const [adminTeam, setAdminTeam] = useState<AdminUserItem[]>([]);
  const [isAdminFormModalOpen, setIsAdminFormModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUserItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'docentes' | 'admin_team'>('docentes');

  const loadAdminTeam = async () => {
    const res = await getAdminUsersAction();
    if (res.success) {
      setAdminTeam(res.data);
    }
  };

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
    loadAdminTeam();
  }, []);

  const handleToggleAdminStatus = async (id: string, currentEstado: string, nombre: string) => {
    const nuevoEstado = currentEstado === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    const res = await updateAdminUserAction(id, { estado: nuevoEstado, modificadoPor: adminUser.name });
    if (res.success) {
      await loadAdminTeam();
      showToast(`⚡ Estado del administrador "${nombre}" cambiado a ${nuevoEstado}.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  const handleDeleteAdmin = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la cuenta del administrador "${nombre}"?`)) return;
    const res = await deleteAdminUserAction(id);
    if (res.success) {
      await loadAdminTeam();
      showToast(`🗑️ Administrador "${nombre}" eliminado del equipo por ${adminUser.name}.`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Modal para Editar Usuario (✏️ Botón 2)
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    user: UsuarioDocenteItem | null;
    nombre: string;
    email: string;
    modalidad: string;
    nivel: string;
    selectedAreaInput: string;
    areas: string[];
    duracionOption: '1_year' | '1_month' | '6_months' | 'custom';
    fechaInicio: string;
    fechaFin: string;
    tiposAcceso: { Ascenso: boolean; Nombramiento: boolean; Directivo: boolean };
  }>({
    isOpen: false,
    user: null,
    nombre: '',
    email: '',
    modalidad: 'EBR',
    nivel: 'INICIAL',
    selectedAreaInput: 'Educación Inicial',
    areas: [],
    duracionOption: '6_months',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    tiposAcceso: { Ascenso: true, Nombramiento: true, Directivo: true },
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

  // Modal Emergente "Ver accesos (N)"
  const [accessListModal, setAccessListModal] = useState<{
    isOpen: boolean;
    userName: string;
    areas: string[];
  }>({
    isOpen: false,
    userName: '',
    areas: [],
  });

  // Popover Flotante Global Institucional (Fondo Claro, Alta Legibilidad, Puntero Activo e Interactivo)
  const [hoverPopover, setHoverPopover] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    userName: string;
    areas: string[];
    isPositionTop: boolean;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    userName: '',
    areas: [],
    isPositionTop: true,
  });

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenPopover = (e: React.MouseEvent, userName: string, areas: string[]) => {
    if (areas.length <= 1) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverEstimatedHeight = Math.min(280, areas.length * 38 + 70);
    const spaceAbove = rect.top;
    const isPositionTop = spaceAbove >= popoverEstimatedHeight + 20;

    setHoverPopover({
      isOpen: true,
      x: Math.min(Math.max(10, rect.left), window.innerWidth - 340),
      y: isPositionTop ? Math.max(10, rect.top - 8) : Math.min(window.innerHeight - 10, rect.bottom + 8),
      userName,
      areas,
      isPositionTop,
    });
  };

  const handleScheduleClosePopover = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoverPopover((prev) => ({ ...prev, isOpen: false }));
    }, 350); // Buffer de 350ms para permitir desplazamiento fluido hacia la tarjeta flotante
  };

  const handleCancelClosePopover = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

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
      tiposAcceso: data.tiposAcceso,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
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
    const areasAvail = AREAS_POR_MODALIDAD_NIVEL[mod as ModalidadKey]?.[niv] || [];
    const initialAreas = user.areas && user.areas.length > 0 ? user.areas : (areasAvail[0] ? [areasAvail[0]] : []);

    const todayStr = new Date().toISOString().split('T')[0];

    setEditModal({
      isOpen: true,
      user,
      nombre: user.nombre,
      email: user.email,
      modalidad: mod,
      nivel: niv,
      selectedAreaInput: areasAvail[0] || '—',
      areas: initialAreas,
      duracionOption: '6_months',
      fechaInicio: user.fechaInicio ? user.fechaInicio.split(' ')[0] : todayStr,
      fechaFin: user.fechaFin ? user.fechaFin.split(' ')[0] : todayStr,
      tiposAcceso: { Ascenso: true, Nombramiento: true, Directivo: true },
    });
  };

  const areasDisponiblesEdicion = useMemo(() => {
    const modKey = editModal.modalidad as ModalidadKey;
    const areasObj = AREAS_POR_MODALIDAD_NIVEL[modKey];
    if (!areasObj) return [];
    return areasObj[editModal.nivel] || [];
  }, [editModal.modalidad, editModal.nivel]);

  const nivelesDisponiblesEdicion = useMemo(() => {
    const modKey = editModal.modalidad as ModalidadKey;
    const list = NIVELES_POR_MODALIDAD_DATA[modKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
    return list.map((item) => ({ value: item.value, label: item.label }));
  }, [editModal.modalidad]);

  const handleEditModalidadChange = (nuevaMod: string) => {
    const list = NIVELES_POR_MODALIDAD_DATA[nuevaMod as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR;
    const primerNivel = list[0].value;
    const primerasAreas = AREAS_POR_MODALIDAD_NIVEL[nuevaMod as ModalidadKey]?.[primerNivel] || [];
    setEditModal((prev) => ({
      ...prev,
      modalidad: nuevaMod,
      nivel: primerNivel,
      selectedAreaInput: primerasAreas[0] || '—',
      // SE PRESERVA EL LISTADO PREVIO (EDICIÓN ACUMULATIVA SIN BORRADO AUTOMÁTICO)
    }));
  };

  const handleEditNivelChange = (nuevoNivel: string) => {
    const primerasAreas = AREAS_POR_MODALIDAD_NIVEL[editModal.modalidad as ModalidadKey]?.[nuevoNivel] || [];
    setEditModal((prev) => ({
      ...prev,
      nivel: nuevoNivel,
      selectedAreaInput: primerasAreas[0] || '—',
      // SE PRESERVA EL LISTADO PREVIO (EDICIÓN ACUMULATIVA SIN BORRADO AUTOMÁTICO)
    }));
  };

  const handleAgregarTodasEdicion = () => {
    const modKey = editModal.modalidad as ModalidadKey;
    const list = NIVELES_POR_MODALIDAD_DATA[modKey] || [];
    const nivelObj = list.find((n: { value: string; label: string }) => n.value === editModal.nivel);
    const nivelLabel = nivelObj ? nivelObj.label : editModal.nivel;

    let targetBadge = '';
    if (areasDisponiblesEdicion.length === 0) {
      targetBadge = formatAccessBadge(editModal.modalidad, editModal.nivel);
    } else {
      targetBadge = `${editModal.modalidad} - ${nivelLabel} - General`;
    }

    const prefixToClear = `${editModal.modalidad} - ${nivelLabel} - `;
    setEditModal((prev) => {
      const filtered = prev.areas.filter((b) => !b.startsWith(prefixToClear));
      if (!filtered.includes(targetBadge)) {
        return { ...prev, areas: [...filtered, targetBadge] };
      }
      return { ...prev, areas: filtered };
    });
  };

  const handleAgregarIndividualEdicion = () => {
    let badgeToAdd = '';
    if (areasDisponiblesEdicion.length === 0) {
      badgeToAdd = formatAccessBadge(editModal.modalidad, editModal.nivel);
    } else {
      const areaSel = editModal.selectedAreaInput || areasDisponiblesEdicion[0];
      badgeToAdd = formatAccessBadge(editModal.modalidad, editModal.nivel, areaSel);
    }
    if (!badgeToAdd) return;
    if (!editModal.areas.includes(badgeToAdd)) {
      const nextAreas = [...editModal.areas, badgeToAdd];

      const modKey = editModal.modalidad as ModalidadKey;
      const list = NIVELES_POR_MODALIDAD_DATA[modKey] || [];
      const nivelObj = list.find((n: { value: string; label: string }) => n.value === editModal.nivel);
      const nivelLabel = nivelObj ? nivelObj.label : editModal.nivel;

      if (areasDisponiblesEdicion.length > 0) {
        const expectedBadges = areasDisponiblesEdicion.map((a) => formatAccessBadge(editModal.modalidad, editModal.nivel, a));
        const hasAllIndividual = expectedBadges.every((b) => nextAreas.includes(b));
        if (hasAllIndividual) {
          const generalBadge = `${editModal.modalidad} - ${nivelLabel} - General`;
          const filtered = nextAreas.filter((b) => !expectedBadges.includes(b));
          if (!filtered.includes(generalBadge)) {
            filtered.push(generalBadge);
          }
          setEditModal((prev) => ({ ...prev, areas: filtered }));
          return;
        }
      }

      setEditModal((prev) => ({ ...prev, areas: nextAreas }));
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

    const selectedTiposAcceso = Object.entries(editModal.tiposAcceso)
      .filter(([_, val]) => val)
      .map(([key]) => key);

    const res = await updateUsuarioAction(editModal.user.id, {
      nombre: editModal.nombre,
      email: editModal.email,
      modalidad: editModal.modalidad,
      nivel: editModal.nivel,
      areas: editModal.areas.length > 0 ? editModal.areas : [areasDisponiblesEdicion[0]],
      tiposAcceso: selectedTiposAcceso,
      fechaInicio: editModal.fechaInicio,
      fechaFin: editModal.fechaFin,
      modificadoPor: adminUser.name,
    });

    if (res.success) {
      await loadUsers();
      showToast(`✨ Cambios de ${editModal.nombre.split(' ')[0]} guardados por ${adminUser.name}.`);
      setEditModal({
        isOpen: false,
        user: null,
        nombre: '',
        email: '',
        modalidad: 'EBR',
        nivel: 'INICIAL',
        selectedAreaInput: 'Educación Inicial',
        areas: [],
        duracionOption: '6_months',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        tiposAcceso: { Ascenso: true, Nombramiento: true, Directivo: true },
      });
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

  const adminEmailsSet = useMemo(() => {
    const set = new Set<string>();
    adminTeam.forEach((adm) => {
      if (adm.email) set.add(adm.email.toLowerCase().trim());
      if (adm.usuario) set.add(adm.usuario.toLowerCase().trim());
    });
    return set;
  }, [adminTeam]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const emailClean = (u.email || '').toLowerCase().trim();
      // Excluir a cualquier usuario que ya pertenezca al Equipo de Administradores
      if (adminEmailsSet.has(emailClean)) {
        return false;
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        u.nombre.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.creadoPor && u.creadoPor.toLowerCase().includes(query)) ||
        (u.modificadoPor && u.modificadoPor.toLowerCase().includes(query))
      );
    });
  }, [users, adminEmailsSet, searchQuery]);

  const filteredAdminTeam = useMemo(() => {
    return adminTeam.filter((adm) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        adm.nombre.toLowerCase().includes(q) ||
        adm.email.toLowerCase().includes(q) ||
        adm.usuario.toLowerCase().includes(q) ||
        adm.rol.toLowerCase().includes(q)
      );
    });
  }, [adminTeam, searchQuery]);

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

        {isSuperAdmin ? (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setAdminToEdit(null);
                setIsAdminFormModalOpen(true);
              }}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase rounded-2xl shadow-md shadow-purple-500/20 transition-all flex items-center space-x-2 cursor-pointer shrink-0"
              title="Registrar nuevo Administrador en el equipo interno"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>AGREGAR ADMIN</span>
            </button>
            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className="px-5 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs uppercase rounded-2xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>AGREGAR USUARIO</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsUserModalOpen(true)}
            className="px-5 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs uppercase rounded-2xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>AGREGAR USUARIO</span>
          </button>
        )}
      </div>

      {/* 2. Banner Informativo Dinámico según el Rol del Usuario Conectado */}
      <div className="bg-indigo-50/70 dark:bg-slate-800/70 border border-indigo-100 dark:border-slate-700 text-indigo-950 dark:text-slate-200 rounded-2xl p-4 text-xs flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
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

        {/* Sub-pestañas Exclusivas para Superadministrador */}
        {isSuperAdmin && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs shrink-0 ml-4">
            <button
              type="button"
              onClick={() => setActiveSubTab('docentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'docentes'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              👨‍🏫 Docentes ({filteredUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('admin_team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'admin_team'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🛡️ Equipo Admin ({adminTeam.length})</span>
            </button>
          </div>
        )}
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
            placeholder={activeSubTab === 'docentes' ? "Buscar docente por nombre o correo..." : "Buscar administrador por nombre, correo o usuario..."}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full md:w-auto shrink-0">
          {activeSubTab === 'docentes' && (
            <>
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
            </>
          )}

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
          {activeSubTab === 'docentes' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">DOCENTE / CORREO</th>
                <th className="p-4 text-center">MODALIDAD/NIVEL</th>
                <th className="p-4">INICIO</th>
                <th className="p-4">FIN</th>
                <th className="p-4">MODIFICACIÓN</th>
                <th className="p-4">ESTADO</th>
                <th className="p-4 bg-indigo-50/40 dark:bg-slate-800/80 text-indigo-900 dark:text-indigo-300">
                  CREADO/MODIFICADO POR
                </th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                    No se encontraron registros de accesos.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isVencido = u.estado === 'VENCIDO';
                  const areasList = u.areas || [];

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

                      {/* 1. MODALIDAD/NIVEL (Unificado con Botón Interactivo Ver accesos (N)) */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setAccessListModal({ isOpen: true, userName: u.nombre, areas: areasList })}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs border border-indigo-200/80 dark:border-slate-700 transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          <span>Ver accesos ({areasList.length})</span>
                        </button>
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

                      {/* 8. ESTADO */}
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

                      {/* 9. CREADO/MODIFICADO POR (Trazabilidad SaaS Dinámica) */}
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
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  <th className="p-4">ADMINISTRADOR / CORREO</th>
                  <th className="p-4">USUARIO / LOGIN</th>
                  <th className="p-4">ROL DE ACCESO</th>
                  <th className="p-4">ESTADO</th>
                  <th className="p-4">MÓDULOS HABILITADOS</th>
                  <th className="p-4">CREADO POR</th>
                  <th className="p-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {filteredAdminTeam.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">
                      No se encontraron administradores que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredAdminTeam.map((adm) => {
                    const isPausado = adm.estado === 'PAUSADO';

                    return (
                      <tr key={adm.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* 0. ADMIN / CORREO */}
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
                              {adm.nombre}
                            </p>
                            <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 font-mono truncate max-w-[200px]">
                              {adm.email}
                            </p>
                          </div>
                        </td>

                        {/* 1. USUARIO */}
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                          @{adm.usuario}
                        </td>

                        {/* 2. ROL DE ACCESO */}
                        <td className="p-4">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <span>🛡️</span>
                            <span>{adm.rol.replace('_', ' ')}</span>
                          </span>
                        </td>

                        {/* 3. ESTADO (Toggle Activo / Pausado) */}
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleToggleAdminStatus(adm.id, adm.estado, adm.nombre)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                              isPausado
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                            }`}
                          >
                            <span>{isPausado ? '⏸ PAUSADO' : '● ACTIVO'}</span>
                          </button>
                        </td>

                        {/* 4. MÓDULOS HABILITADOS */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {adm.permisoUsuarios && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                👥 Usuarios
                              </span>
                            )}
                            {adm.permisoCuadernillos && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                📄 Cuadernillos
                              </span>
                            )}
                            {adm.permisoRecursos && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                💡 Recursos
                              </span>
                            )}
                            {adm.permisoMetricas && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                                📊 Métricas
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. CREADO POR */}
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          <p className="font-bold text-slate-700 dark:text-slate-300">{adm.creadoPor || 'Superadmin'}</p>
                          <p className="text-[9px] text-slate-400">{adm.createdAt ? adm.createdAt.split('T')[0] : 'Reg. Inicial'}</p>
                        </td>

                        {/* 6. ACCIONES */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminToEdit(adm);
                                setIsAdminFormModalOpen(true);
                              }}
                              title="Editar administrador"
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(adm.id, adm.nombre)}
                              title="Eliminar administrador"
                              className="w-8 h-8 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleAddUserFromModal}
      />

      <AdminUserFormModal
        isOpen={isAdminFormModalOpen}
        onClose={() => setIsAdminFormModalOpen(false)}
        onSuccess={async (msg) => {
          showToast(msg);
          await loadAdminTeam();
        }}
        adminToEdit={adminToEdit}
        creatorName={adminUser.name}
      />

      {/* Modal Botón 1: Pantalla Flotante de Edición con ÁREAS/ESPECIALIDADES (✏️) */}
      {editModal.isOpen && editModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] max-w-lg w-full">
            {/* Header Fijo */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
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
                onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'Educación Inicial', areas: [], duracionOption: '6_months', fechaInicio: new Date().toISOString().split('T')[0], fechaFin: new Date().toISOString().split('T')[0], tiposAcceso: { Ascenso: true, Nombramiento: true, Directivo: true } })}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario Scrollable Interno con Scrollbar Elegante */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
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
                      disabled={editModal.modalidad === 'EBE'}
                      onChange={(e) => handleEditNivelChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {editModal.modalidad === 'EBE' ? (
                        <option value="NO_APLICA">—</option>
                      ) : (
                        (NIVELES_POR_MODALIDAD_DATA[editModal.modalidad as ModalidadKey] || NIVELES_POR_MODALIDAD_DATA.EBR).map((n) => (
                          <option key={n.value} value={n.value}>{n.label}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Sección Áreas/Especialidades */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Áreas o especialidades</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAgregarTodasEdicion}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase transition-colors text-center cursor-pointer shadow-2xs"
                    >
                      AGREGAR TODAS
                    </button>
                    <button
                      type="button"
                      onClick={handleAgregarIndividualEdicion}
                      className="w-full py-2.5 px-3 rounded-xl border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 font-extrabold text-[11px] uppercase transition-colors text-center cursor-pointer"
                    >
                      AGREGAR INDIVIDUALMENTE
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <select
                      value={editModal.selectedAreaInput}
                      disabled={editModal.modalidad === 'EBE' || areasDisponiblesEdicion.length === 0}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, selectedAreaInput: e.target.value }))}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {editModal.modalidad === 'EBE' || areasDisponiblesEdicion.length === 0 ? (
                        <option value="—">—</option>
                      ) : (
                        areasDisponiblesEdicion.map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={handleAgregarIndividualEdicion}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <span>✓ AGREGAR</span>
                    </button>
                  </div>

                  {/* Lista de Áreas Agregadas */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400">Áreas/Especialidades Agregadas</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {editModal.areas.length} agregadas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                      {editModal.areas.length === 0 ? (
                        <p className="text-[11px] text-slate-400 font-medium italic">Aún no agregaste ninguna. Selecciona una opción y pulsa Agregar.</p>
                      ) : (
                        editModal.areas.map((area) => (
                          <span key={area} className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                            <span>{area}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoverAreaEdicion(area)}
                              className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. Información de Suscripción */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Información de Suscripción</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    {[
                      { key: '1_year', label: '1 año desde hoy' },
                      { key: '1_month', label: '1 mes desde hoy' },
                      { key: '6_months', label: '6 meses desde hoy' },
                      { key: 'custom', label: 'Elegir fecha específica' },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <input
                          type="radio"
                          name="editDuracionOption"
                          value={opt.key}
                          checked={editModal.duracionOption === opt.key}
                          onChange={() => {
                            const option = opt.key as any;
                            const startDate = editModal.fechaInicio;
                            let endDate = startDate;
                            if (option !== 'custom') {
                              const d = new Date(startDate + 'T00:00:00');
                              if (!isNaN(d.getTime())) {
                                if (option === '1_year') d.setFullYear(d.getFullYear() + 1);
                                else if (option === '1_month') d.setMonth(d.getMonth() + 1);
                                else if (option === '6_months') d.setMonth(d.getMonth() + 6);
                                endDate = d.toISOString().split('T')[0];
                              }
                            }
                            setEditModal((prev) => ({
                              ...prev,
                              duracionOption: option,
                              fechaFin: endDate,
                            }));
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-slate-700 dark:text-slate-200">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">F. Inicio</label>
                      <input
                        type="date"
                        value={editModal.fechaInicio}
                        onChange={(e) => {
                          const val = e.target.value;
                          let endDate = editModal.fechaFin;
                          if (editModal.duracionOption !== 'custom') {
                            const d = new Date(val + 'T00:00:00');
                            if (!isNaN(d.getTime())) {
                              if (editModal.duracionOption === '1_year') d.setFullYear(d.getFullYear() + 1);
                              else if (editModal.duracionOption === '1_month') d.setMonth(d.getMonth() + 1);
                              else if (editModal.duracionOption === '6_months') d.setMonth(d.getMonth() + 6);
                              endDate = d.toISOString().split('T')[0];
                            }
                          }
                          setEditModal((prev) => ({
                            ...prev,
                            fechaInicio: val,
                            fechaFin: endDate,
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">F. Fin / Expiración</label>
                      <input
                        type="date"
                        value={editModal.fechaFin}
                        disabled={editModal.duracionOption !== 'custom'}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, fechaFin: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Tipo de Acceso (Checkboxes) */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 08-8 0v4h8z" />
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
                          checked={editModal.tiposAcceso[acc.key as keyof typeof editModal.tiposAcceso]}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditModal((prev) => ({
                              ...prev,
                              tiposAcceso: {
                                ...prev.tiposAcceso,
                                [acc.key]: checked,
                              },
                            }));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{acc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'Educación Inicial', areas: [], duracionOption: '6_months', fechaInicio: new Date().toISOString().split('T')[0], fechaFin: new Date().toISOString().split('T')[0], tiposAcceso: { Ascenso: true, Nombramiento: true, Directivo: true } })}
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
        </div>
      )}

      {/* Modal Botón 3: Ficha de Auditoría de Acceso SaaS (👁️) */}
      {detailModal.isOpen && detailModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] max-w-md w-full">
            {/* Header Fijo */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
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

            {/* Contenido Scrollable Interno con Scrollbar Elegante */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Docente Suscrito</span>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">{detailModal.user.nombre}</h4>
                <p className="text-slate-500 font-medium">{detailModal.user.email}</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Plan Asignado</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs block truncate">
                    Plan Premium
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Modalidad / Nivel</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block truncate">
                    {detailModal.user.modalidad || 'EBR'} - {detailModal.user.nivel || 'INICIAL'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado</span>
                  <span className={`font-black uppercase text-[11px] block truncate ${detailModal.user.estado === 'PREMIUM' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ● {detailModal.user.estado === 'PREMIUM' ? 'Activo' : 'Pausado'}
                  </span>
                </div>
              </div>

              {/* Procesos MINEDU Habilitados */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tipos de Acceso / Procesos Autorizados</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(detailModal.user.tiposAcceso || ['Ascenso', 'Nombramiento', 'Directivo']).map((tipo) => (
                    <span key={tipo} className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                      ✓ {tipo}
                    </span>
                  ))}
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
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
                    {detailModal.user.creadoPor || 'Carlos Mendoza (Soporte)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-indigo-600 font-extrabold">Último Agente Editor:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
                    {detailModal.user.modificadoPor || 'Juan Avend'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pie Fijo de Cierre */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, user: null })}
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs transition-colors cursor-pointer text-center"
              >
                Cerrar Ficha de Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Emergente "Ver accesos (N)" */}
      {accessListModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] max-w-md w-full">
            {/* Cabecera Fija del Modal */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                  ACCESOS ASIGNADOS ({accessListModal.areas.length})
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[280px]">
                  Docente: {accessListModal.userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAccessListModal({ isOpen: false, userName: '', areas: [] })}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Lista Estructurada de Accesos Scrollable Interna */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-2 font-sans">
              {accessListModal.areas.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold py-4 text-center">No tiene accesos asignados.</p>
              ) : (
                accessListModal.areas.map((areaItem, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2.5 shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    <span className="truncate">{areaItem}</span>
                  </div>
                ))
              )}
            </div>

            {/* Botón Fijo de Cierre */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setAccessListModal({ isOpen: false, userName: '', areas: [] })}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer text-center"
              >
                Cerrar Lista
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

      {/* Tarjeta / Popover Flotante Global Institucional (Fondo Claro, Puntero Activo e Interactivo) */}
      {hoverPopover.isOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverPopover.x}px`,
            top: `${hoverPopover.y}px`,
            transform: hoverPopover.isPositionTop ? 'translateY(-100%)' : 'translateY(0)',
            zIndex: 9999,
          }}
          onMouseEnter={handleCancelClosePopover}
          onMouseLeave={handleScheduleClosePopover}
          className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Cabecera Institucional en Modo Claro */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                ACCESOS ASIGNADOS ({hoverPopover.areas.length})
              </span>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[210px]">
                Docente: {hoverPopover.userName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHoverPopover((prev) => ({ ...prev, isOpen: false }))}
              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Lista Estrictamente Vertical Ordenada (Bloques de Alta Legibilidad y Contraste) */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-sans custom-scrollbar">
            {hoverPopover.areas.map((areaItem, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                <span className="truncate">{areaItem}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
