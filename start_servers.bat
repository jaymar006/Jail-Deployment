@echo off
echo Starting Jail Information System in Development Mode...
echo.
echo For production deployment (using built files), use: start_production.bat
echo.

REM Setup environment file if it doesn't exist
echo Setting up environment...
node setup_env.js

REM Start backend server in a new window
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

REM Start frontend server in a new window
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

REM Wait for 10 seconds to allow servers to start
timeout /t 10 /nobreak

echo.
echo Development servers are starting...
echo Frontend: http://localhost:3000 (development mode)
echo Backend: http://localhost:5000
echo.
echo Press any key to exit this window...
pause >nul
