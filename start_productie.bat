@echo off
echo Starting PRODUCTION with real API data...

REM Check if virtual environment exists
if not exist "env" (
    echo Creating virtual environment...
    python -m venv env
)

echo Activating virtual environment...
call env\Scripts\activate

echo Installing/updating dependencies...
pip install -r requirements.txt

echo Setting environment for production mode...
set USE_TEST_DATA=false
set SECRET_KEY=production_secret_key_change_this

echo Starting application with production data (Columbia)...
python app.py

pause