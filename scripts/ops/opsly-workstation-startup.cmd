@echo off
rem Opsly work/stream workstation startup. Games and Steam are intentionally excluded.
rem IDEMPOTENTE: cada app se lanza solo si NO esta corriendo. Sin duplicados.
rem NO inicia streaming: OBS abre y queda en Ready. El operador pulsa Start Streaming.
rem Apps: OBS, Cursor, OpenCode (Windows Terminal), ChatGPT. NO Claude, NO BF6, NO Steam.
rem Backup del original: Opsly-Workstation-Startup.cmd.bak-20261002-222519

setlocal

call :ensure "obs64.exe" "OBS Studio" "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
ping -n 6 -w 500 127.0.0.1 >nul 2>&1

call :ensure "Cursor.exe" "Cursor" "C:\Users\opsly\AppData\Local\Programs\cursor\Cursor.exe"
ping -n 6 -w 500 127.0.0.1 >nul 2>&1

rem OpenCode corre dentro de Windows Terminal (WSL). El titulo "OpenCode" es lo que
rem matchea el Window Capture de la escena Coding (metodo WGC 2).
tasklist /FI "IMAGENAME eq WindowsTerminal.exe" 2>nul | find /I "WindowsTerminal.exe" >nul
if errorlevel 1 (
    echo [startup] Windows Terminal + OpenCode: lanzando
    start "OpenCode" wt.exe -w new --title OpenCode wsl.exe -e /home/opsly/.npm-global/bin/opencode
) else (
    echo [startup] Windows Terminal ya corria - no se relanza
)

ping -n 6 -w 500 127.0.0.1 >nul 2>&1

rem ChatGPT (paquete OpenAI.Codex). AUMID verificado via Get-AppxPackageManifest.
tasklist /FI "IMAGENAME eq ChatGPT.exe" 2>nul | find /I "ChatGPT.exe" >nul
if errorlevel 1 (
    echo [startup] ChatGPT: lanzando
    start "ChatGPT" explorer.exe "shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App"
) else (
    echo [startup] ChatGPT ya corria - no se relanza
)

endlocal
exit /b 0

:ensure
rem %1 = imagename  %2 = titulo  %3 = ruta
tasklist /FI "IMAGENAME eq %~1" 2>nul | find /I "%~1" >nul
if errorlevel 1 (
    echo [startup] %~2: lanzando
    start "%~2" "%~3"
) else (
    echo [startup] %~2 ya corria - no se relanza
)
goto :eof