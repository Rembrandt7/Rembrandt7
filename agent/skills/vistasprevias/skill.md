---
name: vistas-previas
description: Maneja la lógica de visualización y previsualización de archivos (videos, PDFs, AutoCAD, PSD, etc.) en el explorador Remb.
---

# Vistas Previas de Archivos

Este skill define cómo se deben generar y mostrar las previsualizaciones de diferentes tipos de archivos en la aplicación, asegurando una experiencia visual premium y funcional.

## Tipos de Archivos Soportados

### 📽️ Videos (.mp4, .webm, .mkv, .mov, .avi)
Los videos deben mostrar una previsualización dinámica:
- **Estado Inicial:** Mostrar un frame al 30% de la duración total (`this.currentTime = duration * 0.3`).
- **Interacción (Hover):** Al pasar el mouse (`onmouseenter`), el video debe reproducirse automáticamente a una velocidad acelerada (`playbackRate = 2.5`).
- **Estado Final (Leave):** Al quitar el mouse (`onmouseleave`), el video se pausa y regresa al frame del 30%.
- **Atributos:** Usar `muted`, `loop`, `preload="metadata"`.

### 📄 PDF (.pdf)
Se visualizan usando un `iframe` incrustado:
- **Configuración:** Desactivar barras de herramientas y paneles de navegación mediante la URL: `src="${fileUrl}#toolbar=0&navpanes=0&scrollbar=0"`.
- **Contenedor:** Usar un div con clase `pdf-thumbnail` para manejar el desbordamiento y el scroll.

### 📐 AutoCAD / CAD (.dwg, .dxf)
Las previsualizaciones de DWG se extraen directamente del binario:
- **Lógica de Extracción:** El servidor escanea los primeros 5MB del archivo buscando la firma de cabecera PNG (`89 50 4E 47 0D 0A 1A 0A`).
- **Endpoint:** `/api/cad-thumb?path=...`
- **Fallback:** Si no se encuentra una miniatura PNG embebida, mostrar un icono representativo (📐).

### 🎨 Photoshop (.psd)
Se extrae la miniatura incrustada en el recurso de imagen con ID 1036:
- **Lógica:** Validar la firma `8BPS`, saltar la cabecera y buscar el recurso ID 1036 en la sección de "Image Resources".
- **Endpoint:** `/api/psd-thumb?path=...`

### 🖼️ Imágenes (.jpg, .png, .webp, etc.)
- Se muestran directamente vía `/api/raw?path=...`.
- Las imágenes y videos pueden mostrar su resolución (W x H) en los metadatos.

## Diseño y Estética Premium

Para mantener el aspecto profesional y "Premium" solicitado:
- **Ajuste de Medios:** Usar siempre `object-fit: contain` en imágenes y videos dentro de los contenedores de previsualización para evitar deformaciones.
- **Efectos Visuales:** Aplicar `backdrop-filter: blur(20px)` y `background: rgba(255, 255, 255, 0.05)` (vidrio/glassmorphism) en los paneles de previsualización.
- **Interactividad:** Las transiciones deben ser suaves (`transition: all 0.3s ease`).
- **Sombras:** Usar sombras profundas pero sutiles (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5)`) para dar profundidad a los elementos previsualizados.

## Resumen de Endpoints Clave
- `GET /api/raw?path=...`: Entrega el archivo original (para imágenes, texto, pdf).
- `GET /api/psd-thumb?path=...`: Genera miniatura de archivos Photoshop.
- `GET /api/cad-thumb?path=...`: Extrae miniatura de archivos AutoCAD (DWG).
- `GET /api/extract-icon?path=...`: Extrae el icono de archivos .exe o .lnk.

## Implementación en el Frontend

Para el renderizado de tarjetas en el grid (`renderFiles`):
1. Identificar la extensión del archivo.
2. Generar el `visualContent` HTML según el tipo (ej: `<video>`, `<iframe>`, `<img>`).
3. Inyectar metadatos como peso y resolución si están disponibles.

## Implementación en el Servidor

1. Usar `ffprobe` para obtener dimensiones y duración de videos.
2. Usar `sharp` para procesar y obtener metadatos de imágenes rápidamente.
3. Implementar extractores manuales para formatos binarios complejos (PSD/DWG) para evitar dependencias pesadas.