// src/components/admin/views/RecursosAdminView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  getRecursosAction,
  createRecursoAction,
  updateRecursoAction,
  deleteRecursoAction,
  getRecursoSignedUrlAction,
} from '@/services/recursosService';
import { CategoriaRecurso, Recurso } from '@/types/recurso';

interface RecursoCardItem {
  id: string;
  number: number;
  title: string;
  description: string;
  category: CategoriaRecurso;
  estado: 'PUBLICADO' | 'OCULTO';
  bgHeader: string;
  urlPdf?: string;
  urlImagen?: string;
  hasImageError?: boolean;
  pdfStatus?: 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  imgStatus?: 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
}

const PASTEL_BG = ['bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-cyan-400', 'bg-rose-400'];

export const RecursosAdminView: React.FC = () => {
  const [recursosList, setRecursosList] = useState<RecursoCardItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string | null }>({
    isOpen: false,
    id: null,
    title: null,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Carga Inicial Local desde PostgreSQL
  useEffect(() => {
    async function loadRecursos() {
      const res = await getRecursosAction();
      if (res.success && res.data.length > 0) {
        const mapped: RecursoCardItem[] = res.data.map((item: Recurso, idx: number) => ({
          id: item.id,
          number: item.numero || idx + 1,
          title: item.titulo,
          description: item.descripcion || 'Ficha de resumen pedagógico y nemotecnias para evaluaciones docentes.',
          category: item.categoria,
          estado: item.status || 'PUBLICADO',
          bgHeader: PASTEL_BG[idx % PASTEL_BG.length],
          urlPdf: item.urlPdf || undefined,
          urlImagen: item.urlImagen || undefined,
          hasImageError: false,
          pdfStatus: item.urlPdf ? ('SUCCESS' as const) : ('IDLE' as const),
          imgStatus: item.urlImagen ? ('SUCCESS' as const) : ('IDLE' as const),
        }));
        setRecursosList(mapped);
      }
    }
    loadRecursos();
  }, []);

  const handleImageError = (id: string) => {
    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hasImageError: true } : r))
    );
  };

  // 2. Agregar nuevo recurso
  const handleAgregarRecurso = async () => {
    setIsSubmitting(true);
    const nextNumber = recursosList.length + 1;
    const bgHeader = PASTEL_BG[(nextNumber - 1) % PASTEL_BG.length];
    const defaultTitle = `Nuevo Recurso Nemotécnico ${nextNumber}`;
    const defaultDesc = `Escribe aquí la descripción o resumen del contenido del recurso descargable ${nextNumber}.`;

    const res = await createRecursoAction({
      titulo: defaultTitle,
      descripcion: defaultDesc,
      number: nextNumber,
      categoria: 'CASUISTICA_PEDAGOGICA',
      colorHeader: bgHeader.replace('bg-', '').replace('-400', ''),
    });

    setIsSubmitting(false);

    if (res.success) {
      const nuevoItem: RecursoCardItem = {
        id: res.data.id,
        number: res.data.numero || nextNumber,
        title: res.data.titulo,
        description: res.data.descripcion || defaultDesc,
        category: res.data.categoria,
        estado: 'PUBLICADO',
        bgHeader,
        pdfStatus: 'IDLE',
        imgStatus: 'IDLE',
        hasImageError: false,
      };
      setRecursosList([...recursosList, nuevoItem]);
      showToast('✨ Recurso creado en PostgreSQL local.');
    } else {
      showToast(`❌ ${res.error.message}`);
    }
  };

  // 3. Editar Título
  const handleTitleChange = (id: string, newTitle: string) => {
    setRecursosList((prev) => prev.map((r) => (r.id === id ? { ...r, title: newTitle } : r)));
  };

  const handleTitleBlur = async (id: string, title: string) => {
    if (!title.trim()) return;
    await updateRecursoAction(id, { titulo: title.trim() });
  };

  // 4. Editar Descripción (Nuevo Campo Solicitado)
  const handleDescriptionChange = (id: string, newDesc: string) => {
    setRecursosList((prev) => prev.map((r) => (r.id === id ? { ...r, description: newDesc } : r)));
  };

  const handleDescriptionBlur = async (id: string, description: string) => {
    await updateRecursoAction(id, { descripcion: description.trim() });
  };

  // 5. Subir Imagen Local
  const handleSubirImagen = (id: string, file: File) => {
    const reader = new FileReader();

    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, imgStatus: 'UPLOADING' } : r))
    );

    reader.onload = async (e) => {
      const base64String = e.target?.result as string;

      setRecursosList((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                urlImagen: base64String,
                hasImageError: false,
                imgStatus: 'SUCCESS',
              }
            : r
        )
      );

      const updateRes = await updateRecursoAction(id, { urlImagen: base64String });
      if (updateRes.success) {
        showToast('✔ Imagen guardada en PostgreSQL local.');
      } else {
        showToast(`❌ Error al guardar en base de datos.`);
      }
    };

    reader.readAsDataURL(file);
  };

  // 6. Subir PDF Local
  const handleSubirPdf = (id: string, file: File) => {
    const reader = new FileReader();

    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, pdfStatus: 'UPLOADING' } : r))
    );

    reader.onload = async (e) => {
      const base64String = e.target?.result as string;

      setRecursosList((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, urlPdf: base64String, pdfStatus: 'SUCCESS' }
            : r
        )
      );

      await updateRecursoAction(id, { urlPdf: base64String });
      showToast('✔ PDF guardado en PostgreSQL local.');
    };

    reader.readAsDataURL(file);
  };

  // 7. Conmutar Visibilidad
  const handleToggleOcultar = async (id: string, estadoActual: 'PUBLICADO' | 'OCULTO') => {
    const nuevoEstado = estadoActual === 'PUBLICADO' ? 'OCULTO' : 'PUBLICADO';
    setRecursosList((prev) => prev.map((r) => (r.id === id ? { ...r, estado: nuevoEstado } : r)));
    await updateRecursoAction(id, { estado: nuevoEstado });
  };

  // 8. Previsualizar PDF Local
  const handlePrevisualizar = async (rec: RecursoCardItem) => {
    if (!rec.urlPdf && rec.pdfStatus !== 'SUCCESS') {
      showToast('⚠️ Sube un archivo PDF antes de previsualizar');
      return;
    }

    const res = await getRecursoSignedUrlAction(rec.urlPdf || rec.id);
    if (res.success && res.data.signedUrl) {
      window.open(res.data.signedUrl, '_blank');
    } else {
      showToast('⚠️ Sube un archivo PDF antes de previsualizar');
    }
  };

  // 9. Eliminar recurso
  const confirmDeleteRecurso = async () => {
    if (!deleteModal.id) return;
    const targetId = deleteModal.id;
    setDeleteModal({ isOpen: false, id: null, title: null });
    setRecursosList((prev) => prev.filter((r) => r.id !== targetId));
    await deleteRecursoAction(targetId);
    showToast('🗑️ Recurso eliminado de PostgreSQL local.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* Cabecera del Módulo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            GESTIÓN DE CONTENIDOS
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recursos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sube nemotecnias y trucos descargables en PDF.
          </p>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleAgregarRecurso}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-2.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          {isSubmitting ? 'Cargando...' : '+ AGREGAR RECURSO'}
        </button>
      </div>

      {/* Banner Informativo */}
      <div className="bg-purple-50/60 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl p-4 text-xs flex items-center space-x-2">
        <span className="font-bold text-indigo-600">i</span>
        <span>
          La imagen es opcional. Si no subes una, se mostrará una miniatura automática con el formato AVEND ESCALA.
        </span>
      </div>

      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in flex items-center space-x-3">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Grilla de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recursosList.map((rec) => (
          <div
            key={rec.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-xs space-y-4 ${
              rec.estado === 'OCULTO' ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {/* Renderizado Condicional de Cabecera con Fallback Seguro */}
            {rec.urlImagen && !rec.hasImageError ? (
              <div className="h-40 w-full overflow-hidden rounded-xl relative bg-slate-100 group">
                <img
                  src={rec.urlImagen}
                  alt={rec.title}
                  onError={() => handleImageError(rec.id)}
                  className="w-full h-full object-cover rounded-xl"
                />
                <span className="absolute top-3 left-4 text-[10px] font-black uppercase text-white bg-slate-900/60 backdrop-blur-xs px-2.5 py-1 rounded-full tracking-wider">
                  RECURSO {String(rec.number).padStart(2, '0')}
                </span>
                <label className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 font-bold text-[10px] px-2.5 py-1 rounded-full cursor-pointer shadow-xs transition-all opacity-90 group-hover:opacity-100">
                  <span>Cambiar imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSubirImagen(rec.id, f);
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className={`h-40 rounded-xl relative p-4 flex items-center justify-center ${rec.bgHeader}`}>
                <span className="absolute top-3 left-4 text-[10px] font-black uppercase text-white/90 tracking-wider">
                  RECURSO {String(rec.number).padStart(2, '0')}
                </span>

                <div className="bg-white/30 backdrop-blur-xs p-3.5 rounded-2xl text-white shadow-xs">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>

                <span className="absolute bottom-3 right-4 text-[10px] font-black tracking-wider text-white/90">
                  AVEND ESCALA
                </span>
              </div>
            )}

            {/* Campo Título */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
              <input
                type="text"
                value={rec.title}
                onChange={(e) => handleTitleChange(rec.id, e.target.value)}
                onBlur={(e) => handleTitleBlur(rec.id, e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Campo Descripción (Ubicación Exacta: Debajo de Título y antes de Subir Imagen/PDF) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
              <textarea
                rows={2}
                value={rec.description}
                onChange={(e) => handleDescriptionChange(rec.id, e.target.value)}
                onBlur={(e) => handleDescriptionBlur(rec.id, e.target.value)}
                placeholder="Escribe un resumen o explicación sobre este recurso PDF..."
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-gray-800 dark:text-white outline-none focus:border-indigo-500 resize-none transition-colors"
              />
            </div>

            {/* Botones Medios: SUBIR IMAGEN y SUBIR PDF */}
            <div className="flex space-x-2">
              <label className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl py-2.5 px-3 w-1/2 text-center cursor-pointer transition-colors flex items-center justify-center">
                <span>
                  {rec.imgStatus === 'UPLOADING'
                    ? 'Subiendo...'
                    : rec.imgStatus === 'SUCCESS' || (rec.urlImagen && !rec.hasImageError)
                    ? '✓ IMAGEN'
                    : 'SUBIR IMAGEN'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSubirImagen(rec.id, f);
                  }}
                />
              </label>

              <label className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl py-2.5 px-3 w-1/2 text-center cursor-pointer transition-colors flex items-center justify-center">
                <span>
                  {rec.pdfStatus === 'UPLOADING'
                    ? 'Subiendo...'
                    : rec.pdfStatus === 'SUCCESS' || rec.urlPdf
                    ? '✓ PDF'
                    : 'SUBIR PDF'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSubirPdf(rec.id, f);
                  }}
                />
              </label>
            </div>

            {/* Botones Inferiores Adaptados para Todos los Tamaños (320px - 4K) */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleToggleOcultar(rec.id, rec.estado)}
                className={`font-bold text-[10px] sm:text-xs rounded-xl py-2 px-1 text-center transition-colors truncate ${
                  rec.estado === 'PUBLICADO'
                    ? 'bg-purple-50 text-indigo-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {rec.estado === 'PUBLICADO' ? 'OCULTAR' : 'MOSTRAR'}
              </button>

              <button
                type="button"
                onClick={() => handlePrevisualizar(rec)}
                className="bg-purple-50 text-indigo-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[10px] sm:text-xs rounded-xl py-2 px-1 text-center hover:bg-purple-100 transition-colors truncate"
              >
                PREVISUALIZAR
              </button>

              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: true, id: rec.id, title: rec.title })}
                className="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px] sm:text-xs rounded-xl py-2 px-1 text-center hover:bg-rose-100 transition-colors truncate"
              >
                ELIMINAR
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Confirmación Eliminación React */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-gray-100 dark:border-slate-800 shadow-lg">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">¿Deseas eliminar este recurso?</h3>
            <p className="text-xs text-slate-500">Se eliminará "{deleteModal.title}". Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null, title: null })}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecurso}
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
