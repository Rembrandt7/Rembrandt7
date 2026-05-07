@echo off
title Rembrandt7 - Studio AI
echo ===================================================
echo Iniciando Rembrandt7 en Local (Modo CMD)...
echo ===================================================
cd /d "%~dp0"
echo Verificando dependencias...
call npm install
echo.
echo Leyendo la direccion desde .env (si existe) y lanzando interfaz...
set APP_URL=http://localhost:3000
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="APP_URL" set APP_URL=%%~b
    )
)
rem Quitar las posibles comillas de APP_URL en caso de que existan
set APP_URL=%APP_URL:"=%
start %APP_URL%
npm run dev
pause
