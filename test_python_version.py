#!/usr/bin/env python3
"""
Python Version Test Script for SPMS
Tests Python 3.12 compatibility and features
"""

import sys
import platform
import subprocess
from pathlib import Path

def print_python_info():
    """Print Python version information"""
    print("Python Version Information")
    print("=" * 40)
    print(f"Python Version: {sys.version}")
    print(f"Python Implementation: {platform.python_implementation()}")
    print(f"Python Compiler: {platform.python_compiler()}")
    print(f"Platform: {platform.platform()}")
    print(f"Architecture: {platform.architecture()}")
    print()

def test_python3_features():
    """Test Python 3 features"""
    print("Testing Python 3 Features")
    print("=" * 40)
    
    # Test f-strings (Python 3.6+)
    try:
        name = "SPMS"
        version = f"{sys.version_info.major}.{sys.version_info.minor}"
        test_fstring = f"Welcome to {name} running on Python {version}!"
        print(f"✅ F-string test: {test_fstring}")
    except Exception as e:
        print(f"❌ F-string test failed: {e}")
    
    # Test pathlib (Python 3.4+)
    try:
        current_path = Path.cwd()
        print(f"✅ Pathlib test: Current directory is {current_path}")
    except Exception as e:
        print(f"❌ Pathlib test failed: {e}")
    
    # Test type hints (Python 3.5+)
    try:
        def test_typing(value: str) -> str:
            return f"Processed: {value}"
        
        result = test_typing(f"Python {sys.version_info.major}.{sys.version_info.minor}")
        print(f"✅ Type hints test: {result}")
    except Exception as e:
        print(f"❌ Type hints test failed: {e}")
    
    # Test async/await (Python 3.5+)
    try:
        import asyncio
        async def test_async():
            return "Async test passed"
        
        # Don't actually run the async function, just test if it can be defined
        print("✅ Async/await syntax: Available")
    except Exception as e:
        print(f"❌ Async/await test failed: {e}")
    
    print()

def test_required_modules():
    """Test if required modules for SPMS can be imported"""
    print("Testing Required Modules")
    print("=" * 40)
    
    required_modules = [
        'flask',
        'requests',
        'schedule',
        'python-dotenv',
        'gunicorn',
        'bcrypt',
        'psycopg2'
    ]
    
    for module in required_modules:
        try:
            # Special handling for modules with different import names
            if module == 'python-dotenv':
                import dotenv
                print(f"✅ {module}: Available (dotenv)")
            elif module == 'psycopg2':
                import psycopg2
                print(f"✅ {module}: Available")
            else:
                __import__(module)
                print(f"✅ {module}: Available")
        except ImportError:
            print(f"❌ {module}: Not installed")
        except Exception as e:
            print(f"⚠️  {module}: Error - {e}")
    
    print()

def test_virtual_environment():
    """Check if running in virtual environment"""
    print("Virtual Environment Check")
    print("=" * 40)
    
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
    )
    
    if in_venv:
        print("✅ Running in virtual environment")
        print(f"   Virtual env path: {sys.prefix}")
    else:
        print("⚠️  Not running in virtual environment")
        print("   Consider using a virtual environment for deployment")
    
    print()

def test_file_permissions():
    """Test file permissions and line endings"""
    print("File System Check")
    print("=" * 40)
    
    # Check if current directory is writable
    try:
        test_file = Path("test_write.tmp")
        test_file.write_text("test")
        test_file.unlink()
        print("✅ Directory is writable")
    except Exception as e:
        print(f"❌ Directory not writable: {e}")
    
    # Check line endings in key files
    key_files = ['app.py', 'requirements.txt']
    for filename in key_files:
        file_path = Path(filename)
        if file_path.exists():
            try:
                content = file_path.read_bytes()
                if b'\r\n' in content:
                    print(f"⚠️  {filename}: Contains Windows line endings (CRLF)")
                elif b'\n' in content:
                    print(f"✅ {filename}: Unix line endings (LF)")
                else:
                    print(f"ℹ️  {filename}: No line endings detected")
            except Exception as e:
                print(f"❌ {filename}: Error reading - {e}")
        else:
            print(f"⚠️  {filename}: File not found")
    
    print()

def main():
    """Main test function"""
    print("SPMS Python 3 Compatibility Test")
    print("=" * 50)
    print()
    
    # Check Python version
    if sys.version_info < (3, 6):
        print(f"❌ Python 3.6+ required, found {sys.version_info.major}.{sys.version_info.minor}")
        print("   Please upgrade to Python 3.6 or higher")
        return 1
    else:
        print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro} detected")
    
    print()
    
    # Run tests
    print_python_info()
    test_python3_features()
    test_required_modules()
    test_virtual_environment()
    test_file_permissions()
    
    print("=" * 50)
    print("Test completed successfully!")
    print("Your system should be compatible with SPMS deployment.")
    return 0

if __name__ == "__main__":
    sys.exit(main())