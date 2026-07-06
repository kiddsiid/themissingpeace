@echo off
cd /d "%~dp0"

rem --- Runs Next.js directly via pnpm's own shim, bypassing npm/corepack ---

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. Install the LTS from https://nodejs.org ,
  echo then CLOSE this window, open a NEW one, and double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\next.CMD" (
  echo.
  echo Dependencies are not installed yet.
  echo Open a terminal in this folder and run once:   corepack pnpm install
  echo Then double-click this file again.
  echo.
  pause
  exit /b 1
)

echo Clearing .next cache...
if exist .next rmdir /s /q .next
echo Starting The Missing Peace at http://localhost:3000 ...
call "%~dp0node_modules\.bin\next.CMD" dev
pause
