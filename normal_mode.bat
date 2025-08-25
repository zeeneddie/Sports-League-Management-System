@echo off
echo ====================================
echo    SPMS NORMAL MODE - AVV COLUMBIA
echo ====================================
echo.

REM Set environment variable for current session
set USE_TEST_DATA=false
echo * Normale modus ingeschakeld
echo * Featured team: AVV Columbia
echo * Data bron: Live API (hollandsevelden.nl)
echo.

REM Create or update .env file
echo USE_TEST_DATA=false > .env
if exist .env (
    echo * .env bestand bijgewerkt met USE_TEST_DATA=false
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
echo Live data van AVV Columbia wordt opgehaald
echo Druk CTRL+C om te stoppen
echo.

REM Start the Flask application
python app.py

echo.
echo ====================================
echo    APPLICATION STOPPED
echo ====================================
pause