@echo off
echo SPMS SSL Certificate Setup
echo ========================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

echo Creating SSL certificates...
python generate_ssl_cert.py

if errorlevel 1 (
    echo Failed to generate SSL certificates
    pause
    exit /b 1
)

echo.
echo SSL setup complete!
echo You can now run: python app.py
echo And visit: https://localhost:5443
echo.
pause