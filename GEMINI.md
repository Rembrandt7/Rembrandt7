# Instrucciones y Reglas de Desarrollo para Rembrandt7

## 1. Regla Obligatoria de Prevención de Alertas de Antivirus Corporativo (EDR / OneDrive)

Dado que este equipo cuenta con monitoreo de Antivirus/EDR corporativo y las carpetas del proyecto se sincronizan en **OneDrive**, SIEMPRE debes aplicar estas medidas y buscar alternativas seguras para que **nunca** salten alertas a Sistemas:

1. **Prohibido dejar carpetas `dist/` o builds minificados en OneDrive**:
   - Si ejecutas `vite build` localmente para validar la compilación, **elimina inmediatamente la carpeta `dist/`** al terminar (`Remove-Item -LiteralPath .\dist -Recurse -Force`).
   - Vercel compila su propio `dist` en la nube; dejar `.js` minificados localmente dentro de OneDrive provoca que el antivirus los escanee repetidamente en cada ciclo de sincronización.
   - Mantener en `vite.config.ts` la agrupación de `lucide-react` bajo `vendor-icons` para que nunca se generen chunks individuales con nombres heurísticos como `send-*.js` o `terminal-*.js`.

2. **Patrones de Código Seguros (Evitar Falsos Positivos Heurísticos)**:
   - **NUNCA** combines en un mismo archivo `.ts`/`.tsx`/`.js`:
     - Palabras clave sensibles (`credenciales`, `passwords`, `tokens`, `sql`, `exploit`, `dump`, `shell`) +
     - Lectura de `localStorage` +
     - Descarga programática con `new Blob()` + `URL.createObjectURL()` + `document.createElement('a')` + `.click()`.
   - Cuando se necesite exportar o respaldar datos, delega siempre en la función centralizada del contexto (`saveConfigToFile`) y usa descripciones neutras (`configuración`, `ajustes`, `respaldo`).

3. **Prohibido guardar Cachés de Navegador o Archivos Temporales dentro de OneDrive**:
   - Nunca guardar carpetas de caché de Chromium/Playwright/Puppeteer (`Cache`, `Code Cache`, `GPUCache`, `GrShaderCache`, `ShaderCache`, archivos `journal.baj`) dentro de OneDrive. Si una herramienta requiere perfil de navegador, usar `$env:LOCALAPPDATA` fuera de OneDrive o limpiar las subcarpetas de caché al finalizar.
   - No crear scripts `.bat`, `.vbs` ni ejecutables temporales dentro de las carpetas de OneDrive.

---

## 2. Flujo de Trabajo en Modo Local Primero y Despliegue a Vercel a Petición

Para agilizar el desarrollo y evitar demoras innecesarias de despliegue en la nube por cada cambio o ajuste menor, se establece la siguiente regla obligatoria para todos los chats:

1. **Desarrollo y Previsualización Inmediata en Modo Local (`http://localhost:3000`)**:
   - Cada vez que el usuario solicite un cambio (diseño, íconos, reordenamiento, funciones, componentes), **aplica los cambios inmediatamente en los archivos locales**.
   - El servidor de desarrollo local (`.\node-portable.exe .\node_modules\tsx\dist\cli.mjs server.ts`) se encarga de reflejar los cambios en caliente (Hot Reload) en menos de 1 segundo en `http://localhost:3000`.
   - **ESTÁ PROHIBIDO compilar o subir a Vercel por cada ajuste intermedio**. Nunca hagas commit ni push hasta que el usuario haya visto el cambio en local y dé su aprobación expresa.

2. **Botón Exclusivo de Entorno Local ("Subir a Vercel")**:
   - En entorno local (`localhost`), la interfaz de Rembrandt muestra un botón visible en el header: `[Subir a Vercel]`.
   - Este botón permite al usuario lanzar el despliegue automático hacia Vercel directamente con un solo clic.
   - En producción (Vercel), este botón permanece **100% oculto e inexistente** para no alterar la interfaz pública.

3. **Protocolo de Publicación a Producción (Vercel)**:
   - Se ejecuta **ÚNICAMENTE** cuando ocurra una de estas dos situaciones:
     a) El usuario lo pide explícitamente en el chat (ej. *"Súbelo a Vercel"*, *"Publicar"*, *"Pásalo a producción"*).
     b) El usuario pulsa el botón local `[Subir a Vercel]`.
   - Cuando se autoriza la subida a Vercel:
     1. Incrementar versión en `public/sw.js` (ej. `rembrandt-pwa-v...`) y en `package.json`.
     2. Si se prueba `vite build` localmente, borrar la carpeta `dist/` de inmediato.
     3. Ejecutar `git add .`, `git commit -m "<mensaje descriptivo>"`.
     4. Ejecutar `git push origin main` y `git push origin HEAD:main-Rembrandt7`.
     5. Monitorear el commit en GitHub API hasta que Vercel reporte `"state": "success"`.
     6. Verificar con `curl.exe` que el `sw.js` en vivo refleje la nueva versión.
     7. Confirmar al usuario que la versión en producción está actualizada.

---

## 3. Regla Obligatoria de Control de Peso y Almacenamiento en Vercel (Hobby / Free Tier)

Para evitar rebasar los límites gratuitos de Vercel (10 GB de Function Storage / Deployment Storage):

1. **Alerta Previa Obligatoria por Aumento Significativo de Peso**:
   - Siempre que el usuario solicite un cambio, funcionalidad o nueva librería, **DEBES evaluar previamente el impacto en el tamaño del proyecto y de las Serverless Functions**.
   - Si una librería o cambio va a aumentar significativamente el peso (ej. herramientas de renderizado de video, emuladores de navegador como Puppeteer/Playwright, modelos pesados de IA locales o SDKs masivos mayores a 10 MB), **ESTÁ ESTRICTAMENTE PROHIBIDO instalarlo o ejecutarlo directamente**.
   - **DEBES avisar al usuario primero**, explicándole cuánto aumentará el tamaño aproximado, los riesgos en los límites de Vercel y proponiendo alternativas ligeras basadas en APIs externas o procesamiento en el navegador antes de proceder.

2. **Cero Ramas de Previsualización Innecesarias**:
   - Desplegar siempre y exclusivamente a `main`. Nunca enviar a ramas preview como `main-Rembrandt7` para evitar duplicar almacenamiento y ejecuciones en Vercel.
