@echo off
setlocal EnableExtensions
title Port Kembla Steelworks 3D - Firefox
color 07
echo.
echo ============================================
echo       PORT KEMBLA STEELWORKS 3D
echo ============================================
echo.
cd /d "%~dp0"
if errorlevel 1 goto badfolder

where node.exe >nul 2>nul
if errorlevel 1 goto nonode
where npm.cmd >nul 2>nul
if errorlevel 1 goto nonpm

node -e "let v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)||(v[0]===20&&v[1]>=19)?0:1)"
if errorlevel 1 goto oldnode

echo Node.js is installed:
node --version
echo.

if not exist "scripts\start.mjs" goto nofiles
if not exist "node_modules\vite\bin\vite.js" (
  echo First run: installing required 3D game files.
  echo This needs an internet connection.
  echo.
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto installfailed
)

echo.
echo Starting the game server...
echo Keep this window open while playing.
echo.
node "scripts\start.mjs"
echo.
echo Game server has stopped.
echo If the game did not appear, read the messages above.
pause
exit /b 0

:badfolder
echo ERROR: Could not open the game folder.
echo Extract the GitHub ZIP before running this file.
goto failed

:nonode
echo ERROR: Node.js is not installed or was not found.
echo Install the current LTS version from https://nodejs.org/
echo Then close and reopen this launcher.
goto failed

:nonpm
echo ERROR: npm is missing.
echo Reinstall Node.js using the official installer.
goto failed

:oldnode
echo ERROR: Your Node.js version is too old for this game.
echo Install Node.js 22.12 or newer from https://nodejs.org/
goto failed

:nofiles
echo ERROR: Missing game files.
echo Extract the entire GitHub ZIP. Do not run this launcher alone.
goto failed

:installfailed
echo ERROR: Downloading the game's dependencies failed.
echo Check your internet connection and the npm error above.
goto failed

:failed
echo.
pause
exit /b 1
