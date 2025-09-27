#!/bin/bash
# Ubuntu Setup Script for SPMS Application
# This script sets up the application for background running on Ubuntu

set -e  # Exit on any error

echo "🚀 SPMS Ubuntu Setup Script"
echo "=========================="

# Check if Python 3.8+ is installed
echo "Checking Python version..."
PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Python version: $PYTHON_VERSION"

if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
    echo "✅ Python version OK"
else
    echo "❌ Python 3.8+ required. Install with:"
    echo "sudo apt update && sudo apt install python3.8 python3.8-pip python3.8-venv"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Install Playwright browsers and dependencies
echo "Installing Playwright browsers..."
python -m playwright install chromium

echo "Installing Playwright system dependencies..."
python -m playwright install-deps

# Create teams.config if it doesn't exist
if [ ! -f "teams.config" ]; then
    echo "Creating default teams.config..."
    cat > teams.config << EOF
# Team names to scrape from voetbaloost.nl
# One team per line, case sensitive
# Lines starting with # are comments

Robur et Velocitas
Victoria Boys
Albatross
TKA
WSV
Loenermark
Brummen SP
Apeldoornse Boys
Apeldoorn CSV
Voorst
CCW 16
WWNA
Orderbos
Oeken
Alexandria
VIOS/V
ZVV 56
Harfsen
Eefde SP
Almen
ZVV 56
Veensche Boys
Veluwse Boys
Horst FC
Zaandijk
Ruurlo
Driel RKSV
Angeren
Wissel
V en L
Vaassen
EOF
    echo "✅ teams.config created"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating default .env file..."
    cat > .env << EOF
# SPMS Configuration
SECRET_KEY=your-secret-key-here
USE_TEST_DATA=false
SCREEN_DURATION_SECONDS=12

# SSL Configuration (optional)
USE_SSL=false
SSL_CERT_PATH=ssl/cert.pem
SSL_KEY_PATH=ssl/key.pem
SSL_PORT=5443
HTTP_PORT=5000
EOF
    echo "✅ .env created - please edit with your settings"
fi

# Test installation
echo "Testing installation..."
python test_ubuntu_deployment.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SETUP COMPLETED SUCCESSFULLY!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Edit teams.config if needed"
    echo "3. Test the application:"
    echo "   source venv/bin/activate"
    echo "   python app.py"
    echo ""
    echo "For background deployment:"
    echo "4. Create systemd service (see ubuntu_service.sh)"
    echo "5. Enable and start the service"
else
    echo ""
    echo "❌ SETUP FAILED - Check errors above"
    exit 1
fi