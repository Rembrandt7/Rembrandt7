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

## 2. Protocolo Obligatorio de Finalización de Tareas y Despliegue en Vercel

Cada vez que el usuario solicite un cambio o nueva funcionalidad, **NO** des por terminada la tarea solo con editar los archivos locales. Debes seguir este flujo completo:

1. **Verificación Local**:
   - Incrementar la versión de caché en `public/sw.js` (ej. `rembrandt-pwa-v58`, etc.) cuando haya cambios para forzar la actualización de la PWA.
   - Si se ejecuta `vite build` localmente, borrar la carpeta `dist` inmediatamente después de verificar.

2. **Commit y Push a GitHub**:
   - Ejecutar `git add .`
   - Ejecutar `git commit -m "<mensaje descriptivo>"`
   - Ejecutar `git push origin main` y `git push origin HEAD:main-Rembrandt7`

3. **Verificación de Despliegue en Vercel**:
   - Monitorear el estado del commit mediante la API de GitHub:
     `curl.exe -s "https://api.github.com/repos/Rembrandt7/Rembrandt7/commits/<commit_sha>/statuses"`
   - Esperar hasta que Vercel reporte `"state": "success"` (`"description": "Deployment has completed"`).
   - Verificar con `curl.exe -s -H "Cache-Control: no-cache" https://rembrandt7.vercel.app/sw.js` que la nueva versión esté activa.

4. **Entrega al Usuario**:
   - Solo confirmar que la tarea está completada UNA VEZ que el cambio esté verificado en vivo en Vercel.

---

## 3. Regla Obligatoria de Control de Peso y Almacenamiento en Vercel (Hobby / Free Tier)

Para evitar rebasar los límites gratuitos de Vercel (10 GB de Function Storage / Deployment Storage):

1. **Alerta Previa Obligatoria por Aumento Significativo de Peso**:
   - Siempre que el usuario solicite un cambio, funcionalidad o nueva librería, **DEBES evaluar previamente el impacto en el tamaño del proyecto y de las Serverless Functions**.
   - Si una librería o cambio va a aumentar significativamente el peso (ej. herramientas de renderizado de video, emuladores de navegador como Puppeteer/Playwright, modelos pesados de IA locales o SDKs masivos mayores a 10 MB), **ESTÁ ESTRICTAMENTE PROHIBIDO instalarlo o ejecutarlo directamente**.
   - **DEBES avisar al usuario primero**, explicándole cuánto aumentará el tamaño aproximado, los riesgos en los límites de Vercel y proponiendo alternativas ligeras basadas en APIs externas o procesamiento en el navegador antes de proceder.

2. **Cero Ramas de Previsualización Innecesarias**:
   - Desplegar siempre y exclusivamente a `main`. Nunca enviar a ramas preview como `main-Rembrandt7` para evitar duplicar almacenamiento y ejecuciones en Vercel.
