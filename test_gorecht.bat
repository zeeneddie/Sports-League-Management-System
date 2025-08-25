@echo off
echo ====================================
echo    SPMS TEST MODE - VV GORECHT
echo ====================================
echo.

REM Set environment variable for current session
set USE_TEST_DATA=true
echo * Testmodus ingeschakeld
echo * Featured team: VV Gorecht
echo * Data bron: noord-zaterdag-1f.json
echo.

REM Create or update .env file
echo USE_TEST_DATA=true > .env
if exist .env (
    echo * .env bestand bijgewerkt met USE_TEST_DATA=true
) else (
    echo * .env bestand aangemaakt
)
echo.

echo ====================================
echo    STARTING FLASK APPLICATION
echo ====================================
echo.
echo Dashboard zal draaien op: http://localhost:5000
echo.
echo VV Gorecht staat op positie 9 met 22 punten
echo Druk CTRL+C om te stoppen
echo.

REM Start the Flask application
python app.py

echo.
echo ====================================
echo    APPLICATION STOPPED
echo ====================================
pause