// src/components/admin/views/UsuariosView.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserFormModal, UserFormData } from '@/components/admin/modals/UserFormModal';
import { AdminUserFormModal } from '@/components/admin/modals/AdminUserFormModal';
import { BulkUserImportModal } from '@/components/admin/modals/BulkUserImportModal';
import {
  AltasSemanalesPanel,
  DocenteAuditoriaPanel,
  MisAltasSemanalesResumen,
  RegistradoresReportPanel,
} from '@/components/admin/views/RegistradoresPanels';
import {
  getUsuariosAction,
  createUsuarioAction,
  updateUsuarioAction,
  deleteUsuarioAction,
  extenderLicenciaAction,
  toggleUserStatusAction,
  toggleDocenteTipoAccesoAction,
  regenerateDocentePinAction,
  UsuarioDocenteItem,
} from '@/services/usuariosService';
import { condenseAccessBadges } from '@/utils/badgeUtils';
import {
  getAdminUsersAction,
  updateAdminUserAction,
  deleteAdminUserAction,
  AdminUserItem,
} from '@/services/adminService';
import { exportDocentesToExcel, exportAdminsToExcel } from '@/lib/exportExcel';
import { getUserWhatsAppLink } from '@/lib/whatsapp';

import {
  MODALIDADES_LIST,
  NIVELES_POR_MODALIDAD as NIVELES_POR_MODALIDAD_DATA,
  AREAS_POR_MODALIDAD_NIVEL,
  ModalidadKey,
  formatAccessBadge,
} from '@/data/cascadingData';

const formatToInputDate = (dateStr?: string | Date): string => {
  const today = new Date().toISOString().split('T')[0];
  if (!dateStr) return today;
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return today;
    return dateStr.toISOString().split('T')[0];
  }
  const str = String(dateStr).trim();
  if (!str) return today;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  const ddMMyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddMMyyyyMatch) {
    const day = ddMMyyyyMatch[1].padStart(2, '0');
    const month = ddMMyyyyMatch[2].padStart(2, '0');
    const year = ddMMyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return today;
};

const getLocalTodayInputDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calcEndDateExact = (
  startDateStr: string,
  option: '1_year' | '1_month' | '6_months' | 'custom'
): string => {
  const startClean = formatToInputDate(startDateStr);
  if (option === 'custom') return startClean;
  const d = new Date(startClean + 'T00:00:00');
  if (isNaN(d.getTime())) return startClean;

  let monthsToAdd = 0;
  if (option === '1_year') monthsToAdd = 12;
  else if (option === '6_months') monthsToAdd = 6;
  else if (option === '1_month') monthsToAdd = 1;

  const targetMonth = d.getMonth() + monthsToAdd;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface UsuariosViewProps {
  /** REGISTRADOR: solo ve y gestiona los docentes que él registró (alcance aplicado en el servidor). */
  isRegistrador?: boolean;
  /** Rol firmado por el servidor (/api/auth/session); decide qué herramientas se muestran. */
  sessionRole?: string;
}

// Días restantes de la ventana de edición de 14 días del REGISTRADOR (0 = solo lectura).
function getRegistradorDiasRestantes(user: UsuarioDocenteItem): number {
  if (!user.editableHasta) return 0;
  const remainingMs = Date.parse(user.editableHasta) - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : 0;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({ isRegistrador = false, sessionRole = '' }) => {
  const [users, setUsers] = useState<UsuarioDocenteItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'ACTIVO' | 'EXPIRADO'>('TODOS');
  const [registradoPorFilter, setRegistradoPorFilter] = useState('TODOS');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    searchInputRef.current?.blur();
    setTimeout(() => {
      tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const resolveAdminName = (name?: string, email?: string): string => {
    const emailLower = (email || '').toLowerCase();
    if (emailLower === 'cajacuenta767@gmail.com' || emailLower === 'cajacuenta767') {
      return 'Bryan';
    }
    return name && name.trim() ? name.trim() : 'Administrador';
  };

  // Administrador actualmente conectado: el nombre es solo presentación (almacenamiento local);
  // el rol proviene de la sesión firmada por el servidor.
  const [storedAdmin, setStoredAdmin] = useState<{ name: string; email: string }>({ name: 'Administrador', email: '' });
  const effectiveRole = isRegistrador ? 'REGISTRADOR' : (sessionRole || 'ADMINISTRADOR');
  const adminUser = { ...storedAdmin, role: effectiveRole };
  const isSuperAdmin = !isRegistrador && sessionRole === 'SUPERADMINISTRADOR';

  const [adminTeam, setAdminTeam] = useState<AdminUserItem[]>([]);
  const [isAdminFormModalOpen, setIsAdminFormModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUserItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'docentes' | 'admin_team' | 'registradores'>('docentes');

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
        const emailLower = (parsed.email || '').toLowerCase();
        setStoredAdmin({ name: resolveAdminName(parsed.name || parsed.usuario, emailLower), email: emailLower });
      } catch {}
    }
    if (!isRegistrador) loadAdminTeam();
  }, [isRegistrador]);

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
    telefono: string;
    pin: string;
    region: string;
    institucionEducativa: string;
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
    telefono: '',
    pin: '',
    region: 'Lima',
    institucionEducativa: '',
    modalidad: 'EBR',
    nivel: 'INICIAL',
    selectedAreaInput: 'General',
    areas: [],
    duracionOption: '1_year',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    tiposAcceso: { Ascenso: false, Nombramiento: false, Directivo: false },
  });
  const [visiblePins, setVisiblePins] = useState<Set<string>>(() => new Set());

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

  const handle1ClickToggleAccess = async (userId: string, tipo: 'Ascenso' | 'Nombramiento' | 'Directivo') => {
    // Actualización optimista instantánea (<1ms)
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id !== userId) return item;
        const currentAcc = [...(item.tiposAcceso || [])];
        const idx = currentAcc.indexOf(tipo);
        if (idx >= 0) currentAcc.splice(idx, 1);
        else currentAcc.push(tipo);

        const isNowActive = currentAcc.length > 0;
        return {
          ...item,
          tiposAcceso: currentAcc,
          estado: isNowActive ? 'PREMIUM' : 'VENCIDO',
        };
      })
    );

    const res = await toggleDocenteTipoAccesoAction(userId, tipo);
    if (res.success) {
      showToast(`⚡ Acceso '${tipo}' actualizado en 1-clic`);
      await loadUsers();
    } else {
      showToast(`❌ ${res.error.message}`);
      await loadUsers();
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUserFromModal = async (data: UserFormData) => {
    const res = await createUsuarioAction({
      nombre: data.fullName,
      email: data.email,
      telefono: data.telefono,
      pin: data.pin,
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
    const parsedUserAreas = (Array.isArray(user.areas) ? user.areas : [])
      .map((a: any) => (a !== null && a !== undefined ? String(a).trim() : ''))
      .filter(Boolean);
    const initialAreas = parsedUserAreas.length > 0 ? parsedUserAreas : (areasAvail[0] ? [areasAvail[0]] : []);

    const startDateInput = formatToInputDate(user.fechaInicio);
    // Al editar, conservar la vigencia real almacenada. Solo los botones de
    // duración o una edición manual pueden cambiar la fecha de finalización.
    const durOption: '1_year' | '1_month' | '6_months' | 'custom' = 'custom';
    const endDateInput = formatToInputDate(user.fechaFin);

    const cleanPhone = (user.telefono && !user.telefono.startsWith('USR-') && user.telefono.replace(/[^0-9]/g, '').length >= 8)
      ? user.telefono
      : '';
    const userTipos = Array.isArray(user.tiposAcceso) && user.tiposAcceso.length > 0
      ? user.tiposAcceso
      : ['Ascenso', 'Nombramiento', 'Directivo'];

    setEditModal({
      isOpen: true,
      user,
      nombre: user.nombre,
      email: user.email,
      telefono: cleanPhone,
      // El PIN existente no se expone en el formulario. Vacío significa conservarlo.
      pin: '',
      region: user.region || 'Lima',
      institucionEducativa: user.institucionEducativa || '',
      modalidad: mod,
      nivel: niv,
      selectedAreaInput: areasAvail[0] || '—',
      areas: initialAreas,
      duracionOption: durOption,
      fechaInicio: startDateInput,
      fechaFin: endDateInput,
      tiposAcceso: {
        Ascenso: userTipos.includes('Ascenso'),
        Nombramiento: userTipos.includes('Nombramiento'),
        Directivo: userTipos.includes('Directivo'),
      },
    });
  };

  const handleRegeneratePersistentPin = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Regenerar el PIN persistente de ${nombre}? El PIN anterior dejará de funcionar inmediatamente.`)) return;

    const result = await regenerateDocentePinAction(id);
    if (!result.success) {
      showToast(`❌ ${result.error.message}`);
      return;
    }

    setUsers((current) => current.map((user) => (
      user.id === id ? { ...user, pin: result.data.pin } : user
    )));
    setEditModal((current) => (
      current.user?.id === id ? { ...current, pin: result.data.pin } : current
    ));
    setVisiblePins((current) => new Set(current).add(id));
    showToast(`🔑 Nuevo PIN persistente generado para ${nombre.split(' ')[0]}: ${result.data.pin}`);
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
      const currentAreas = (Array.isArray(prev.areas) ? prev.areas : [])
        .map((b: any) => (b !== null && b !== undefined ? String(b).trim() : ''))
        .filter(Boolean);
      const filtered = currentAreas.filter((b) => !b.startsWith(prefixToClear));
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
    const currentAreas = (Array.isArray(editModal.areas) ? editModal.areas : [])
      .map((b: any) => (b !== null && b !== undefined ? String(b).trim() : ''))
      .filter(Boolean);
    if (!currentAreas.includes(badgeToAdd)) {
      const nextAreas = [...currentAreas, badgeToAdd];

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
      areas: (Array.isArray(prev.areas) ? prev.areas : [])
        .map((a: any) => (a !== null && a !== undefined ? String(a).trim() : ''))
        .filter((a) => Boolean(a) && a !== areaToRemove),
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

    const originalStartDate = formatToInputDate(editModal.user.fechaInicio);
    const originalEndDate = formatToInputDate(editModal.user.fechaFin);
    const subscriptionDatesChanged =
      editModal.fechaInicio !== originalStartDate || editModal.fechaFin !== originalEndDate;
    const selectedEndDate = new Date(`${editModal.fechaFin}T12:00:00`);
    const willBeActive = !Number.isNaN(selectedEndDate.getTime()) && selectedEndDate > new Date();

    // La vista refleja la vigencia elegida; el servidor vuelve a validarla antes de guardar.
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id !== editModal.user?.id) return item;
        return {
          ...item,
          nombre: editModal.nombre,
          email: editModal.email,
          telefono: editModal.telefono,
          pin: editModal.pin.trim() || item.pin,
          modalidad: editModal.modalidad,
          nivel: editModal.nivel,
          areas: editModal.areas,
          tiposAcceso: selectedTiposAcceso,
          fechaInicio: editModal.fechaInicio,
          fechaFin: editModal.fechaFin,
          estado: willBeActive ? 'PREMIUM' : 'VENCIDO',
        };
      })
    );

    const res = await updateUsuarioAction(editModal.user.id, {
      nombre: editModal.nombre,
      email: editModal.email,
      telefono: editModal.telefono,
      pin: editModal.pin.trim() || undefined,
      modalidad: editModal.modalidad,
      nivel: editModal.nivel,
      areas: editModal.areas.length > 0 ? editModal.areas : [areasDisponiblesEdicion[0]],
      tiposAcceso: selectedTiposAcceso,
      fechaInicio: editModal.fechaInicio,
      fechaFin: editModal.fechaFin,
      renewSubscription: subscriptionDatesChanged,
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
        telefono: '',
        pin: '',
        region: 'Lima',
        institucionEducativa: '',
        modalidad: 'EBR',
        nivel: 'INICIAL',
        selectedAreaInput: 'General',
        areas: [],
        duracionOption: '1_year',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        tiposAcceso: { Ascenso: false, Nombramiento: false, Directivo: false },
      });
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // Botón 2: ⏸️ / ▶️ Pausar o Reactivar Estado en PostgreSQL
  const handleTogglePausa = async (user: UsuarioDocenteItem) => {
    // Actualización optimista instantánea en la interfaz (<1ms)
    const nextVencido = user.estado !== 'VENCIDO';
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id !== user.id) return item;
        return {
          ...item,
          estado: nextVencido ? 'VENCIDO' : 'PREMIUM',
          tiposAcceso: nextVencido ? [] : ['Ascenso', 'Nombramiento', 'Directivo'],
        };
      })
    );

    const res = await toggleUserStatusAction(user.id, adminUser.name);
    if (res.success) {
      await loadUsers();
      if (res.data.nuevoEstado === 'VENCIDO') {
        showToast(`⏸️ Acceso de ${user.nombre.split(' ')[0]} pausado por ${adminUser.name}.`);
      } else {
        showToast(`▶️ Acceso de ${user.nombre.split(' ')[0]} reactivado por 1 año por ${adminUser.name}.`);
      }
    } else {
      showToast(`❌ ${res.error.message}`);
      await loadUsers();
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
    if (activeSubTab === 'docentes') {
      const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;
      if (!dataToExport || dataToExport.length === 0) {
        showToast('ℹ️ No hay registros de docentes disponibles para exportar.');
        return;
      }
      const success = exportDocentesToExcel(dataToExport);
      if (success) {
        showToast(`📊 Reporte de ${dataToExport.length} docente(s) exportado exitosamente a Excel.`);
      } else {
        showToast('❌ Error al exportar los datos a Excel.');
      }
    } else {
      const dataToExport = filteredAdminTeam.length > 0 ? filteredAdminTeam : adminTeam;
      if (!dataToExport || dataToExport.length === 0) {
        showToast('ℹ️ No hay administradores secundarios para exportar.');
        return;
      }
      const success = exportAdminsToExcel(dataToExport);
      if (success) {
        showToast(`📊 Reporte de ${dataToExport.length} administrador(es) exportado exitosamente a Excel.`);
      } else {
        showToast('❌ Error al exportar los datos a Excel.');
      }
    }
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

  const countActivos = useMemo(() => {
    return users.filter((u) => !adminEmailsSet.has((u.email || '').toLowerCase().trim()) && u.estado === 'PREMIUM').length;
  }, [users, adminEmailsSet]);

  const countExpirados = useMemo(() => {
    return users.filter((u) => !adminEmailsSet.has((u.email || '').toLowerCase().trim()) && u.estado === 'VENCIDO').length;
  }, [users, adminEmailsSet]);

  const filteredUsers = useMemo(() => {
    const list = users.filter((u) => {
      const emailClean = (u.email || '').toLowerCase().trim();
      // Excluir a cualquier usuario que ya pertenezca al Equipo de Administradores
      if (adminEmailsSet.has(emailClean)) {
        return false;
      }

      // Filtro por Estado (Activo / Expirado)
      if (estadoFilter === 'ACTIVO' && u.estado !== 'PREMIUM') return false;
      if (estadoFilter === 'EXPIRADO' && u.estado !== 'VENCIDO') return false;
      if (registradoPorFilter !== 'TODOS' && (u.creadoPor || 'Administrador') !== registradoPorFilter) return false;

      const query = searchQuery.toLocaleLowerCase().trim();
      if (!query) return true;

      const queryDigits = query.replace(/[^0-9]/g, '');
      const userNumberDigits = [u.telefono, u.dni]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/[^0-9]/g, ''));
      const matchPhone = queryDigits.length >= 2 && userNumberDigits.some((value) => value.includes(queryDigits));

      return (
        (u.nombre || '').toLocaleLowerCase().includes(query) ||
        (u.email || '').toLocaleLowerCase().includes(query) ||
        (u.telefono || '').toLocaleLowerCase().includes(query) ||
        (u.dni || '').toLocaleLowerCase().includes(query) ||
        matchPhone ||
        (u.region && u.region.toLowerCase().includes(query)) ||
        (u.institucionEducativa && u.institucionEducativa.toLowerCase().includes(query)) ||
        (u.creadoPor && u.creadoPor.toLowerCase().includes(query)) ||
        (u.modificadoPor && u.modificadoPor.toLowerCase().includes(query))
      );
    });

    // Las coincidencias exactas aparecen primero. Dentro del mismo nivel de
    // coincidencia, conservar el orden de alta más reciente del servidor.
    return list.sort((a, b) => {
      const query = searchQuery.toLocaleLowerCase().trim();
      const queryDigits = query.replace(/[^0-9]/g, '');
      const rank = (user: UsuarioDocenteItem): number => {
        if (!query) return 0;
        const textValues = [user.email, user.nombre, user.telefono, user.dni]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLocaleLowerCase().trim());
        const digitValues = [user.telefono, user.dni]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.replace(/[^0-9]/g, ''));

        if (textValues.includes(query) || (queryDigits && digitValues.includes(queryDigits))) return 0;
        if (textValues.some((value) => value.startsWith(query)) || (queryDigits && digitValues.some((value) => value.startsWith(queryDigits)))) return 1;
        return 2;
      };

      const rankDifference = rank(a) - rank(b);
      if (rankDifference !== 0) return rankDifference;

      const aCreatedAt = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bCreatedAt = b.createdAt ? Date.parse(b.createdAt) : 0;
      const createdAtDifference = bCreatedAt - aCreatedAt;
      if (createdAtDifference !== 0) return createdAtDifference;

      return b.id.localeCompare(a.id);
    });
  }, [users, adminEmailsSet, searchQuery, estadoFilter, registradoPorFilter, activeSubTab]);

  const registradoPorOptions = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.creadoPor || 'Administrador'))).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSubTab, estadoFilter, registradoPorFilter]);

  const filteredAdminTeam = useMemo(() => {
    const superadminEmails = ['cajacuenta767@gmail.com', 'avendoficial@gmail.com', 'cajacuenta767', 'avendoficial'];
    return adminTeam.filter((adm) => {
      // Excluir Superadministradores de la vista de la tabla
      if (
        adm.rol === 'SUPERADMINISTRADOR' ||
        superadminEmails.includes((adm.email || '').toLowerCase()) ||
        superadminEmails.includes((adm.usuario || '').toLowerCase())
      ) {
        return false;
      }
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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12 min-w-0">
      {/* 1. Header con Formato SaaS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
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
          <div className="grid grid-cols-1 min-[460px]:grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="w-full sm:w-auto justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase rounded-2xl shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-2 cursor-pointer"
              title="Importar masivamente docentes desde un archivo Excel o CSV"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>IMPORTAR EXCEL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdminToEdit(null);
                setIsAdminFormModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase rounded-2xl shadow-md shadow-purple-500/20 transition-all flex items-center space-x-2 cursor-pointer"
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
              className="w-full min-[460px]:col-span-2 sm:w-auto justify-center px-5 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs uppercase rounded-2xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>AGREGAR USUARIO</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col min-[460px]:flex-row gap-2 w-full sm:w-auto">
            {!isRegistrador && (
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="w-full sm:w-auto justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase rounded-2xl shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-2 cursor-pointer"
              title="Importar masivamente docentes desde un archivo Excel o CSV"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>IMPORTAR EXCEL</span>
            </button>
            )}

            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className="w-full sm:w-auto justify-center px-5 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs uppercase rounded-2xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>AGREGAR USUARIO</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Banner Informativo Dinámico según el Rol del Usuario Conectado */}
      <div className="bg-indigo-50/70 dark:bg-slate-800/70 border border-indigo-100 dark:border-slate-700 text-indigo-950 dark:text-slate-200 rounded-2xl p-4 text-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
            i
          </div>
          <div className="leading-tight text-xs">
            <strong className="font-extrabold text-indigo-900 dark:text-white">
              Vista de {isRegistrador ? 'registrador' : adminUser.role.toLowerCase()} ({adminUser.name})
            </strong>{' '}
            {isRegistrador
              ? 'Solo ves los docentes que registraste. Puedes modificarlos durante 14 días desde su registro; después quedan en solo lectura.'
              : 'Puedes ver todos los accesos y la trazabilidad SaaS de quién creó o modificó cada registro.'}
          </div>
        </div>

        {/* Sub-pestañas Exclusivas para Superadministrador */}
        {isSuperAdmin && (
          <div className="responsive-control-group bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs w-full lg:w-auto lg:min-w-[290px]" style={{ '--responsive-control-columns': 3 } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => setActiveSubTab('docentes')}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeSubTab === 'admin_team'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🛡️ Equipo Admin ({filteredAdminTeam.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('registradores')}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'registradores'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              📈 Registradores
            </button>
          </div>
        )}
      </div>

      {/* Toast Notificación */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl border border-slate-800 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <span className="min-w-0 break-words">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {isRegistrador && <MisAltasSemanalesResumen refreshKey={users.length} />}

      {/* 3. Barra de Filtros Completa */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full min-w-0">
          <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit(e);
              }
            }}
            placeholder={activeSubTab === 'docentes' ? "🔍 Buscar docente por nombre, correo o celular (WhatsApp)..." : "🔍 Buscar administrador por nombre, correo o usuario..."}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50/60 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600 font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              title="Limpiar búsqueda"
              className="absolute right-3 top-2.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </form>

        <div className="flex flex-col md:flex-row md:flex-wrap xl:flex-nowrap items-stretch md:items-center gap-2.5 w-full 2xl:w-auto shrink-0">
          {activeSubTab === 'docentes' && (
            <>
              {/* Botones de Filtro por Estado: Activo y Expirado */}
              <div className="responsive-control-group md:basis-full xl:basis-auto xl:flex-1 2xl:flex-none 2xl:!w-auto xl:![grid-template-columns:repeat(3,minmax(max-content,1fr))] bg-gray-100/80 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700" style={{ '--responsive-control-columns': 3 } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => setEstadoFilter('TODOS')}
                  className={`w-full whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    estadoFilter === 'TODOS'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({countActivos + countExpirados})
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoFilter('ACTIVO')}
                  className={`w-full whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    estadoFilter === 'ACTIVO'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${estadoFilter === 'ACTIVO' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  <span>Activos ({countActivos})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoFilter('EXPIRADO')}
                  className={`w-full whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    estadoFilter === 'EXPIRADO'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${estadoFilter === 'EXPIRADO' ? 'bg-white' : 'bg-rose-500'}`}></span>
                  <span>Expirados ({countExpirados})</span>
                </button>
              </div>
            </>
          )}

          {activeSubTab === 'docentes' && !isRegistrador && registradoPorOptions.length > 1 && (
            <select
              value={registradoPorFilter}
              onChange={(e) => setRegistradoPorFilter(e.target.value)}
              aria-label="Filtrar por quién registró al docente"
              className="w-full md:w-auto md:flex-1 xl:flex-none shrink-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs px-3 py-2 rounded-xl shadow-2xs cursor-pointer outline-none"
            >
              <option value="TODOS">Registrado por: Todos</option>
              {registradoPorOptions.map((nombre) => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
          )}

          {activeSubTab !== 'registradores' && (
          <button
            type="button"
            onClick={handleExportarExcel}
            className="w-full md:w-auto md:flex-1 xl:flex-none shrink-0 whitespace-nowrap justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-slate-700 dark:text-slate-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
          >
            <span>📊 Exportar Excel</span>
          </button>
          )}
        </div>
      </div>

      {/* 4. Tabla de Control SaaS */}
      <div ref={tableContainerRef} id="tabla-docentes" className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-xs scroll-mt-24">
        <div className="overflow-x-auto">
          {activeSubTab === 'docentes' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 w-12 text-center">#</th>
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
                  <td colSpan={9} className="p-10 text-center text-slate-400 font-bold">
                    No se encontraron registros de accesos.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const itemIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  const isVencido = u.estado === 'VENCIDO';
                  const areasList = condenseAccessBadges(u.areas || []);

                  const editorNombre = u.modificadoPor || u.creadoPor || 'Administrador';
                  const creadorNombre = u.creadoPor || 'Administrador';
                  const tieneEdicionDiferente = u.modificadoPor && u.modificadoPor !== u.creadoPor;
                  const diasEditables = isRegistrador ? getRegistradorDiasRestantes(u) : 0;
                  const isSoloLectura = isRegistrador && diasEditables === 0;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* # NÚMERO CORRELATIVO */}
                      <td className="p-4 text-center font-mono font-bold text-slate-400 dark:text-slate-500 text-xs">
                        {itemIndex}
                      </td>

                      {/* 0. DOCENTE / CORREO / CELULAR / PIN */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate max-w-[220px]">
                            {u.nombre}
                          </p>
                          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 font-mono truncate max-w-[220px]">
                            {u.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {(u.telefono || (u.dni && !u.dni.startsWith('USR-') && u.dni.replace(/[^0-9]/g, '').length >= 6)) && (
                              <a
                                href={getUserWhatsAppLink(u.telefono || u.dni, u.nombre, u.email, u.pin)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Enviar mensaje de WhatsApp a ${u.nombre} (${u.telefono || u.dni})`}
                                className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800 shadow-2xs cursor-pointer active:scale-95 transition-all"
                              >
                                <span>📱</span>
                                <span className="font-mono">{u.telefono || u.dni}</span>
                              </a>
                            )}
                            {u.pin && u.pin.trim() !== '' ? (
                              <div className="inline-flex items-center overflow-hidden rounded-lg border border-indigo-200/80 bg-indigo-50 text-[10px] font-black text-indigo-700 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                                <button
                                  type="button"
                                  onClick={() => setVisiblePins((current) => {
                                    const next = new Set(current);
                                    if (next.has(u.id)) next.delete(u.id);
                                    else next.add(u.id);
                                    return next;
                                  })}
                                  title={visiblePins.has(u.id) ? 'Ocultar PIN persistente' : 'Mostrar PIN persistente'}
                                  aria-label={visiblePins.has(u.id) ? `Ocultar PIN de ${u.nombre}` : `Mostrar PIN de ${u.nombre}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                >
                                  <span>{visiblePins.has(u.id) ? '🙈' : '👁️'}</span>
                                  <span>PIN:</span>
                                  <span className="min-w-[30px] font-mono">{visiblePins.has(u.id) ? u.pin : '••••'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                      navigator.clipboard.writeText(u.pin);
                                    }
                                    showToast(`📋 PIN persistente ${u.pin} de ${u.nombre.split(' ')[0]} copiado.`);
                                  }}
                                  title="Copiar PIN persistente"
                                  aria-label={`Copiar PIN persistente de ${u.nombre}`}
                                  className="border-l border-indigo-200 px-1.5 py-0.5 hover:bg-indigo-100 dark:border-indigo-800 dark:hover:bg-indigo-900/60"
                                >
                                  📋
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* 1. MODALIDAD/NIVEL */}
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
                        {isRegistrador && (
                          <span
                            className={`block mb-1.5 text-[10px] font-black uppercase whitespace-nowrap ${
                              isSoloLectura ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isSoloLectura ? '🔒 Solo lectura' : `Editable ${diasEditables} día${diasEditables === 1 ? '' : 's'} más`}
                          </span>
                        )}
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isSoloLectura && (
                          <>
                          {/* BOTÓN 1: EDITAR / PANTALLA FLOTANTE */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Abrir pantalla flotante de edición"
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            ✏️
                          </button>

                          {/* BOTÓN 2: PAUSAR O REANUDAR (ACCESO DIRECTO 1-CLIC) */}
                          <button
                            type="button"
                            onClick={() => handleTogglePausa(u)}
                            title={isVencido ? 'Reactivar suscripción (Otorgar 1 año completo)' : 'Pausar / suspender suscripción'}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 ${
                              isVencido
                                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:border-emerald-700'
                                : 'border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:border-blue-700'
                            }`}
                          >
                            {isVencido ? (
                              <svg className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400 ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 fill-blue-600 dark:fill-blue-400" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                              </svg>
                            )}
                          </button>
                          </>
                          )}

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
          ) : activeSubTab === 'admin_team' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/80 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  <th className="p-4 w-12 text-center">#</th>
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
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                        <span className="text-3xl">🛡️</span>
                        <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">
                          No hay administradores secundarios delegados
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Los Superadministradores gestionan la plataforma de forma global. Utiliza el botón <span className="font-bold text-indigo-600 dark:text-indigo-400">+ Nuevo Administrador</span> para delegar accesos y módulos a nuevos administradores.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAdminTeam.map((adm, idx) => {
                    const isPausado = adm.estado === 'PAUSADO';

                    return (
                      <tr key={adm.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* # NÚMERO CORRELATIVO */}
                        <td className="p-4 text-center font-mono font-bold text-purple-400 dark:text-purple-500 text-xs">
                          {idx + 1}
                        </td>

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
          ) : (
            <>
              <AltasSemanalesPanel onToast={showToast} />
              <RegistradoresReportPanel onToast={showToast} />
            </>
          )}
        </div>

        {/* Controles de Paginación (100 docentes por página) */}
        {activeSubTab === 'docentes' && filteredUsers.length > 0 && (
          <div className="w-full p-3 sm:p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 min-w-0">
              <span className="text-center sm:text-left">
                Mostrando{' '}
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{' '}
                al{' '}
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
                </span>{' '}
                de{' '}
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {filteredUsers.length.toLocaleString()}
                </span>{' '}
                docentes
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ✓ Más recientes primero
              </span>
            </div>

            {totalPages > 1 && (
              <div className="grid grid-cols-2 min-[420px]:grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="Primera página"
                  className="w-full sm:w-auto px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed text-[11px] whitespace-nowrap"
                  title="Primera Página"
                >
                  « <span className="hidden sm:inline">Primera</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed text-[11px] whitespace-nowrap"
                >
                  ‹ <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="col-span-2 min-[420px]:col-span-1 flex items-center justify-center space-x-1 px-2 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                  <span>Página</span>
                  <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-300 font-black">
                    {currentPage}
                  </span>
                  <span>de {totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed text-[11px] whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Siguiente </span>›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Última página"
                  className="w-full sm:w-auto px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed text-[11px] whitespace-nowrap"
                  title="Última Página"
                >
                  <span className="hidden sm:inline">Última </span>»
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        hideVigencia={isRegistrador}
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
                onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', telefono: '', pin: '', region: 'Lima', institucionEducativa: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'General', areas: [], duracionOption: '1_year', fechaInicio: new Date().toISOString().split('T')[0], fechaFin: new Date().toISOString().split('T')[0], tiposAcceso: { Ascenso: false, Nombramiento: false, Directivo: false } })}
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Número de Celular / WhatsApp</label>
                  <input
                    type="tel"
                    value={editModal.telefono}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: 954562938 (Opcional)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      PIN persistente (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (editModal.user) void handleRegeneratePersistentPin(editModal.user.id, editModal.nombre);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold flex items-center space-x-1 cursor-pointer"
                      title="Regenerar el PIN persistente"
                    >
                      <span>🎲 Regenerar</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editModal.pin}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    onChange={(e) => setEditModal((prev) => ({
                      ...prev,
                      pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))}
                    maxLength={4}
                    placeholder="Vacío: conservar o continuar sin PIN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono tracking-wider"
                  />
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Déjalo vacío para conservar el PIN actual. Si no tiene PIN persistente, podrá seguir ingresando con el código enviado a su correo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Región de Procedencia</label>
                    <select
                      value={editModal.region}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, region: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      {[
                        'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
                        'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
                        'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
                        'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
                      ].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Institución Educativa</label>
                    <input
                      type="text"
                      value={editModal.institucionEducativa}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, institucionEducativa: e.target.value }))}
                      placeholder="Ej: I.E. 1234 Pedro Paulet"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none placeholder-slate-400"
                    />
                  </div>
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <select
                      value={editModal.selectedAreaInput}
                      disabled={editModal.modalidad === 'EBE' || areasDisponiblesEdicion.length === 0}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, selectedAreaInput: e.target.value }))}
                      className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 min-w-0"
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
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center justify-center space-x-1"
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
                {!isRegistrador && (
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Información de Suscripción</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
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
                            const option = opt.key as '1_year' | '1_month' | '6_months' | 'custom';
                            setEditModal((prev) => ({
                              ...prev,
                              duracionOption: option,
                              ...(option === 'custom'
                                ? {}
                                : {
                                    fechaInicio: getLocalTodayInputDate(),
                                    fechaFin: calcEndDateExact(getLocalTodayInputDate(), option),
                                  }),
                            }));
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="text-slate-700 dark:text-slate-200 text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">F. Inicio</label>
                      <input
                        type="date"
                        value={editModal.fechaInicio}
                        disabled={editModal.duracionOption !== 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditModal((prev) => ({
                            ...prev,
                            fechaInicio: val,
                            fechaFin: prev.fechaFin < val ? val : prev.fechaFin,
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">F. Fin / Expiración</label>
                      <input
                        type="date"
                        value={editModal.fechaFin}
                        min={editModal.fechaInicio}
                        disabled={editModal.duracionOption !== 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const finalVal = val < editModal.fechaInicio ? editModal.fechaInicio : val;
                          setEditModal((prev) => ({ ...prev, fechaFin: finalVal }));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                )}

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
                    onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', telefono: '', pin: '', region: 'Lima', institucionEducativa: '', modalidad: 'EBR', nivel: 'INICIAL', selectedAreaInput: 'General', areas: [], duracionOption: '1_year', fechaInicio: new Date().toISOString().split('T')[0], fechaFin: new Date().toISOString().split('T')[0], tiposAcceso: { Ascenso: false, Nombramiento: false, Directivo: false } })}
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

              {/* Información de Contacto / Número de Celular */}
              {(() => {
                const modalPhone =
                  detailModal.user.telefono && detailModal.user.telefono.replace(/[^0-9]/g, '').length >= 6
                    ? detailModal.user.telefono
                    : detailModal.user.dni && !detailModal.user.dni.startsWith('USR-') && detailModal.user.dni.replace(/[^0-9]/g, '').length >= 6
                    ? detailModal.user.dni
                    : '';

                return (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Número de Celular / WhatsApp</span>
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <span>📱</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          {modalPhone || 'Sin número registrado'}
                        </span>
                      </div>
                    </div>
                    {modalPhone && (
                      <a
                        href={getUserWhatsAppLink(modalPhone, detailModal.user.nombre, detailModal.user.email, detailModal.user.pin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#00a651] hover:bg-[#008f45] text-white text-[10px] font-black flex items-center space-x-1 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <span>💬</span>
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                );
              })()}

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

              {/* Información de Ubicación / Procedencia */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Región de Procedencia</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block truncate">
                    📍 {detailModal.user.region || 'Lima'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Institución Educativa</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block truncate">
                    🏫 {detailModal.user.institucionEducativa || 'Sin IE'}
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
                    {detailModal.user.modificadoPor || detailModal.user.creadoPor || 'Administrador'}
                  </span>
                </div>
              </div>

              {!isRegistrador && (
                <DocenteAuditoriaPanel
                  key={detailModal.user.id}
                  docenteId={detailModal.user.id}
                  creadoPorAdminId={detailModal.user.creadoPorAdminId}
                  isSuperAdmin={isSuperAdmin}
                  registradores={adminTeam.filter((adm) => adm.rol === 'REGISTRADOR').map((adm) => ({ id: adm.id, nombre: adm.nombre }))}
                  onChanged={loadUsers}
                  onToast={showToast}
                />
              )}
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

      {/* Modal de Importación Masiva de Usuarios (Docentes) */}
      <BulkUserImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          loadUsers();
          showToast('✅ Importación masiva de docentes procesada exitosamente.');
        }}
        adminName={adminUser.name}
      />
    </div>
  );
};
