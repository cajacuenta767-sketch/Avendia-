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

import { AdminHeader } from '@/components/admin/AdminHeader';

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRegistrador, setIsRegistrador] = useState(false);
  const [sessionRole, setSessionRole] = useState('');

  const [permissions, setPermissions] = useState({
    permisoUsuarios: true,
    permisoCuadernillos: true,
    permisoRecursos: true,
    permisoMetricas: true,
  });

  useEffect(() => {
    let active = true;

    const verifySecureSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
        const data = await response.json() as {
          authenticated?: boolean;
          isAdmin?: boolean;
          isRegistrador?: boolean;
          role?: string;
          permissions?: Record<string, boolean>;
        };

        if (!active) return;

        // El REGISTRADOR solo accede al módulo de docentes (alcance limitado en el servidor).
        if (data.authenticated && data.isRegistrador) {
          setIsRegistrador(true);
          setSessionRole(data.role || 'REGISTRADOR');
          setPermissions({
            permisoUsuarios: true,
            permisoCuadernillos: false,
            permisoRecursos: false,
            permisoMetricas: false,
          });
          setIsAuthenticated(true);
          return;
        }

        if (data.authenticated && data.isAdmin) {
          const isSuperAdmin = data.role === 'SUPERADMINISTRADOR';
          setSessionRole(data.role || 'ADMINISTRADOR');
          setPermissions({
            permisoUsuarios: isSuperAdmin || data.permissions?.usuarios !== false,
            permisoCuadernillos: isSuperAdmin || data.permissions?.cuadernillos !== false,
            permisoRecursos: isSuperAdmin || data.permissions?.recursos !== false,
            permisoMetricas: isSuperAdmin || data.permissions?.metricas !== false,
          });
          setIsAuthenticated(true);
          return;
        }
      } catch {
        // La pantalla de acceso se muestra abajo sin exponer detalles internos.
      }

      if (active) setIsAuthenticated(false);
    };

    void verifySecureSession();
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('admin_auth_session');
    sessionStorage.removeItem('admin_auth_session');
    document.cookie = 'admin_auth_session=; path=/; max-age=0; SameSite=Lax';
    window.dispatchEvent(new Event('admin_session_change'));
    window.location.href = '/';
  };

  const tabParam = searchParams.get('tab') as AdminTab;
  const activeTab: AdminTab = !isRegistrador && ['inicio', 'usuarios', 'cuadernillos', 'recursos'].includes(tabParam)
    ? tabParam
    : 'usuarios';

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

  if (!isAuthenticated) {
    return <AdminLoginForm onSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden relative">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        isRegistrador={isRegistrador}
        role={sessionRole}
        permissions={permissions}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:h-screen overflow-hidden">
        <AdminHeader />

        <main className="flex-1 min-h-0 p-3 sm:p-5 lg:p-8 xl:p-10 overflow-y-auto w-full">
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
                Las casillas de verificación de funciones deben ser habilitadas manualmente por el Superadministrador (Bryan).
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
              {activeTab === 'usuarios' && <UsuariosView isRegistrador={isRegistrador} sessionRole={sessionRole} />}
              {activeTab === 'cuadernillos' && <BancoCuadernillosView />}
              {activeTab === 'recursos' && <RecursosAdminView />}
            </>
          )}
        </main>
      </div>
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
