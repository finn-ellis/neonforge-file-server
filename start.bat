@echo off
REM NeonBrush File Server - Quick Start Script for Windows

echo 🎨 NeonBrush File Server - Quick Start
echo =====================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Ask user for environment
echo Choose your environment:
echo 1) Development (hot reload)
echo 2) Production (optimized build)
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo 🚀 Starting development environment...
    docker-compose -f docker-compose.dev.yml up --build
) else if "%choice%"=="2" (
    echo 🚀 Starting production environment...
    docker-compose up --build -d
    echo ✅ Application is running!
    echo 📱 Frontend: http://localhost:3000
    echo 🔗 Backend API: http://localhost:3001
    echo.
    echo To stop the application, run: docker-compose down
    pause
) else (
    echo ❌ Invalid choice. Please run the script again.
    pause
    exit /b 1
)
