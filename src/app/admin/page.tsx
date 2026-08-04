// src/app/admin/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { InicioView } from '@/components/admin/views/InicioView';
import { UsuariosView } from '@/components/admin/views/UsuariosView';
import { BancoCuadernillosView } from '@/components/admin/views/BancoCuadernillosView';
import { RecursosAdminView } from '@/components/admin/views/RecursosAdminView';

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab') as AdminTab;
  const activeTab: AdminTab = ['inicio', 'usuarios', 'cuadernillos', 'recursos'].includes(tabParam)
    ? tabParam
    : 'inicio';

  const handleTabChange = (tab: AdminTab) => {
    router.push(`/admin?tab=${tab}`);
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

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
