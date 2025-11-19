@echo off
REM Docker Start Script for Jail Information System (Windows)
REM This script helps you get started with Docker quickly

echo 🏛️  Jail Information System - Docker Setup
echo ==========================================
echo.

REM Check if Docker is installed
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    Download from: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from env.example...
    copy env.example .env
    echo ⚠️  Please edit .env and set your JWT_SECRET!
    echo    Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    echo.
    pause
)

REM Ensure data directory exists
echo 📁 Creating data directory...
if not exist backend\data mkdir backend\data

REM Build the Docker image
echo 🔨 Building Docker image (this may take a few minutes)...
docker-compose build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    exit /b 1
)

REM Start the container
echo 🚀 Starting container...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to start container!
    exit /b 1
)

REM Wait for container to start
echo ⏳ Waiting for services to start...
timeout /t 5 /nobreak >nul

REM Check if container is running
docker ps | findstr jail-system-app >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Container is running!
    echo.
    echo 🌐 Access your application at:
    echo    https://jail-deployment.onrender.com
    echo.
    echo 📊 View logs with:
    echo    docker-compose logs -f app
    echo.
    echo 🛑 Stop the container with:
    echo    docker-compose down
) else (
    echo ❌ Container failed to start. Check logs with:
    echo    docker-compose logs app
    exit /b 1
)

pause


