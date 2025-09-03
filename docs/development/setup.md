# Development Environment Setup

Complete guide for setting up the SPMS development environment across different platforms and tools.

## Prerequisites

### System Requirements
- **Python**: 3.10.0 - 3.11.x (3.11+ not yet fully supported)
- **Operating System**: Windows 10/11, macOS 11+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: 500MB for dependencies, 1GB for development tools

### Required Tools
- **Git**: Version control system
- **Code Editor**: VS Code, PyCharm, or similar with Python support
- **Terminal**: Command line interface (PowerShell, Terminal, or bash)

## Quick Start (5 minutes)

### 1. Clone Repository
```bash
git clone <repository-url>
cd SPMS
```

### 2. Environment Setup
Choose your preferred method:

**Option A: Poetry (Recommended)**
```bash
# Install Poetry if not installed
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Activate virtual environment
poetry shell
```

**Option B: pip + venv**
```bash
# Create virtual environment
python3 -m venv env

# Activate virtual environment
# Windows:
env\Scripts\activate
# macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Required: SECRET_KEY
# Optional: USE_TEST_DATA=true for development
```

### 4. Run Application
```bash
# Development server
python app.py

# Visit http://127.0.0.1:5000
```

## Detailed Setup Instructions

### 1. Python Installation

#### Windows
```powershell
# Using winget
winget install Python.Python.3.10

# Using Chocolatey
choco install python --version 3.10.0

# Manual download from python.org
# Download Python 3.10.x from https://www.python.org/downloads/
```

#### macOS
```bash
# Using Homebrew
brew install python@3.10

# Using pyenv
pyenv install 3.10.0
pyenv global 3.10.0
```

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install Python 3.10
sudo apt install python3.10 python3.10-venv python3.10-pip

# Set as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
```

### 2. Dependency Management

#### Poetry Setup (Recommended)
**Why Poetry?**
- Dependency resolution and lock files
- Virtual environment management
- Easy package publishing
- Development/production dependency separation

**Installation**:
```bash
# Linux/macOS/WSL
curl -sSL https://install.python-poetry.org | python3 -

# Windows PowerShell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -

# Add to PATH (check installation output for specific instructions)
```

**Project Setup**:
```bash
# Install all dependencies (including dev dependencies)
poetry install

# Install only production dependencies
poetry install --only main

# Activate virtual environment
poetry shell

# Run commands in virtual environment
poetry run python app.py
poetry run pytest
```

#### Alternative: pip + venv
```bash
# Create virtual environment
python3 -m venv env

# Activate virtual environment
# Windows Command Prompt:
env\Scripts\activate.bat
# Windows PowerShell:
env\Scripts\Activate.ps1  
# macOS/Linux:
source env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# For development (includes testing tools)
pip install -r requirements.txt ruff pyright pytest
```

### 3. Environment Configuration

#### Environment Variables
Create `.env` file in project root:

```bash
# Required Configuration
SECRET_KEY=your-secret-key-here-use-random-string

# Optional Configuration  
USE_TEST_DATA=true                    # Use test data for development
SCREEN_DURATION_SECONDS=12            # Carousel screen duration
FLASK_ENV=development                 # Enable debug mode

# External API Configuration (Optional)
HOLLANDSE_VELDEN_API_KEY=your-api-key-here

# Database Configuration (Future Use)  
DATABASE_URL=postgresql://user:pass@localhost:5432/spms
```

#### Generate SECRET_KEY
```python
# Python one-liner to generate secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Or use online generator (less secure)
# https://flask.palletsprojects.com/en/2.3.x/config/#SECRET_KEY
```

### 4. Development Tools

#### Code Quality Tools
```bash
# Using Poetry
poetry add --group dev ruff pyright pytest

# Using pip
pip install ruff pyright pytest
```

**Tool Configuration**:
- **ruff**: Already configured in `pyproject.toml`
- **pyright**: Already configured in `pyproject.toml`  
- **pytest**: Will be added for testing

#### VS Code Setup
**Required Extensions**:
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)  
- Ruff (charliermarsh.ruff)

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "./env/bin/python",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.formatting.provider": "ruff",
  "python.analysis.typeCheckingMode": "basic",
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    ".pytest_cache": true
  }
}
```

#### PyCharm Setup
1. **Create New Project**: Choose existing source
2. **Python Interpreter**: Select virtual environment or Poetry
3. **Code Style**: Set to PEP 8
4. **Inspections**: Enable Python inspections
5. **File Watchers**: Add ruff for automatic formatting

### 5. Database Setup (Optional/Future)

