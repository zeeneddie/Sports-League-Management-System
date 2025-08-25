@echo off
echo Starting SPMS with production data...

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

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: No .env file found. Creating template...
    echo SECRET_KEY=your_secret_key_here > .env
    echo Please edit .env file with your actual SECRET_KEY
    pause
)

echo Starting application with production data...
python app.py

pause