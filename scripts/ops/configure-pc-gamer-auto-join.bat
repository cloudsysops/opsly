@echo off
REM ============================================================
REM Opsly PC-Gamer Auto-Join - Wrapper BAT para doble-clic
REM Ejecuta el script PowerShell como Administrador automáticamente
REM ============================================================

title Opsly PC-Gamer Auto-Join Setup
echo.
echo  ██████╗ ███████╗██████╗ ██╗   ██╗███████╗██████╗ 
echo  ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
echo  ██████╔╝█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
echo  ██╔══██╗██╔═══╝  ██══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
echo  ██║  ██║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
echo  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝  ╚═══╝ ╚══════╝╚═╝  ╚═╝
echo.
echo  ============================================================
echo   Opsly PC-Gamer Auto-Join - Configuracion Automatica
echo  ============================================================
echo.
echo  Este script configura el PC Gamer para:
echo   * Auto-conectar a Tailscale al arrancar Windows
echo   * PULEAR ultima config del repo GitHub (scripts/ops/)
echo   * Verificar conectividad con VPS (100.120.151.91)
echo   * Re-conectar cada 15 minutos si se cae la red
echo   * Logs en C:\Opsly\logs\pc-gamer-auto-join.log
echo.
echo  REQUISITO: Debe ejecutarse COMO ADMINISTRADOR
echo.

REM Verificar si ya somos Admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Ya eres Administrador. Continuando...
    echo.
) else (
    echo [INFO] Solicitando elevacion de privilegios (UAC)...
    echo.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
        "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

REM Buscar el archivo .ps1 en varias ubicaciones
set "PS_SCRIPT="
if exist "%~dp0configure-pc-gamer-auto-join.ps1" (
    set "PS_SCRIPT=%~dp0configure-pc-gamer-auto-join.ps1"
) else if exist "C:\Users\Public\configure-pc-gamer-auto-join.ps1" (
    set "PS_SCRIPT=C:\Users\Public\configure-pc-gamer-auto-join.ps1"
) else if exist "C:\configure-pc-gamer-auto-join.ps1" (
    set "PS_SCRIPT=C:\configure-pc-gamer-auto-join.ps1"
) else (
    echo [ERROR] No se encuentra configure-pc-gamer-auto-join.ps1
    echo.
    echo Coloca este .bat y el .ps1 en la misma carpeta, o pon el .ps1 en:
    echo   - C:\Users\Public\
    echo   - C:\
    echo.
    pause
    exit /b 1
)

echo [OK] Script encontrado: %PS_SCRIPT%
echo.
echo Ejecutando configuracion...
echo.

REM Ejecutar PowerShell con bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

echo.
if %errorLevel% == 0 (
    echo [EXITOSO] Configuracion completada.
    echo.
    echo Para ver logs en tiempo real:
    echo   Get-Content C:\Opsly\logs\pc-gamer-auto-join.log -Wait -Tail 20
) else (
    echo [ERROR] La configuracion fallo (codigo %errorLevel%).
    echo Revisa el log en C:\Opsly\logs\pc-gamer-auto-join.log
)

echo.
pause