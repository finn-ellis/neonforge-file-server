@echo off
REM NeonBrush Email Queue Processor - Windows Batch Script
REM This script makes it easy to process the email queue after an event

echo.
echo ======================================
echo  NeonBrush Email Queue Processor
echo ======================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.6+ from https://python.org
    pause
    exit /b 1
)

REM Check if queue file exists
if not exist "uploads\email_queue.json" (
    echo WARNING: No email queue file found at uploads\email_queue.json
    echo Either no emails were requested, or the file server hasn't been run yet.
    echo.
    pause
    exit /b 0
)

REM Show queue info
echo Checking email queue...
for %%A in (uploads\email_queue.json) do (
    echo Queue file: %%A
    echo File size: %%~zA bytes
    echo Modified: %%~tA
)
echo.

REM Ask user what to do
echo What would you like to do?
echo 1. Dry run (show what would be sent without sending)
echo 2. Send emails (requires SMTP configuration)
echo 3. Create sample SMTP config file
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Running dry run...
    python process_email_queue.py --dry-run
    goto :end
)

if "%choice%"=="2" (
    REM Check for SMTP config
    if not exist "smtp_config.json" (
        echo.
        echo ERROR: smtp_config.json not found
        echo Please create this file with your SMTP settings.
        echo You can create a sample file by choosing option 3.
        goto :end
    )
    
    echo.
    echo Sending emails...
    python process_email_queue.py
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo Creating sample SMTP configuration...
    python process_email_queue.py --create-sample-config
    echo.
    echo Please copy smtp_config.sample.json to smtp_config.json
    echo and update it with your email settings.
    goto :end
)

if "%choice%"=="4" (
    echo Exiting...
    goto :end
)

echo Invalid choice. Please run the script again.

:end
echo.
pause
