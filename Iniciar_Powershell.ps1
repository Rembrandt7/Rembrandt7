# Ejecutar con PowerShell: Click derecho sobre este archivo -> Ejecutar con PowerShell
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $ScriptPath

Write-Host "Instalando dependencias si es necesario..." -ForegroundColor Green
npm install

Write-Host "Iniciando el servidor Rembrandt7..." -ForegroundColor Green
Write-Host "El navegador se abrirá en unos segundos..." -ForegroundColor Cyan

Start-Process "http://localhost:3000"
npm run dev
