#!/usr/bin/env python3
"""
SSL Certificate Generator for SPMS Flask Application
Generates self-signed SSL certificates for development/testing
"""

import os
import subprocess
import sys
from pathlib import Path

def create_ssl_directory():
    """Create SSL directory if it doesn't exist"""
    ssl_dir = Path("ssl")
    ssl_dir.mkdir(exist_ok=True)
    return ssl_dir

def generate_self_signed_cert(ssl_dir):
    """Generate self-signed SSL certificate using OpenSSL"""
    cert_file = ssl_dir / "cert.pem"
    key_file = ssl_dir / "key.pem"
    
    # Check if certificates already exist
    if cert_file.exists() and key_file.exists():
        print(f"SSL certificates already exist in {ssl_dir}")
        return str(cert_file), str(key_file)
    
    print("Generating self-signed SSL certificate...")
    
    # OpenSSL command to generate self-signed certificate
    cmd = [
        "openssl", "req", "-x509", "-newkey", "rsa:4096", 
        "-keyout", str(key_file), "-out", str(cert_file),
        "-days", "365", "-nodes", "-subj", 
        "/C=NL/ST=Netherlands/L=Amsterdam/O=SPMS/OU=Development/CN=localhost"
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"SSL certificate generated successfully!")
        print(f"Certificate: {cert_file}")
        print(f"Private Key: {key_file}")
        return str(cert_file), str(key_file)
    except subprocess.CalledProcessError as e:
        print(f"Error generating SSL certificate: {e}")
        print("Make sure OpenSSL is installed on your system")
        return None, None
    except FileNotFoundError:
        print("OpenSSL not found. Please install OpenSSL first.")
        print("On Windows: Download from https://slproweb.com/products/Win32OpenSSL.html")
        print("On Ubuntu/Debian: sudo apt-get install openssl")
        print("On macOS: brew install openssl")
        return None, None

def update_env_file(cert_file, key_file):
    """Update .env file with SSL certificate paths"""
    env_file = Path(".env")
    
    # Read existing .env content
    env_content = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_content = f.readlines()
    
    # Remove existing SSL settings
    env_content = [line for line in env_content 
                  if not line.startswith(('SSL_CERT_PATH=', 'SSL_KEY_PATH=', 'USE_SSL='))]
    
    # Add SSL settings
    env_content.append(f"USE_SSL=true\n")
    env_content.append(f"SSL_CERT_PATH={cert_file}\n")
    env_content.append(f"SSL_KEY_PATH={key_file}\n")
    
    # Write updated .env file
    with open(env_file, 'w') as f:
        f.writelines(env_content)
    
    print(f"Updated {env_file} with SSL configuration")

def main():
    """Main function to generate SSL certificate"""
    print("SPMS SSL Certificate Generator")
    print("=" * 40)
    
    # Create SSL directory
    ssl_dir = create_ssl_directory()
    
    # Generate self-signed certificate
    cert_file, key_file = generate_self_signed_cert(ssl_dir)
    
    if cert_file and key_file:
        # Update .env file
        update_env_file(cert_file, key_file)
        
        print("\n" + "=" * 40)
        print("SSL Certificate Setup Complete!")
        print("=" * 40)
        print("Next steps:")
        print("1. Run: python app.py")
        print("2. Visit: https://localhost:5000")
        print("3. Accept the security warning in your browser")
        print("   (This is normal for self-signed certificates)")
        print("\nNote: For production, use Let's Encrypt or a commercial certificate")
    else:
        print("Failed to generate SSL certificate")
        sys.exit(1)

if __name__ == "__main__":
    main()