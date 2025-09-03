#!/bin/bash
# SPMS Python Issues Fix Script
# Run this if you encounter Python installation or pip issues

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Fix python3-distutils issue
fix_distutils_issue() {
    print_status "Fixing python3-distutils issues..."
    
    # Get Ubuntu/Debian version
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_status "Detected OS: $NAME $VERSION_ID"
        
        case $VERSION_ID in
            "22.04"|"20.04"|"18.04")
                print_status "Ubuntu $VERSION_ID detected - trying alternative packages"
                apt update
                # For Ubuntu 22.04+, python3-distutils is replaced by python3-setuptools
                apt install -y python3-setuptools python3-pkg-resources || true
                ;;
            "12"|"11"|"10")
                print_status "Debian $VERSION_ID detected - trying alternative packages"
                apt update
                apt install -y python3-setuptools python3-pkg-resources || true
                ;;
            *)
                print_warning "Unknown OS version, trying generic approach"
                apt install -y python3-setuptools python3-pkg-resources || true
                ;;
        esac
    fi
    
    print_success "Distutils alternatives installed"
}

# Reinstall pip properly
fix_pip_installation() {
    print_status "Fixing pip installation..."
    
    # Remove any broken pip installations
    apt remove --purge python3-pip -y 2>/dev/null || true
    
    # Install pip using get-pip.py
    print_status "Downloading and installing pip using get-pip.py..."
    curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    python3 /tmp/get-pip.py --force-reinstall
    
    # Create symlinks if needed
    if [ ! -f /usr/local/bin/pip3 ]; then
        ln -sf /usr/local/bin/pip /usr/local/bin/pip3
    fi
    
    # Update PATH in profile
    echo 'export PATH="/usr/local/bin:$PATH"' >> /etc/profile
    
    # Clean up
    rm -f /tmp/get-pip.py
    
    print_success "Pip installation fixed"
}

# Install build dependencies
install_build_dependencies() {
    print_status "Installing build dependencies..."
    
    apt update
    apt install -y \
        build-essential \
        python3-dev \
        python3-setuptools \
        python3-wheel \
        libffi-dev \
        libssl-dev \
        libpq-dev \
        pkg-config \
        gcc \
        g++ \
        make
    
    print_success "Build dependencies installed"
}

# Test Python and pip
test_python_pip() {
    print_status "Testing Python and pip installation..."
    
    # Test Python
    if python3 --version; then
        print_success "Python 3 is working"
    else
        print_error "Python 3 is not working properly"
        return 1
    fi
    
    # Test pip
    if python3 -m pip --version; then
        print_success "pip is working via python3 -m pip"
    elif pip3 --version; then
        print_success "pip3 command is working"
    elif pip --version; then
        print_success "pip command is working"
    else
        print_error "No working pip installation found"
        return 1
    fi
    
    # Test virtual environment
    print_status "Testing virtual environment creation..."
    if python3 -m venv /tmp/test_venv; then
        print_success "Virtual environment creation works"
        rm -rf /tmp/test_venv
    else
        print_error "Virtual environment creation failed"
        return 1
    fi
    
    return 0
}

# Fix virtual environment issues
fix_venv_issues() {
    print_status "Fixing virtual environment issues..."
    
    # Install python3-venv if not present
    apt install -y python3-venv python3-pip
    
    # If still having issues, install ensurepip
    python3 -m ensurepip --upgrade 2>/dev/null || true
    
    print_success "Virtual environment setup fixed"
}

# Main function
main() {
    echo "=================================="
    echo "SPMS Python Issues Fix Script"
    echo "=================================="
    echo
    
    check_root
    
    print_status "Diagnosing Python installation issues..."
    
    # Try to identify the issue
    if ! python3 --version &>/dev/null; then
        print_error "Python 3 is not installed or not working"
        print_error "Please install Python 3 first: apt install python3"
        exit 1
    fi
    
    if ! python3 -m pip --version &>/dev/null && ! pip3 --version &>/dev/null; then
        print_warning "pip is not working properly"
        fix_pip_installation
    fi
    
    if ! python3 -c "import distutils" 2>/dev/null; then
        print_warning "distutils not available"
        fix_distutils_issue
    fi
    
    if ! python3 -m venv /tmp/test_venv 2>/dev/null; then
        print_warning "Virtual environment creation failing"
        fix_venv_issues
        rm -rf /tmp/test_venv 2>/dev/null || true
    fi
    
    # Install build dependencies
    install_build_dependencies
    
    # Test everything
    if test_python_pip; then
        print_success "All Python issues have been resolved!"
        echo
        print_status "You can now run your deployment scripts"
    else
        print_error "Some issues remain. Manual intervention may be required."
        exit 1
    fi
}

main "$@"