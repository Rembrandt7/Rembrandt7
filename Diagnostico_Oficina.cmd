@echo off
title Rembrandt7 - Modo Diagnostico Oficina
echo ===================================================
echo Iniciando Rembrandt7 en Diagnostico para Oficina...
echo (Utilizando NODE PORTABLE para saltar bloqueos)
echo ===================================================
cd /d "%~dp0"

echo.
echo Iniciando servidor en puerto 3000...
echo (Abre tu navegador manualmente en: http://127.0.0.1:3000)
echo.

node-portable.exe node_modules\tsx\dist\cli.mjs server.ts

echo.
echo El servidor se cerro inesperadamente.
pause
