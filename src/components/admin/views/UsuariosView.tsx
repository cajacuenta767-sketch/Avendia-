// src/components/admin/views/UsuariosView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { UserFormModal, UserFormData } from '@/components/admin/modals/UserFormModal';
import {
  getUsuariosAction,
  createUsuarioAction,
  deleteUsuarioAction,
  extenderLicenciaAction,
  actualizarLicenciaAction,
  UsuarioDocenteItem,
} from '@/services/usuariosService';

export const UsuariosView: React.FC = () => {
  const [users, setUsers] = useState<UsuarioDocenteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal para Eliminar
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string | null }>({
    isOpen: false,
    id: null,
    name: null,
  });

  // Modal para Editar Licencia y Docente
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    user: UsuarioDocenteItem | null;
    nombre: string;
    email: string;
    pin: string;
    fechaFin: string;
  }>({
    isOpen: false,
    user: null,
    nombre: '',
    email: '',
    pin: '',
    fechaFin: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Cargar lista de usuarios pura y exclusivamente desde PostgreSQL
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

  // 2. Alta de Docente con rol "DOCENTE"
  const handleAddUserFromModal = async (data: UserFormData) => {
    const res = await createUsuarioAction({
      dni: data.dni,
      nombre: data.fullName,
      email: data.email,
      pin: data.pin,
      fechaFin: data.endDate,
    });

    if (res.success) {
      await loadUsers();
      showToast('✨ Docente registrado exitosamente en PostgreSQL.');
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // 3. Extender Licencia +30 Días
  const handleExtenderLicencia = async (user: UsuarioDocenteItem) => {
    const res = await extenderLicenciaAction(user.id, 30);
    if (res.success) {
      await loadUsers();
      showToast(`⭐ ¡Licencia de ${user.nombre.split(' ')[0]} extendida por 30 días!`);
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // 4. Abrir Modal de Edición
  const handleOpenEdit = (user: UsuarioDocenteItem) => {
    const formattedDate = new Date(user.fechaFin).toISOString().split('T')[0];
    setEditModal({
      isOpen: true,
      user,
      nombre: user.nombre,
      email: user.email,
      pin: user.pin,
      fechaFin: formattedDate,
    });
  };

  // 5. Guardar Cambios de Edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.user) return;

    const res = await actualizarLicenciaAction(editModal.user.id, {
      nombre: editModal.nombre,
      email: editModal.email,
      pin: editModal.pin,
      fechaFin: editModal.fechaFin,
    });

    if (res.success) {
      await loadUsers();
      setEditModal({ isOpen: false, user: null, nombre: '', email: '', pin: '', fechaFin: '' });
      showToast('✨ Docente y estado de licencia actualizados en PostgreSQL.');
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // 6. Solicitud Eliminar Docente
  const handleRequestDelete = (user: UsuarioDocenteItem) => {
    setDeleteModal({
      isOpen: true,
      id: user.id,
      name: user.nombre,
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.id) return;

    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('docente_session') : null;
      if (stored) {
        const active = JSON.parse(stored);
        if (active.id === deleteModal.id || (deleteModal.id.startsWith('active-') && deleteModal.id.includes(active.dni))) {
          localStorage.removeItem('docente_session');
          window.dispatchEvent(new Event('docente_session_change'));
        }
      }
    } catch (e) {
      console.warn('⚠️ Error al limpiar docente_session:', e);
    }

    const res = await deleteUsuarioAction(deleteModal.id);
    if (res.success) {
      await loadUsers();
      showToast(`🗑️ Docente "${deleteModal.name}" eliminado definitivamente.`);
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
      u.dni.includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestión de Docentes y Licencias
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Administra cuentas de docentes, vigencia de planes y credenciales guardadas en PostgreSQL.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUserModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Registrar Nuevo Docente</span>
        </button>
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

      {/* Barra de Búsqueda */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por DNI, Nombre o Correo del docente..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Tabla de Usuarios Docentes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-4">DNI / Docente</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">PIN</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Vencimiento</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No se encontraron docentes registrados en PostgreSQL.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isVencido = new Date(u.fechaFin) < new Date();
                  const fechaFinFormateada = new Date(u.fechaFin).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div>{u.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono">DNI: {u.dni}</div>
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                        {u.email}
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {u.pin}
                      </td>

                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400 border border-blue-200 dark:border-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                          DOCENTE
                        </span>
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {fechaFinFormateada}
                      </td>

                      <td className="p-4">
                        {isVencido ? (
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                            NO PREMIUM
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                            PREMIUM
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* BOTÓN ⭐ +30 DÍAS */}
                          <button
                            type="button"
                            onClick={() => handleExtenderLicencia(u)}
                            title="Extender suscripción 30 días"
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            ⭐ +30 Días
                          </button>

                          {/* BOTÓN ✏️ EDITAR */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Editar docente y fecha de vencimiento"
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* BOTÓN ELIMINAR */}
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(u)}
                            title="Eliminar docente de PostgreSQL"
                            className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* Modal Registrar Nuevo Docente */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleAddUserFromModal}
      />

      {/* Modal Editar Docente y Licencia con Toggle Premium */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                ✏️ Editar Docente y Licencia
              </h3>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', pin: '', fechaFin: '' })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editModal.nombre}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editModal.email}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PIN Acceso
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editModal.pin}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, pin: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Selector Rápido de Estado Premium */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Estado de Licencia / Plan
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setEditModal((prev) => ({ ...prev, fechaFin: today }));
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      new Date(editModal.fechaFin) < new Date()
                        ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    NO PREMIUM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextYear = new Date();
                      nextYear.setFullYear(nextYear.getFullYear() + 1);
                      setEditModal((prev) => ({ ...prev, fechaFin: nextYear.toISOString().split('T')[0] }));
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      new Date(editModal.fechaFin) >= new Date()
                        ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⭐ ACTIVAR PREMIUM
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Vencimiento de Licencia
                </label>
                <input
                  type="date"
                  required
                  value={editModal.fechaFin}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, fechaFin: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, user: null, nombre: '', email: '', pin: '', fechaFin: '' })}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación React */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-lg">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">¿Deseas eliminar este docente?</h3>
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
