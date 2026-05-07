# Skill: Video Editor (Explorador Remb Pro)

Este documento centraliza todas las capacidades de edición y manipulación de video implementadas en la aplicación, incluyendo la interfaz de usuario, lógica del cliente y endpoints del servidor.

## 1. Interfaz del Editor de Video (`video-editor-overlay`)

El editor es una interfaz a pantalla completa diseñada para previsualización precisa y edición rápida.

### Controles de Reproducción e Interacción
- **Play/Pause**: Botón dedicado y tecla `Enter`.
- **Mute**: Botón de volumen y tecla `M`.
- **Loop**: Activado por defecto para previsualización continua.
- **Navegación por Frames**: Botones `<<` y `>>` para avance cuadro a cuadro. Mantener presionado para avance continuo (aprox. 12 fps). También disponible con las flechas del teclado `←` y `→`.
- **Captura de Pantalla**: Botón "Capturar" o tecla `Espacio`. Extrae el frame actual, lo muestra en el panel lateral y lo guarda automáticamente en disco.
- **Velocidad de Reproducción**: Selector de velocidad (0.1x a 3.0x). Botón "Guardar Copia" para generar un nuevo archivo con la velocidad aplicada permanentemente.

## 2. Línea de Tiempo Visual (Estilo CapCut)

Permite una edición no lineal básica dentro del navegador.

- **Segmentación (Split)**: El botón "Dividir" corta el clip actual en la posición del cabezal de reproducción.
- **Eliminación**: Los clips seleccionados en la línea de tiempo pueden ser eliminados.
- **Ajuste de Clips**: Se pueden definir puntos de inicio y fin específicos para cada segmento seleccionado.
- **Combinación**: El botón "Guardar Cambios" procesa todos los clips de la línea de tiempo y los une en un único archivo de salida (`_capcut_edit.mp4`).

## 3. Herramientas de Recorte (Trimming)

Ubicadas en la base del editor para ediciones rápidas de un solo clip.

- **Set In / Set Out**: Define los puntos de inicio y fin del recorte basado en la posición actual del video.
- **Recortar (Original)**: Sustituye el archivo original por el fragmento seleccionado (usa un archivo temporal para seguridad).
- **Copia**: Guarda el fragmento como un nuevo archivo sin modificar el original.

## 4. Endpoints del Servidor (`server.js`)

### `/api/trim-video` (POST)
Utiliza FFmpeg con `-c copy` para un recorte instantáneo sin pérdida de calidad.
- **Parámetros**: `sourcePath`, `startTime`, `endTime`, `overwrite`.

### `/api/change-video-speed` (POST)
Ajusta la velocidad del video (`setpts`) y del audio (`atempo`). Requiere re-codificación (`libopenh264`).
- **Parámetros**: `sourcePath`, `speed`.

### `/api/combine-videos` (POST)
Proceso de dos pasos:
1. Normaliza los clips a una resolución y FPS comunes.
2. Utiliza el filtro `concat` de FFmpeg para unirlos.
- **Parámetros**: `clips` (lista de objetos con `path`, `inTime`, `outTime`), `outputName`, `outputDir`.

### `/api/save-snapshot` (POST)
Recibe un `dataUrl` (Base64) desde el canvas del cliente y lo guarda como un archivo `.png` en la carpeta del video.

### `/api/compress-videos` (POST)
Accesible desde el menú contextual. Permite reducir el tamaño de uno o varios videos aplicando un `targetBitrate` basado en un valor de calidad (CRF simulado) y escala opcional.

## 5. Atajos de Teclado
- `Enter`: Reproducir / Pausar.
- `Espacio`: Capturar frame (Snapshot).
- `← / →`: Retroceder / Avanzar un frame (Mantener para avance rápido).
- `M`: Silenciar / Activar audio.
- `Esc`: Cerrar el editor.