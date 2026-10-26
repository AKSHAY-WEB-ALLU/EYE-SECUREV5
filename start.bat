@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and try again.
  pause
  exit /b 1
)
start "EYE SECURE Quotation Builder" http://localhost:4173
node server.js
pause
