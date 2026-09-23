// src/components/admin/modals/AdminUserFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createAdminUserAction, updateAdminUserAction, AdminUserItem } from '@/services/adminService';

interface AdminUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  adminToEdit?: AdminUserItem | null;
  creatorName?: string;
}

export const AdminUserFormModal: React.FC<AdminUserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminToEdit = null,
  creatorName = 'Administrador',
}) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'SUPERADMINISTRADOR' | 'ADMINISTRADOR'>('ADMINISTRADOR');
  const [estado, setEstado] = useState<'ACTIVO' | 'PAUSADO'>('ACTIVO');

  // Bloque de Asignación de Permisos por Módulo (Casillas de Selección)
  const [permisoUsuarios, setPermisoUsuarios] = useState(true);
  const [permisoCuadernillos, setPermisoCuadernillos] = useState(true);
  const [permisoRecursos, setPermisoRecursos] = useState(true);
  const [permisoMetricas, setPermisoMetricas] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (adminToEdit) {
      setNombre(adminToEdit.nombre || '');
      setEmail(adminToEdit.email || '');
      setUsuario(adminToEdit.usuario || '');
      setPassword(adminToEdit.password || '');
      setRol((adminToEdit.rol as any) || 'ADMINISTRADOR');
      setEstado(adminToEdit.estado || 'ACTIVO');
      setPermisoUsuarios(adminToEdit.permisoUsuarios ?? true);
      setPermisoCuadernillos(adminToEdit.permisoCuadernillos ?? true);
      setPermisoRecursos(adminToEdit.permisoRecursos ?? true);
      setPermisoMetricas(adminToEdit.permisoMetricas ?? true);
    } else {
      setNombre('');
      setEmail('');
      setUsuario('');
      setPassword('202601');
      setRol('ADMINISTRADOR');
      setEstado('ACTIVO');
      setPermisoUsuarios(true);
      setPermisoCuadernillos(true);
      setPermisoRecursos(true);
      setPermisoMetricas(true);
    }
    setErrorMsg(null);
  }, [adminToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !usuario.trim()) {
      setErrorMsg('⚠️ Por favor completa el nombre, correo y usuario.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    if (adminToEdit) {
      const res = await updateAdminUserAction(adminToEdit.id, {
        nombre,
        email,
        usuario,
        password: password.trim() ? password : undefined,
        rol,
        estado,
        permisoUsuarios,
        permisoCuadernillos,
        permisoRecursos,
        permisoMetricas,
        modificadoPor: creatorName,
      });

      setIsSubmitting(false);
      if (res.success) {
        onSuccess(`✨ Administrador "${nombre}" actualizado correctamente.`);
        onClose();
      } else {
        setErrorMsg(`❌ ${res.error.message}`);
      }
    } else {
      const res = await createAdminUserAction({
        nombre,
        email,
        usuario,
        password: password.trim() ? password : 'Admin2026!',
        rol,
        permisoUsuarios,
        permisoCuadernillos,
        permisoRecursos,
        permisoMetricas,
        creadoPor: creatorName,
      });

      setIsSubmitting(false);
      if (res.success) {
        onSuccess(`🎉 Administrador "${nombre}" registrado exitosamente en la plataforma.`);
        onClose();
      } else {
        setErrorMsg(`❌ ${res.error.message}`);
      }
    }
  };

  return (
    <div className="responsive-modal-shell fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="responsive-modal-panel bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header del Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              GUSTACIÓN EXCLUSIVA DE SUPERADMINISTRADOR
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {adminToEdit ? 'Editar Perfil de Administrador' : 'Agregar Nuevo Administrador'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* Campo 1: Nombre Completo */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              NOMBRE Y APELLIDO *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Carlos Mendoza"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Campo 2: Correo Electrónico y Usuario en Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                CORREO ELECTRÓNICO *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@avend.pe"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                USUARIO / LOGIN *
              </label>
              <input
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="carlos.mendoza"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Campo 3: CÓDIGO DE ACCESO ASIGNADO y Rol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                CÓDIGO DE ACCESO / PIN ASIGNADO *
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ej.: 202601"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-400 leading-tight">
                PIN de acceso asignado fijado por el Superadmin para ingresar por correo sin contraseñas estáticas.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                ROL DE ACCESO *
              </label>
              <select
                value={rol}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  setRol(selectedRole as any);
                  if (selectedRole === 'SUPERADMINISTRADOR' || selectedRole === 'ADMINISTRADOR') {
                    setPermisoUsuarios(true);
                    setPermisoCuadernillos(true);
                    setPermisoRecursos(true);
                    setPermisoMetricas(true);
                  } else if (selectedRole === 'REGISTRADOR') {
                    setPermisoUsuarios(true);
                    setPermisoCuadernillos(false);
                    setPermisoRecursos(false);
                    setPermisoMetricas(false);
                  } else if (selectedRole === 'GESTOR_LICENCIAS') {
                    setPermisoUsuarios(true);
                    setPermisoCuadernillos(false);
                    setPermisoRecursos(false);
                    setPermisoMetricas(false);
                  } else if (selectedRole === 'GESTOR_CUADERNILLOS') {
                    setPermisoUsuarios(false);
                    setPermisoCuadernillos(true);
                    setPermisoRecursos(false);
                    setPermisoMetricas(false);
                  } else if (selectedRole === 'GESTOR_RECURSOS') {
                    setPermisoUsuarios(false);
                    setPermisoCuadernillos(false);
                    setPermisoRecursos(true);
                    setPermisoMetricas(false);
                  } else if (selectedRole === 'AUDITOR_SAAS') {
                    setPermisoUsuarios(false);
                    setPermisoCuadernillos(false);
                    setPermisoRecursos(false);
                    setPermisoMetricas(true);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-600 cursor-pointer"
              >
                <option value="ADMINISTRADOR">ADMINISTRADOR (GESTOR GENERAL)</option>
                <option value="SUPERADMINISTRADOR">SUPERADMINISTRADOR (ACCESO TOTAL Y EQUIPO)</option>
                <option value="GESTOR_LICENCIAS">GESTOR DE LICENCIAS (USUARIOS Y SUSCRIPCIONES)</option>
                <option value="REGISTRADOR">REGISTRADOR (SOLO AGREGA SUS DOCENTES · EDICIÓN 14 DÍAS)</option>
                <option value="GESTOR_CUADERNILLOS">GESTOR DE CUADERNILLOS (ESPECIALISTA MINEDU)</option>
                <option value="GESTOR_RECURSOS">GESTOR DE RECURSOS (MATERIALES Y DIDÁCTICA)</option>
                <option value="AUDITOR_SAAS">AUDITOR Y ANALISTA SAAS (MÉTRICAS E INDICADORES)</option>
              </select>
            </div>
          </div>

          {/* Bloque Exclusivo: ASIGNACIÓN DE FUNCIONES Y PERMISOS CONFIGURABLES POR MÓDULO */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 pt-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">
                ASIGNACIÓN DE FUNCIONES Y PERMISOS CONFIGURABLES
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Marca las casillas de verificación de los módulos a los cuales este administrador tendrá acceso:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={permisoUsuarios}
                  onChange={(e) => setPermisoUsuarios(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    👥 Módulo 1: Gestión de Usuarios y Licencias Docentes
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Crear docentes, extender vigencias de suscripción y pausar accesos.
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={permisoCuadernillos}
                  onChange={(e) => setPermisoCuadernillos(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    📄 Módulo 2: Carga y Banco de Cuadernillos MINEDU
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Subir PDF de exámenes, solucionarios paso a paso y claves de respuestas.
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={permisoRecursos}
                  onChange={(e) => setPermisoRecursos(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    💡 Módulo 3: Carga y Administración de Recursos Didácticos
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Publicar fichas pedagógicas descargables, nemotecnias y resúmenes.
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={permisoMetricas}
                  onChange={(e) => setPermisoMetricas(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    📊 Módulo 4: Visualización de Métricas e Indicadores SaaS
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Consultar resumen general de suscripciones vigentes y vencimientos.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              {isSubmitting ? 'Guardando...' : adminToEdit ? 'Guardar Cambios' : 'Registrar Administrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
