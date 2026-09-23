# 🧪 Suite Integral de Pruebas Automatizadas con IA — AVEND ESCALA (TestSprite)

Cobertura integral del 100% de los módulos, rutas, vistas y componentes de la plataforma **AVEND ESCALA**, organizada meticulosamente carpeta por carpeta.

---

## 📂 Estructura Exhaustiva Carpeta por Carpeta (`tests/testsprite/`)

```text
tests/testsprite/
├── 01-home-landing/ (Página de Inicio y Navegación)
│   ├── 01_landing_hero_navegacion.json         # Carga de Hero, lista de beneficios y redirección a /cuadernillos
│   └── 02_navbar_responsive_tema.json          # Logotipo oficial, enlaces y adaptabilidad móvil
│
├── 02-auth-flujos/ (Autenticación y Seguridad Docente)
│   ├── 01_solicitar_codigo_otp.json            # Envío de código de 4 dígitos por correo sin contraseñas
│   ├── 02_validacion_correo_no_registrado.json # Alerta y enlace a WhatsApp si el correo no existe
│   └── 03_cierre_sesion_persistencia.json      # Persistencia de sesión en recarga y cierre seguro
│
├── 03-cuadernillos-filtros/ (Filtros Avanzados y Búsqueda en Cascada)
│   ├── 01_selector_procesos_nombramiento_ascenso.json # Alternar procesos Nombramiento vs Ascenso
│   ├── 02_filtros_cascada_modalidad_nivel_area.json   # Selección EBR, EBA (Ciencias Sociales), EBE
│   ├── 03_filtro_anios_dinamico.json                  # Años calculados dinámicamente según BD
│   └── 04_buscador_texto_y_paginacion.json            # Búsqueda por texto en tiempo real y paginación
│
├── 04-cuadernillos-visor-recursos/ (Visor de PDF y Recursos)
│   ├── 01_visor_pdf_cuadernillos_claves.json          # Apertura del visor seguro de documentos
│   ├── 02_boton_resolucion_condicional.json           # Ocultamiento dinámico si no hay resolución
│   └── 03_reporte_recurso_faltante.json               # Modal de solicitud de material pendiente
│
├── 05-experiencia-docente/ (Vigencias y Notificaciones)
│   ├── 01_nota_aclaratoria_footer.json         # Nota oficial en footer con visualización única
│   ├── 02_contador_regresivo_24h.json          # Barra fija superior con reloj digital en vivo
│   └── 03_modal_expiracion_whatsapp.json       # Expulsión y modal bloqueante con enlace a WhatsApp
│
├── 06-recursos-educativos/ (Sección de Recursos Pedagógicos)
│   ├── 01_catalogo_recursos_pedagogicos.json   # Vista /recursos con guías y solucionarios
│   └── 02_busqueda_y_tarjetas_recursos.json    # Filtrado por etiquetas y categorías
│
├── 07-admin-evaluaciones/ (Gestión de Cuadernillos)
│   ├── 01_login_panel_admin.json               # Autenticación segura de administradores
│   ├── 02_crear_y_publicar_evaluacion.json     # Formulario de subida de PDF y estado
│   └── 03_editar_evaluacion_y_recursos.json    # Edición de metadatos y reemplazo de archivos
│
├── 08-admin-banco-cuadernillos/ (Inventario)
│   ├── 01_banco_cuadernillos_inventario.json   # Vista de inventario global de exámenes
│   └── 02_filtros_administrativos_estado.json  # Segmentación Borradores vs Publicados
│
├── 09-admin-usuarios/ (Gestión Docente)
│   ├── 01_gestion_usuarios_tabla.json          # Tabla con buscador y filtros de vencimiento
│   ├── 02_crear_usuario_individual.json        # Alta manual con cálculo automático de 1 año / 24h
│   └── 03_pausa_y_extension_licencia.json      # Pausar, reactivar y extender suscripciones
│
├── 10-admin-import-export/ (Procesamiento Excel)
│   ├── 01_modal_importacion_excel.json         # Drag and drop, auto-mapeo y plantilla
│   └── 02_exportar_reporte_excel.json          # Generación y descarga de archivo .xlsx
│
├── 11-admin-equipo-seguridad/ (Equipo y Roles)
│   ├── 01_gestion_administradores.json         # Alta y edición del equipo administrativo
│   └── 02_permisos_granulares_roles.json       # Permisos específicos por módulo
│
└── 12-admin-metricas-sistema/ (Métricas y Reportes)
    ├── 01_dashboard_metricas_tiempo_real.json  # Estadísticas generales y usuarios activos
    └── 02_resumen_estadisticas_descargas.json  # Distribución de demanda por modalidad
```

---

## ⚡ Comandos para Ejecutar las Pruebas

* **Listar todas las pruebas del proyecto:**
  ```bash
  testsprite test list --project c83c6336-38d5-42ed-a742-0c24077b6964
  ```

* **Ejecutar una prueba individual:**
  ```bash
  testsprite test run <test_id> --wait
  ```

* **Ejecutar la suite completa:**
  ```bash
  testsprite test run --all --project c83c6336-38d5-42ed-a742-0c24077b6964
  ```
