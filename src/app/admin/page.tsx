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

  useEffect(() => {
    const sessionStr = localStorage.getItem('admin_auth_session') || sessionStorage.getItem('admin_auth_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed.token && parsed.token.includes('admin_session_')) {
          setIsAuthenticated(true);
          return;
        }
      } catch {}
    }
    setIsAuthenticated(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth_session');
    sessionStorage.removeItem('admin_auth_session');
    setIsAuthenticated(false);
  };

  const tabParam = searchParams.get('tab') as AdminTab;
  const activeTab: AdminTab = ['inicio', 'usuarios', 'cuadernillos', 'recursos'].includes(tabParam)
    ? tabParam
    : 'inicio';

  const handleTabChange = (tab: AdminTab) => {
    router.push(`/admin?tab=${tab}`);
  };

  if (isAuthenticated === null) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
        Verificando credenciales de seguridad...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />

      <main className="flex-1 p-6 sm:p-10 overflow-y-auto h-screen">
        {activeTab === 'inicio' && <InicioView onNavigateTab={handleTabChange} />}
        {activeTab === 'usuarios' && <UsuariosView />}
        {activeTab === 'cuadernillos' && <BancoCuadernillosView />}
        {activeTab === 'recursos' && <RecursosAdminView />}
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
