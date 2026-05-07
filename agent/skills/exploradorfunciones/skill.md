---
description: Habilidad que abarca todas las funciones de navegación, selección, gestión de archivos y UI del explorador.
---

# Funciones del Explorador y Navegación

Esta habilidad consolida las capacidades centrales del explorador de archivos, incluyendo la selección avanzada, el sistema de portapapeles, la gestión automatizada de carpetas y los elementos visuales de la interfaz.

## 1. Sistema de Selección
El explorador permite múltiples métodos de interacción para gestionar archivos:
- **Selección Individual y Múltiple**: 
  - Clic para seleccionar un solo elemento.
  - `Ctrl + Clic` para añadir/quitar elementos individuales a la selección.
  - `Shift + Clic` para seleccionar un rango de archivos entre el primero y el último cliqueado.
- **Selección Marquee (Lasso)**: 
  - Arrastrar el ratón sobre el fondo del visor de archivos crea un rectángulo de selección azul traslúcido.
  - Los archivos tocados por el rectángulo se seleccionan automáticamente en tiempo real.
- **Vista Profunda (Recursive View)**: 
  - Interruptor en la barra superior que permite ver todos los archivos de las subcarpetas de forma aplanada en la vista actual.

## 2. Portapapeles y Operaciones de Archivo
Sistema robusto de gestión de archivos con soporte para deshacer:
- **Acciones**: Cortar (`Ctrl + X`), Copiar (`Ctrl + C`) y Pegar (`Ctrl + V`).
- **Deshacer (`Ctrl + Z`)**: Permite revertir la última operación de pegado (borrando copias o devolviendo archivos movidos a su origen).
- **Indicadores Visuales**: Los archivos "cortados" aparecen con opacidad reducida hasta que se completa la operación.
- **Toasts de Notificación**: Confirmaciones visuales en la parte inferior para cada acción exitosa o error.

## 3. Gestión Avanzada de Carpetas
Funcionalidades integradas para mantener el orden en el sistema:
- **Organización Automática**:
  - **Por Tipo**: Clasifica archivos en subcarpetas basadas en su categoría (Imágenes, Videos, etc.).
  - **Por Nombre**: Agrupa archivos basándose en la primera palabra de su nombre.
- **Aplanar Carpeta (Flatten)**: Extrae todos los archivos de subcarpetas hacia la raíz de la carpeta actual y elimina las subcarpetas vacías.
- **Limpieza**: Opción para eliminar automáticamente todas las carpetas vacías dentro de un directorio.
- **Búsqueda de Duplicados y Similares**: 
  - Identifica archivos idénticos (por hash MD5) o imágenes visualmente similares (`phash`).
  - Permite comparar archivos lado a lado antes de eliminarlos.

## 4. Interfaz de Usuario y Navegación
Elementos premium para una experiencia de usuario fluida:
- **Barra Superior**:
  - **Drives**: Acceso rápido a todas las unidades lógicas del sistema.
  - **Breadcrumbs**: Navegación jerárquica mediante clics en la ruta actual.
  - **Estadísticas**: Visualización en tiempo real del tamaño total, conteo de archivos y carpetas.
  - **Gráfica de Analíticas**: Gráfico dinámico (Chart.js) que muestra la distribución de tipos de archivos.
- **Colores por Tipo de Archivo**: Sistema de colores consistente basado en `CATEGORY_COLORS` (ej. PSD en azul, Videos en dorado, Imágenes en rosa).
- **Panel de Vista Previa**: Muestra metadatos detallados y permite "Abrir Original" en la aplicación predeterminada del sistema.
- **Favoritos y Favoritos Temporales**: 
  - Acceso persistente a carpetas críticas.
  - Sección temporal para carpetas de trabajo rápido durante la sesión.

## 5. Interacción de Arrastre (Drag & Drop)
- **Mover Archivos**: Arrastrar elementos sobre carpetas dentro de la cuadrícula o sobre el panel de favoritos para moverlos.
- **Retroalimentación Visual**: Las carpetas se resaltan cuando se detecta un elemento arrastrable sobre ellas.