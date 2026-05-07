@echo off
echo Matando procesos ocultos de Node...
taskkill /F /IM node.exe
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Rembrandt7*"
echo Limpieza completa.
