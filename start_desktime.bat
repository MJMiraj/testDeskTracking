@echo off
echo ========================================================
echo          Starting DeskTime Pro (All Servers)
echo ========================================================

echo [1] Stopping any running Node servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2] Starting Backend Server (Port 5000)...
start "DeskTime Backend" cmd /k "cd backend && node server.js"

echo [3] Starting Frontend React App (Port 5173)...
start "DeskTime Frontend" cmd /k "cd frontend && npm run dev"

echo [4] Starting Electron Desktop App...
start "DeskTime Desktop App" cmd /k "cd desktop-app && npm start"

echo.
echo ========================================================
echo  All servers are starting in separate windows!
echo  Please wait a few seconds for the Desktop App to open.
echo ========================================================
pause
