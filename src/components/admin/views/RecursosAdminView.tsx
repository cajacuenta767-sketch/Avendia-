// src/components/admin/views/RecursosAdminView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  getRecursosAction,
  createRecursoAction,
  updateRecursoAction,
  deleteRecursoAction,
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

  // 1. Carga Inicial Local desde PostgreSQL (incluyendo borradores para el admin)
  useEffect(() => {
    async function loadRecursos() {
      const res = await getRecursosAction('', 'TODOS', true);
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

  // 2. Agregar nuevo recurso (inicialmente como BORRADOR)
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
      estado: 'OCULTO',
    });

    setIsSubmitting(false);

    if (res.success) {
      const nuevoItem: RecursoCardItem = {
        id: res.data.id,
        number: res.data.numero || nextNumber,
        title: res.data.titulo,
        description: res.data.descripcion || defaultDesc,
        category: res.data.categoria,
        estado: 'OCULTO',
        bgHeader,
        pdfStatus: 'IDLE',
        imgStatus: 'IDLE',
        hasImageError: false,
      };
      setRecursosList([...recursosList, nuevoItem]);
      showToast('✨ Nuevo recurso creado como Borrador.');
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

  // 4. Editar Descripción
  const handleDescriptionChange = (id: string, newDesc: string) => {
    setRecursosList((prev) => prev.map((r) => (r.id === id ? { ...r, description: newDesc } : r)));
  };

  const handleDescriptionBlur = async (id: string, description: string) => {
    await updateRecursoAction(id, { descripcion: description.trim() });
  };

  // 5. Subir Imagen Local
  const handleSubirImagen = async (id: string, file: File) => {
    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, imgStatus: 'UPLOADING' } : r))
    );

    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('type', 'image');
      formData.append('file', file);

      const res = await fetch('/api/recursos/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.data?.url) {
        setRecursosList((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  urlImagen: data.data.url,
                  hasImageError: false,
                  imgStatus: 'SUCCESS',
                }
              : r
          )
        );
        showToast('✔ Imagen subida y guardada exitosamente.');
      } else {
        throw new Error(data.error?.message || 'Error al subir imagen');
      }
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      setRecursosList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, imgStatus: 'IDLE' } : r))
      );
      showToast(`❌ Error al subir imagen: ${err.message || 'Intente nuevamente'}`);
    }
  };

  // 6. Subir PDF Local
  const handleSubirPdf = async (id: string, file: File) => {
    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, pdfStatus: 'UPLOADING' } : r))
    );

    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('type', 'pdf');
      formData.append('file', file);

      const res = await fetch('/api/recursos/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.data?.url) {
        setRecursosList((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, urlPdf: data.data.url, pdfStatus: 'SUCCESS' }
              : r
          )
        );
        showToast('✔ PDF subido y guardado exitosamente.');
      } else {
        throw new Error(data.error?.message || 'Error al subir PDF');
      }
    } catch (err: any) {
      console.error('Error subiendo PDF:', err);
      setRecursosList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, pdfStatus: 'IDLE' } : r))
      );
      showToast(`❌ Error al subir PDF: ${err.message || 'Intente nuevamente'}`);
    }
  };

  // 7. Guardar como Borrador (Oculto para Docentes)
  const handleGuardarBorrador = async (id: string) => {
    const target = recursosList.find((r) => r.id === id);
    if (!target) return;

    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: 'OCULTO' } : r))
    );

    await updateRecursoAction(id, {
      titulo: target.title,
      descripcion: target.description,
      estado: 'OCULTO',
    });

    showToast('📁 Guardado como borrador (no visible para docentes).');
  };

  // 8. Subir / Publicar en Vivo (Visible para Docentes)
  const handlePublicarRecurso = async (id: string) => {
    const target = recursosList.find((r) => r.id === id);
    if (!target) return;

    setRecursosList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: 'PUBLICADO' } : r))
    );

    await updateRecursoAction(id, {
      titulo: target.title,
      descripcion: target.description,
      estado: 'PUBLICADO',
    });

    if (!target.urlPdf) {
      showToast('🚀 ¡Recurso publicado! Recuerda subir el archivo PDF cuando esté listo.');
    } else {
      showToast('🚀 ¡Recurso subido y publicado en vivo para los docentes!');
    }
  };

  // 9. Previsualizar PDF Local
  const handlePrevisualizar = (rec: RecursoCardItem) => {
    if (!rec.urlPdf || rec.pdfStatus !== 'SUCCESS') {
      showToast('⚠️ Este recurso no tiene ningún archivo PDF subido todavía');
      return;
    }

    const streamUrl = `/api/pdf-stream?url=${encodeURIComponent(rec.urlPdf)}`;
    window.open(streamUrl, '_blank');
  };

  // 10. Eliminar recurso
  const confirmDeleteRecurso = async () => {
    if (!deleteModal.id) return;
    const targetId = deleteModal.id;
    setDeleteModal({ isOpen: false, id: null, title: null });
    setRecursosList((prev) => prev.filter((r) => r.id !== targetId));
    await deleteRecursoAction(targetId);
    showToast('🗑️ Recurso eliminado de PostgreSQL local.');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12 relative min-w-0">
      {/* Cabecera del Módulo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            GESTIÓN DE CONTENIDOS
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recursos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sube nemotecnias y trucos descargables en PDF.
          </p>
        </div>

        <button
          onClick={handleAgregarRecurso}
          disabled={isSubmitting}
          className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <span>+ AGREGAR RECURSO</span>
        </button>
      </div>

      {/* Banner Informativo */}
      <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4 flex items-start space-x-3">
        <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
        <p className="text-xs text-purple-900 dark:text-purple-300 font-medium">
          La imagen es opcional. Si no subes una, se mostrará una miniatura automática con el formato AVEND ESCALA.
        </p>
      </div>

      {/* Toast Alert Flotante */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="break-words">{toastMessage}</span>
        </div>
      )}

      {/* Cuadrícula de Tarjetas de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recursosList.map((rec) => (
          <div
            key={rec.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 space-y-4 shadow-sm transition-all duration-200 ${
              rec.estado === 'OCULTO'
                ? 'border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/10'
                : 'border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60'
            }`}
          >
            {/* Cabecera con Miniatura e Indicador de Estado */}
            {rec.urlImagen && !rec.hasImageError ? (
              <div className="h-40 w-full overflow-hidden rounded-xl relative bg-slate-100 group">
                <img
                  src={
                    rec.urlImagen.startsWith('data:') || rec.urlImagen.startsWith('http')
                      ? rec.urlImagen
                      : `/api/pdf-stream?url=${encodeURIComponent(rec.urlImagen)}`
                  }
                  alt={rec.title}
                  onError={() => handleImageError(rec.id)}
                  className="w-full h-full object-cover rounded-xl"
                />
                <span className="absolute top-3 left-4 text-[10px] font-black uppercase text-white bg-slate-900/60 backdrop-blur-xs px-2.5 py-1 rounded-full tracking-wider">
                  RECURSO {String(rec.number).padStart(2, '0')}
                </span>

                <span
                  className={`absolute top-3 right-3 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs ${
                    rec.estado === 'PUBLICADO'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {rec.estado === 'PUBLICADO' ? '🟢 EN VIVO' : '📝 BORRADOR'}
                </span>

                <label className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-800 font-bold text-[10px] px-2.5 py-1 rounded-full cursor-pointer shadow-xs transition-all opacity-90 group-hover:opacity-100">
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

                <span
                  className={`absolute top-3 right-3 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs ${
                    rec.estado === 'PUBLICADO'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {rec.estado === 'PUBLICADO' ? '🟢 EN VIVO' : '📝 BORRADOR'}
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

            {/* Campo Descripción */}
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

            {/* Botones de Carga de Archivos: SUBIR IMAGEN y SUBIR PDF */}
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

            {/* Fila Acciones Secundarias: Previsualizar y Eliminar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePrevisualizar(rec)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl py-2 px-3 text-center transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>👁️</span>
                <span>Previsualizar</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: true, id: rec.id, title: rec.title })}
                className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-xl py-2 px-3 text-center transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>🗑️</span>
                <span>Eliminar</span>
              </button>
            </div>

            {/* Fila Acciones Principales: BORRADOR y SUBIR */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleGuardarBorrador(rec.id)}
                className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  rec.estado === 'OCULTO'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📝</span>
                <span>{rec.estado === 'OCULTO' ? 'EN BORRADOR' : 'BORRADOR'}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePublicarRecurso(rec.id)}
                className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md ${
                  rec.estado === 'PUBLICADO'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-indigo-600/30 active:scale-98'
                }`}
              >
                <span>🚀</span>
                <span>{rec.estado === 'PUBLICADO' ? 'SUBIDO (EN VIVO)' : 'SUBIR'}</span>
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
            <p className="text-xs text-slate-500">Se eliminará "${deleteModal.title}". Esta acción es irreversible.</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null, title: null })}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecurso}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
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
