---
name: editor_de_imagenes
description: Consolidación de todas las habilidades de edición de imágenes en el Explorador Remb, incluyendo rotación, redimensionamiento, compresión, recorte y renombrado inteligente.
---

# Editor de Imágenes (Explorador Remb)

Esta habilidad permite manipular imágenes directamente desde el explorador, ya sea de forma individual o por lotes, utilizando herramientas integradas en la vista previa y modales dedicados.

## Capacidades de Edición

### 1. Rotación de Imágenes
- **Rotación Persistente (90°):** Disponible en el visor de imágenes (`#img-viewer-overlay`) y en las tarjetas de archivos (grid).
  - **Atajo de teclado:** Presiona la tecla **'r'** en el visor para rotar 90° a la derecha de forma persistente (sobrescribe el archivo).
  - **Botón de previsualización:** Botón 🔄 en el visor o el icono ↻ en las tarjetas de archivos.
- **Rotación Libre:** Disponible dentro del modal de recorte (`#crop-overlay`). Permite rotar por grados específicos antes de guardar.

### 2. Redimensionamiento y Compresión (PowerToys Style)
- **Acceso:** Clic derecho en una o varias imágenes → **📐 Comprimir/Redimensionar**.
- **Funcionalidades:**
  - **Presets:** Tamaños predefinidos (4000px, 3000px, 1080px, etc.).
  - **Calidad:** Ajuste de nivel de compresión (10-100%).
  - **Formatos:** Conversión a JPEG, PNG o WebP.
  - **Salida:** Opción de sobrescribir original o guardar como copia con un **sufijo** personalizable (ej. `_comp`).
  - **Ajuste:** Opción "Inside" (siempre mantiene proporción, nunca deforma).

### 3. Recorte Interactivo (Crop)
- **Acceso:** Clic derecho → **🖼️ Editar/Recortar** o botón "Recortar" en el visor de imágenes.
- **Herramientas:**
  - **Lienzo interactivo:** Arrastra los bordes para seleccionar el área.
  - **Info de resolución:** Muestra el tamaño resultante en tiempo real.
  - **Guardado:** Permite sobrescribir el original o definir un nuevo nombre.

### 4. Renombrado Inteligente (Tokens)
- **Acceso:** Clic derecho → **✏️ Renombrar** (sobresale el sistema de tokens).
- **Tokens Dinámicos:**
  - `{carpeta}`: Nombre de la carpeta contenedora.
  - `{fecha}` / `{hora}`: Metadatos de creación/modificación.
  - `{contador}`: Secuencia numérica para renombrado masivo (ej. `01`, `02`).
  - `{resolucion}` / `{peso}`: Atributos técnicos automáticos.
- **Visor:** Incluye un panel lateral de renombrado rápido con previsualización en tiempo real.

## Atajos de Teclado y Experiencia de Usuario (UX)
- **En el Visor de Imágenes:**
  - `r`: Rotar 90° a la derecha.
  - `F2`: Abrir panel de renombrado.
  - `Esc`: Cerrar visor.
  - `Flechas Izq/Der`: Navegar entre imágenes.
  - `+/-`: Zoom.
- **General:**
  - `Ctrl + C / V / X`: Copiar, Pegar y Cortar archivos.
  - `Ctrl + Z`: Deshacer última operación de archivo.

## Patrones de Implementación Técnica
- **Backend:** Utiliza la librería `sharp` para todo el procesamiento de imágenes (rotación, resize, crop), asegurando alto rendimiento y desabilitación de caché para evitar bloqueos en Windows.
- **Frontend:** Comunicaciones vía `/api/rotate-image`, `/api/resize-images` y `/api/rename`.
- **Modals:** Los overlays utilizan efectos *glassmorphism* (`backdrop-filter: blur`) para una integración visual premium.