#### PostgreSQL (for future enhancements)
```bash
# Install PostgreSQL
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
# Windows: Service starts automatically
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
createdb spms_development

# Update .env with database URL
echo "DATABASE_URL=postgresql://username:password@localhost:5432/spms_development" >> .env
```

## Development Workflow

### 1. Daily Development
```bash
# Start virtual environment
poetry shell  # or source env/bin/activate

# Pull latest changes
git pull origin main

# Install any new dependencies
poetry install  # or pip install -r requirements.txt

# Run development server
python app.py

# Code, test, commit
git add .
git commit -m "Feature: Add new functionality"
git push origin feature-branch
```

### 2. Code Quality Checks
```bash
# Lint code
ruff check .

# Format code
ruff format .

# Type checking
pyright

# Run all quality checks
poetry run ruff check . && poetry run ruff format . && poetry run pyright
```

### 3. Testing (When Available)
```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=.

# Run specific test
pytest tests/test_api.py::test_get_standings
```

## Platform-Specific Notes

### Windows Development

#### PowerShell Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow local scripts (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Windows Subsystem for Linux (WSL)
For a Linux-like development experience on Windows:

```bash
# Install WSL2
wsl --install

# Install Ubuntu
wsl --install -d Ubuntu

# Use WSL for development
wsl
cd /mnt/c/path/to/SPMS
```

### macOS Development

#### Homebrew Dependencies
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install development tools
brew install git python@3.10 postgresql

# Optional: pyenv for Python version management
brew install pyenv
pyenv install 3.10.0
```

### Linux Development

#### System Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.10 python3.10-venv python3.10-pip git build-essential

# CentOS/RHEL/Fedora
sudo dnf install python3.10 python3-pip git gcc

# Arch Linux
sudo pacman -S python python-pip git gcc
```

## Troubleshooting

### Common Issues

#### Python Version Issues
```bash
# Check Python version
python --version
python3 --version

# If wrong version, use specific version
python3.10 -m venv env
```

#### Virtual Environment Issues
```bash
# Clear virtual environment
rm -rf env  # or rm -rf .venv
python3 -m venv env

# Recreate and reinstall
source env/bin/activate  # or env\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Poetry Issues
```bash
# Clear Poetry cache
poetry cache clear pypi --all

# Reinstall Poetry
curl -sSL https://install.python-poetry.org | python3 - --uninstall
curl -sSL https://install.python-poetry.org | python3 -

# Recreate virtual environment
poetry env remove python
poetry install
```

#### Permission Issues (Linux/macOS)
```bash
# Fix pip permissions
python3 -m pip install --user --upgrade pip

# Use virtual environment to avoid system-wide installs
python3 -m venv env
source env/bin/activate
```

### Port Already in Use
```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000
# macOS/Linux:
lsof -i :5000

# Kill process or use different port
python app.py --port 5001
```

### API Connection Issues
```bash
# Test API connectivity
curl -X GET "https://api.hollandsevelden.nl/competities/2025-2026/oost/za/3n/"

# Enable test mode if API unavailable
echo "USE_TEST_DATA=true" >> .env
```

## IDE Configuration

### VS Code Launch Configuration
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Flask",
      "type": "python",
      "request": "launch",
      "program": "app.py",
      "env": {
        "FLASK_ENV": "development",
        "USE_TEST_DATA": "true"
      },
      "args": [],
      "jinja": true,
      "justMyCode": true
    }
  ]
}
```

### VS Code Tasks
Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0", 
  "tasks": [
    {
      "label": "ruff check",
      "type": "shell",
      "command": "ruff",
      "args": ["check", "."],
      "group": "build"
    },
    {
      "label": "ruff format",
      "type": "shell", 
      "command": "ruff",
      "args": ["format", "."],
      "group": "build"
    }
  ]
}
```

## Performance Optimization

### Development Performance
```bash
# Use test data for faster development
export USE_TEST_DATA=true

# Reduce screen duration for faster testing
export SCREEN_DURATION_SECONDS=2

# Use Flask debug mode with auto-reload
export FLASK_ENV=development
```

### Memory Usage
- Virtual environment: ~100MB
- Application runtime: ~50MB base + ~10MB per dataset
- Total development environment: ~200MB

## Security Considerations

### Development Security
- **Never commit** `.env` file or secrets
- **Use test data** for development to avoid API key exposure
- **Local development only** - don't expose development server externally
- **Strong SECRET_KEY** even in development

### Git Hooks (Optional)
Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Pre-commit hook for code quality

echo "Running pre-commit checks..."

# Run ruff
ruff check . || exit 1

# Run type checking  
pyright || exit 1

echo "Pre-commit checks passed!"
```

This development setup provides a robust foundation for SPMS development with comprehensive tooling and cross-platform support.