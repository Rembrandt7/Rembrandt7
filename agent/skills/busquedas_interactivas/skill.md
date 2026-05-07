---
description: Habilidad de búsquedas interactivas y filtrado avanzado para el explorador de archivos.
---

# Búsqueda Interactiva y Filtrado Avanzado

Esta habilidad permite realizar búsquedas profundas y filtrados granulares en el sistema de archivos, optimizados para grandes volúmenes de datos.

## 1. Interfaz de Usuario (UI)

Los elementos principales en `index.html` incluyen:
- `global-search`: Input de texto para la búsqueda por nombre.
- `trigger-search-btn`: Botón principal para activar/desactivar el modo búsqueda.
- `advanced-search-filters`: Contenedor de filtros avanzados (fechas, tamaños, resoluciones, duración).
- `search-category-filters`: Contenedor dinámico para checkboxes de categorías.
- `Dual-Range Sliders`: Controles deslizantes para rangos de:
  - Tamaño (MB)
  - Resolución (Ancho/Alto px)
  - Duración (Videos)

## 2. Funcionalidad del Cliente (`app.js`)

### Gestión de Filtros
- **`initSearchFilters()`**: Genera dinámicamente los checkboxes de categorías basados en `CATEGORY_COLORS`. Permite selección individual o "solo" (Shift+Click).
- **`syncDurationFilterVisibility()`**: Muestra u oculta el filtro de duración basado en si la categoría 'VIDEOS' está activa y si hay datos disponibles.

### Búsqueda y Límites Dinámicos
- **`fetchSearchBounds(path)`**: Llama a `/api/search-bounds` para obtener los valores mínimos y máximos reales de los archivos en la carpeta actual (y subcarpetas). Esto ajusta los sliders automáticamente al contenido.
- **`setupDualRange()`**: Inicializa los sliders dobles, sincronizando los valores visibles con los inputs ocultos y disparando la búsqueda al soltar el control.
- **`performGlobalSearch(path, query)`**: Construye la URL de búsqueda con todos los parámetros activos:
  - `q`: Consulta de texto.
  - `exact`: Match exacto.
  - `cats`: Categorías permitidas.
  - `dateFrom` / `dateTo`: Rango de fechas.
  - `resMin` / `resMax` (W/H): Rangos de resolución.
  - `sizeMin` / `sizeMax`: Rango de tamaño en MB.
  - `durationMin` / `durationMax`: Rango de duración de video.

### Comportamiento Interactivo
- **Live Search**: Búsqueda automática mientras se escribe (debounce de 400ms).
- **Enter Key**: Activa la búsqueda o refresca los resultados.
- **AbortController**: Cancela búsquedas en curso si se inicia una nueva para ahorrar recursos.

## 3. Implementación del Servidor (`server.js`)

### Endpoints de Búsqueda
- **`GET /api/search`**:
  - Implementa un escaneo recursivo (`searchDeep`) con límite de profundidad (30) para evitar desbordamientos.
  - Usa `await new Promise(resolve => setTimeout(resolve, 1))` cada 150 archivos para no bloquear el bucle de eventos de Node.js.
  - Aplica filtros en cascada: Nombre -> Categoría -> Fecha -> Resolución -> Tamaño -> Duración.
- **`GET /api/search-bounds`**:
  - Escaneo rápido recursivo para encontrar los límites globales de los filtros.
  - Extrae metadatos usando `sharp` (imágenes) y `ffprobe` (videos).

## 4. Categorización de Archivos
El sistema clasifica los archivos en las siguientes categorías:
- `PHOTOSHOP`, `IMÁGENES`, `VIDEOS`, `PDF`, `DOCUMENTOS`, `DATOS`, `CADs`, `PROGRAMAS`, `ZIP`, `TXT`, `CARPETAS`, `OTROS`.

## 5. Atajos de Teclado
- `Enter` en el buscador: Ejecuta búsqueda inmediata.
- `Esc` (implícito al cerrar panel): Detiene la búsqueda y libera el controlador.