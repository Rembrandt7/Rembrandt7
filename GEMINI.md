# Instrucciones y Reglas de Desarrollo para Rembrandt7

## Protocolo Obligatorio de Finalización de Tareas y Despliegue en Vercel

Cada vez que el usuario solicite un cambio o nueva funcionalidad, **NO** des por terminada la tarea solo con editar los archivos locales. Debes seguir este flujo completo:

1. **Verificación Local**:
   - Comprobar que no haya errores de compilación (`vite build`).
   - Incrementar la versión de caché en `public/sw.js` (ej. `rembrandt-pwa-v15`, etc.) cuando haya cambios para forzar la actualización de la PWA.

2. **Commit y Push a GitHub**:
   - Ejecutar `git add .`
   - Ejecutar `git commit -m "<mensaje descriptivo>"`
   - Ejecutar `git push origin main`

3. **Verificación de Despliegue en Vercel**:
   - Monitorear el estado del commit mediante la API de GitHub:
     `curl.exe -s "https://api.github.com/repos/Rembrandt7/Rembrandt7/commits/<commit_sha>/statuses"`
   - Esperar hasta que Vercel reporte `"state": "success"` (`"description": "Deployment has completed"`).
   - Verificar opcionalmente con `curl.exe -s -H "Cache-Control: no-cache" https://rembrandt7.vercel.app/sw.js` que la nueva versión esté activa.

4. **Entrega al Usuario**:
   - Solo confirmar que la tarea está completada UNA VEZ que el cambio esté verificado en vivo en Vercel.
