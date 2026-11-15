@echo off
setlocal
title Port Kembla Steelworks 3D - Firefox launcher
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22 or newer: https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm is missing. Reinstall Node.js with npm included.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing the project's Three.js dependencies (first run only)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Dependency install failed. Check the internet connection.
    pause
    exit /b 1
  )
)
start "Steelworks Vite Server" cmd /k "cd /d ""%~dp0"" && npm run dev"
timeout /t 3 /nobreak >nul
set "FF=%ProgramFiles%\Mozilla Firefox\firefox.exe"
if not exist "%FF%" set "FF=%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe"
if exist "%FF%" (
  start "" "%FF%" "http://127.0.0.1:5173/"
) else (
  echo Firefox not found in its usual location.
  echo Open http://127.0.0.1:5173/ in Firefox.
)
echo The game server stays open in the separate terminal window.
endlocal
