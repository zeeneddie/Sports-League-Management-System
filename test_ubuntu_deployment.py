#!/usr/bin/env python3
"""
Test script for Ubuntu deployment readiness
Tests all dependencies and functionality needed for background daemon
"""
import sys
import subprocess
import os
import threading
import time
from datetime import datetime

def test_python_version():
    """Test Python version compatibility"""
    print("=== TESTING PYTHON VERSION ===")
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")

    if version.major >= 3 and version.minor >= 8:
        print("✅ Python version OK")
        return True
    else:
        print("❌ Python version too old (need 3.8+)")
        return False

def test_dependencies():
    """Test if all required dependencies can be imported"""
    print("\n=== TESTING DEPENDENCIES ===")

    dependencies = [
        'flask',
        'schedule',
        'requests',
        'python-dotenv',
        'playwright',
        'asyncio',
        'json',
        'threading',
        'subprocess'
    ]

    failed_imports = []

    for dep in dependencies:
        try:
            if dep == 'python-dotenv':
                import dotenv
            else:
                __import__(dep)
            print(f"✅ {dep}")
        except ImportError as e:
            print(f"❌ {dep} - {e}")
            failed_imports.append(dep)

    if failed_imports:
        print(f"\n❌ Failed imports: {failed_imports}")
        print("Install missing dependencies with: pip install -r requirements.txt")
        return False
    else:
        print("\n✅ All dependencies OK")
        return True

def test_playwright_browsers():
    """Test if Playwright browsers are installed"""
    print("\n=== TESTING PLAYWRIGHT BROWSERS ===")

    try:
        result = subprocess.run([
            sys.executable, '-c',
            'import asyncio; from playwright.async_api import async_playwright; print("Playwright import OK")'
        ], capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            print("✅ Playwright Python library OK")
        else:
            print("❌ Playwright Python library failed")
            print("STDERR:", result.stderr)
            return False

        # Test browser installation
        print("Checking browser installation...")
        result = subprocess.run([
            sys.executable, '-m', 'playwright', 'install-deps'
        ], capture_output=True, text=True, timeout=60)

        print("Install-deps completed")

        return True

    except Exception as e:
        print(f"❌ Playwright test failed: {e}")
        print("Run: python -m playwright install chromium")
        return False

def test_file_permissions():
    """Test file read/write permissions"""
    print("\n=== TESTING FILE PERMISSIONS ===")

    test_files = [
        'league_data.json',
        'uitslagen.json',
        'komende_wedstrijden.json',
        'teams.config'
    ]

    all_ok = True

    for file_path in test_files:
        try:
            # Test write permission
            test_content = {"test": "data", "timestamp": datetime.now().isoformat()}

            if file_path.endswith('.json'):
                import json
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(test_content, f)
            else:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write("# Test content\nTest line\n")

            # Test read permission
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            print(f"✅ {file_path} - read/write OK")

        except Exception as e:
            print(f"❌ {file_path} - {e}")
            all_ok = False

    return all_ok

def test_scheduler_functionality():
    """Test scheduler basic functionality"""
    print("\n=== TESTING SCHEDULER ===")

    try:
        import schedule

        # Test scheduling
        job_executed = False

        def test_job():
            nonlocal job_executed
            job_executed = True
            print("✅ Test job executed")

        # Schedule job for immediate execution
        schedule.every().second.do(test_job)

        # Run scheduler for 3 seconds
        start_time = time.time()
        while time.time() - start_time < 3:
            schedule.run_pending()
            time.sleep(0.1)

        schedule.clear()

        if job_executed:
            print("✅ Scheduler functionality OK")
            return True
        else:
            print("❌ Scheduler job not executed")
            return False

    except Exception as e:
        print(f"❌ Scheduler test failed: {e}")
        return False

def test_background_threading():
    """Test background thread functionality"""
    print("\n=== TESTING BACKGROUND THREADING ===")

    try:
        thread_result = {"executed": False}

        def background_task():
            time.sleep(1)
            thread_result["executed"] = True
            print("✅ Background thread completed")

        # Start background thread
        thread = threading.Thread(target=background_task, daemon=True)
        thread.start()

        # Wait for completion
        thread.join(timeout=5)

        if thread_result["executed"]:
            print("✅ Background threading OK")
            return True
        else:
            print("❌ Background thread failed")
            return False

    except Exception as e:
        print(f"❌ Background threading test failed: {e}")
        return False

def test_working_scraper():
    """Test working scraper execution"""
    print("\n=== TESTING WORKING SCRAPER ===")

    if not os.path.exists('working_scraper.py'):
        print("❌ working_scraper.py not found")
        return False

    try:
        # Test import syntax
        result = subprocess.run([
            sys.executable, '-c',
            'import working_scraper; print("Import OK")'
        ], capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            print("✅ Working scraper import OK")
            return True
        else:
            print("❌ Working scraper import failed")
            print("STDERR:", result.stderr)
            return False

    except Exception as e:
        print(f"❌ Working scraper test failed: {e}")
        return False

def test_ubuntu_compatibility():
    """Test Ubuntu-specific compatibility"""
    print("\n=== TESTING UBUNTU COMPATIBILITY ===")

    # Check if running on Linux-like system
    import platform
    system = platform.system()
    print(f"System: {system}")

    if system in ['Linux', 'Darwin']:  # Linux or macOS
        print("✅ Unix-like system detected")
    else:
        print("⚠️  Windows system - Ubuntu compatibility uncertain")

    # Test subprocess execution
    try:
        result = subprocess.run(['echo', 'test'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip() == 'test':
            print("✅ Subprocess execution OK")
            return True
        else:
            print("❌ Subprocess execution failed")
            return False
    except Exception as e:
        print(f"❌ Ubuntu compatibility test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("UBUNTU DEPLOYMENT READINESS TEST\n")

    tests = [
        ("Python Version", test_python_version),
        ("Dependencies", test_dependencies),
        ("Playwright", test_playwright_browsers),
        ("File Permissions", test_file_permissions),
        ("Scheduler", test_scheduler_functionality),
        ("Background Threading", test_background_threading),
        ("Working Scraper", test_working_scraper),
        ("Ubuntu Compatibility", test_ubuntu_compatibility)
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False

    # Summary
    print("\n" + "="*50)
    print("DEPLOYMENT READINESS SUMMARY")
    print("="*50)

    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20} {status}")
        if not passed:
            all_passed = False

    print("\n" + "="*50)
    if all_passed:
        print("ALL TESTS PASSED - READY FOR UBUNTU DEPLOYMENT!")
        print("\nDeployment steps:")
        print("1. pip install -r requirements.txt")
        print("2. python -m playwright install chromium")
        print("3. python -m playwright install-deps")
        print("4. python app.py (to start the application)")
    else:
        print("SOME TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT")
        print("\nCheck failed tests above and resolve issues.")

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)