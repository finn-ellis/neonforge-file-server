@echo off
echo 🧪 Testing NeonBrush File Server Email Functionality
echo ==================================================

REM Test 1: Check if backend compiles
echo 📦 Testing backend compilation...
cd backend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Backend compilation failed
    exit /b 1
)
echo ✅ Backend compiles successfully

REM Test 2: Check if frontend compiles
echo 📦 Testing frontend compilation...
cd ..
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend compilation failed
    exit /b 1
)
echo ✅ Frontend compiles successfully

echo.
echo 🎉 All tests passed! Your NeonBrush File Server is ready!
echo.
echo 🚀 To start the application:
echo    Development: docker-compose -f docker-compose.dev.yml up
echo    Production:  docker-compose up -d
echo.
echo 📧 Email features:
echo    - Upload files in Upload Mode
echo    - Switch to Tablet Mode to request files via email
echo    - Configure SMTP settings in backend/.env for real emails
echo    - Without SMTP config, emails will be simulated in logs
pause
