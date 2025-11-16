@echo off
echo Starting Jail Information System in Production Mode...
echo.

REM Setup environment file if it doesn't exist
echo Setting up environment...
node setup_env.js

REM Install dependencies if needed
echo Installing dependencies...
call npm run install-all
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

REM Build the frontend
echo Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend!
    pause
    exit /b 1
)

echo.
echo Starting servers...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo.

REM Start backend server in a new window
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

REM Wait for 3 seconds to allow backend to start
timeout /t 3 /nobreak

REM Start frontend server (serving built files) in a new window
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npx serve -s build -l 3000"

echo.
echo Both servers are starting...
echo You can access the application at: http://localhost:3000
echo.
echo Press any key to exit this window...
pause >nul
