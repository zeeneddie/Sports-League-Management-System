@echo off
echo.
echo ====================================
echo   SPMS - START IN TEST MODE
echo ====================================
echo.
set USE_TEST_DATA=true
echo Starting in TEST MODE...
echo Featured team: VV Gorecht (test data)
echo Data bron: noord-zaterdag-1f.json
echo.
echo Dashboard toont TEST MODE badge rechts boven
echo.
echo Clearing any cached data...
python -c "from scheduler import data_scheduler; data_scheduler.clear_cache()"
echo.
python app.py