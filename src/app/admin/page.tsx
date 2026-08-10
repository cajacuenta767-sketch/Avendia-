// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { InicioView } from '@/components/admin/views/InicioView';
import { UsuariosView } from '@/components/admin/views/UsuariosView';
import { BancoCuadernillosView } from '@/components/admin/views/BancoCuadernillosView';
import { RecursosAdminView } from '@/components/admin/views/RecursosAdminView';

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [permissions, setPermissions] = useState({
    permisoUsuarios: true,
    permisoCuadernillos: true,
    permisoRecursos: true,
    permisoMetricas: true,
  });

  useEffect(() => {
    const sessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed.token && parsed.token.includes('admin_session_')) {
          setIsAuthenticated(true);
          const isSuper = (parsed.email || '').toLowerCase() === 'cajacuenta767@gmail.com';
          if (isSuper) {
            setPermissions({
              permisoUsuarios: true,
              permisoCuadernillos: true,
              permisoRecursos: true,
              permisoMetricas: true,
            });
          } else {
            setPermissions({
              permisoUsuarios: parsed.permisoUsuarios ?? true,
              permisoCuadernillos: parsed.permisoCuadernillos ?? true,
              permisoRecursos: parsed.permisoRecursos ?? true,
              permisoMetricas: parsed.permisoMetricas ?? true,
            });
          }
          return;
        }
      } catch {}
    }
    setIsAuthenticated(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth_session');
    sessionStorage.removeItem('admin_auth_session');
    window.dispatchEvent(new Event('admin_session_change'));
    window.location.href = '/';
  };

  const tabParam = searchParams.get('tab') as AdminTab;
  const activeTab: AdminTab = ['inicio', 'usuarios', 'cuadernillos', 'recursos'].includes(tabParam)
    ? tabParam
    : 'inicio';

  const handleTabChange = (tab: AdminTab) => {
    router.push(`/admin?tab=${tab}`);
  };

  const hasAccessToTab =
    activeTab === 'inicio' ||
    (activeTab === 'usuarios' && permissions.permisoUsuarios) ||
    (activeTab === 'cuadernillos' && permissions.permisoCuadernillos) ||
    (activeTab === 'recursos' && permissions.permisoRecursos);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
        Verificando credenciales de seguridad...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden relative">
      {!isAuthenticated && <AdminLoginForm onSuccess={() => setIsAuthenticated(true)} />}

      <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />

      <main className="flex-1 p-3 sm:p-6 lg:p-10 overflow-y-auto w-full min-h-[calc(100vh-53px)] lg:h-screen">
        {!hasAccessToTab ? (
          <div className="p-8 max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 font-black text-2xl flex items-center justify-center mx-auto">
              🔒
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Acceso Restringido por Módulo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tu perfil de Administrador no cuenta con permisos activos para acceder al módulo <strong className="uppercase text-slate-800 dark:text-slate-200">{activeTab}</strong>.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Las casillas de verificación de funciones deben ser habilitadas manualmente por el Superadministrador (Juan Avend).
            </p>
            <button
              onClick={() => handleTabChange('inicio')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider"
            >
              ← Regresar al Inicio
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && <InicioView onNavigateTab={handleTabChange} />}
            {activeTab === 'usuarios' && <UsuariosView />}
            {activeTab === 'cuadernillos' && <BancoCuadernillosView />}
            {activeTab === 'recursos' && <RecursosAdminView />}
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-bold">Cargando consola...</div>}>
      <AdminContent />
    </Suspense>
  );
}
