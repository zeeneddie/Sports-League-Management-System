@echo off
echo Starting TEST READING test data...

REM Check if virtual environment exists
if not exist "env" (
    echo Creating virtual environment...
    python -m venv env
)

echo Activating virtual environment...
call env\Scripts\activate

echo Installing/updating dependencies...
pip install -r requirements.txt

echo Setting environment for test mode...
set USE_TEST_DATA=true
set SECRET_KEY=test_secret_key_for_development

echo Starting application with test data...
python app.py

pause