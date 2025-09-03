#!/usr/bin/env python3
"""
SSL Certificate Test Script for SPMS Flask Application
Tests HTTPS connectivity and certificate validity
"""

import requests
import ssl
import socket
import sys
from urllib3.exceptions import InsecureRequestWarning
from pathlib import Path

# Suppress SSL warnings for self-signed certificates
requests.urllib3.disable_warnings(InsecureRequestWarning)

def test_ssl_certificate():
    """Test if SSL certificate files exist and are valid"""
    print("Testing SSL Certificate Files...")
    print("-" * 40)
    
    cert_path = Path("ssl/cert.pem")
    key_path = Path("ssl/key.pem")
    
    if not cert_path.exists():
        print(f"❌ Certificate file not found: {cert_path}")
        return False
        
    if not key_path.exists():
        print(f"❌ Private key file not found: {key_path}")
        return False
        
    print(f"✅ Certificate file exists: {cert_path}")
    print(f"✅ Private key file exists: {key_path}")
    
    # Test certificate validity
    try:
        context = ssl.create_default_context()
        context.load_cert_chain(str(cert_path), str(key_path))
        print("✅ SSL certificate and key are valid")
        return True
    except Exception as e:
        print(f"❌ SSL certificate validation failed: {e}")
        return False

def test_https_connection(host="127.0.0.1", port=5443):
    """Test HTTPS connection to the Flask app"""
    print(f"\nTesting HTTPS Connection to {host}:{port}...")
    print("-" * 40)
    
    url = f"https://{host}:{port}"
    
    try:
        # Test with self-signed certificate (verify=False for development)
        response = requests.get(url, verify=False, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ HTTPS connection successful")
            print(f"✅ Status Code: {response.status_code}")
            
            # Check security headers
            headers_to_check = [
                'Strict-Transport-Security',
                'X-Content-Type-Options',
                'X-Frame-Options',
                'Content-Security-Policy'
            ]
            
            print("\nSecurity Headers:")
            for header in headers_to_check:
                if header in response.headers:
                    print(f"✅ {header}: {response.headers[header][:60]}...")
                else:
                    print(f"❌ {header}: Missing")
            
            return True
        else:
            print(f"❌ HTTP Status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection failed - Is the Flask app running?")
        print(f"   Start the app with: python app.py")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Connection timeout")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_http_redirect(host="127.0.0.1", http_port=5000, https_port=5443):
    """Test if HTTP redirects to HTTPS (when both are running)"""
    print(f"\nTesting HTTP to HTTPS Redirect...")
    print("-" * 40)
    
    http_url = f"http://{host}:{http_port}"
    
    try:
        # Test redirect (allow_redirects=False to see the redirect response)
        response = requests.get(http_url, allow_redirects=False, timeout=5)
        
        if response.status_code == 301:
            redirect_location = response.headers.get('Location', '')
            if redirect_location.startswith('https://'):
                print(f"✅ HTTP redirects to HTTPS")
                print(f"✅ Redirect Location: {redirect_location}")
                return True
            else:
                print(f"❌ Redirect location is not HTTPS: {redirect_location}")
                return False
        else:
            print(f"⚠️  HTTP server not configured for redirect (Status: {response.status_code})")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"⚠️  HTTP server not running on port {http_port}")
        return None
    except Exception as e:
        print(f"❌ Error testing redirect: {e}")
        return False

def test_api_endpoints(host="127.0.0.1", port=5443):
    """Test HTTPS API endpoints"""
    print(f"\nTesting HTTPS API Endpoints...")
    print("-" * 40)
    
    base_url = f"https://{host}:{port}"
    api_endpoints = [
        '/api/data',
        '/api/standings',
        '/api/period-standings'
    ]
    
    success_count = 0
    for endpoint in api_endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", verify=False, timeout=5)
            if response.status_code == 200:
                print(f"✅ {endpoint}: OK")
                success_count += 1
            else:
                print(f"❌ {endpoint}: Status {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")
    
    return success_count == len(api_endpoints)

def main():
    """Main test function"""
    print("SPMS SSL/HTTPS Test Suite")
    print("=" * 50)
    
    # Test 1: SSL Certificate Files
    cert_valid = test_ssl_certificate()
    
    # Test 2: HTTPS Connection
    https_works = test_https_connection()
    
    # Test 3: API Endpoints (only if HTTPS works)
    api_works = False
    if https_works:
        api_works = test_api_endpoints()
    
    # Test 4: HTTP Redirect (optional)
    redirect_works = test_http_redirect()
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    print(f"SSL Certificate: {'✅ PASS' if cert_valid else '❌ FAIL'}")
    print(f"HTTPS Connection: {'✅ PASS' if https_works else '❌ FAIL'}")
    print(f"API Endpoints: {'✅ PASS' if api_works else '❌ FAIL'}")
    
    if redirect_works is None:
        print(f"HTTP Redirect: ⚠️  NOT TESTED (HTTP server not running)")
    else:
        print(f"HTTP Redirect: {'✅ PASS' if redirect_works else '❌ FAIL'}")
    
    if cert_valid and https_works and api_works:
        print("\n🎉 All SSL/HTTPS tests passed!")
        print("Your Flask app is ready for HTTPS!")
        print(f"Visit: https://127.0.0.1:5443")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())