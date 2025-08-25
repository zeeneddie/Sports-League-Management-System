#!/bin/bash
echo "Starting SPMS with test data..."

# Check if virtual environment exists
if [ ! -d "env" ]; then
    echo "Creating virtual environment..."
    python3 -m venv env
fi

echo "Activating virtual environment..."
source env/bin/activate

echo "Installing/updating dependencies..."
pip install -r requirements.txt

echo "Setting environment for test mode..."
export USE_TEST_DATA=true
export SECRET_KEY=test_secret_key_for_development

echo "Starting application with test data..."
python app.py