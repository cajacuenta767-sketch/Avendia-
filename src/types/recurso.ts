// src/types/recurso.ts
// AVEND ESCALA - Tipos de dominio para Recursos Didácticos y Fichas Pedagógicas

export type CategoriaRecurso = 
  | 'CURRICULO_NACIONAL'
  | 'CASUISTICA_PEDAGOGICA'
  | 'TEORIAS_APRENDIZAJE'
  | 'PLANIFICACION_CURRICULAR'
  | 'GESTION_ESCOLAR';

export type ColorTheme = 'purple' | 'emerald' | 'amber' | 'blue' | 'indigo' | 'rose';

export interface Recurso {
  id: string;
  numero: number;                // ej. 1, 2, 3...
  titulo: string;                // ej. "Principios de la Educación Peruana"
  descripcion: string;           // Resumen corto del contenido pedagógico
  categoria: CategoriaRecurso;
  categoriaLabel: string;        // Nombre legible ej. "Currículo Nacional"
  colorTheme: ColorTheme;        // Tema de color visual para la tarjeta
  paginas: number;
  formato: 'PDF' | 'INFOGRAFIA';
  urlPdf: string;                // Clave de R2 o URL del PDF
  urlImagen?: string;            // Ruta de la imagen de portada
  isPopular?: boolean;
  status?: 'PUBLICADO' | 'OCULTO';
  tags: string[];
}

export interface RecursoFilterParams {
  categoria?: CategoriaRecurso | 'TODOS';
  searchQuery?: string;
}
