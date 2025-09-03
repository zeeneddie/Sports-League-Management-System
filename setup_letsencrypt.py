#!/usr/bin/env python3
"""
Let's Encrypt SSL Certificate Setup for SPMS Flask Application
Production-ready SSL certificate setup using Certbot
"""

import os
import subprocess
import sys
from pathlib import Path

def check_certbot():
    """Check if Certbot is installed"""
    try:
        result = subprocess.run(['certbot', '--version'], capture_output=True, text=True)
        print(f"Found: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("Certbot is not installed!")
        print("\nInstallation instructions:")
        print("Ubuntu/Debian: sudo apt install certbot")
        print("CentOS/RHEL: sudo yum install certbot")
        print("Windows: Download from https://certbot.eff.org/")
        print("macOS: brew install certbot")
        return False

def get_domain():
    """Get domain name from user"""
    domain = input("Enter your domain name (e.g., example.com): ").strip()
    if not domain:
        print("Domain name is required!")
        sys.exit(1)
    return domain

def get_email():
    """Get email address from user"""
    email = input("Enter your email address for Let's Encrypt notifications: ").strip()
    if not email or '@' not in email:
        print("Valid email address is required!")
        sys.exit(1)
    return email

def setup_letsencrypt(domain, email):
    """Setup Let's Encrypt certificate"""
    print(f"\nSetting up Let's Encrypt certificate for {domain}...")
    
    # Create certificate using standalone method
    cmd = [
        'certbot', 'certonly',
        '--standalone',
        '--non-interactive',
        '--agree-tos',
        '--email', email,
        '-d', domain
    ]
    
    try:
        print("Running Certbot...")
        print("Note: Make sure port 80 is available and your domain points to this server")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("Certificate generated successfully!")
        
        # Certificate paths
        cert_path = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
        key_path = f"/etc/letsencrypt/live/{domain}/privkey.pem"
        
        return cert_path, key_path
        
    except subprocess.CalledProcessError as e:
        print(f"Error generating certificate: {e}")
        print(f"Certbot output: {e.stderr}")
        return None, None

def update_env_for_production(domain, cert_path, key_path):
    """Update .env file for production SSL"""
    env_file = Path(".env")
    
    # Read existing .env content
    env_content = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_content = f.readlines()
    
    # Remove existing SSL settings
    env_content = [line for line in env_content 
                  if not line.startswith(('SSL_CERT_PATH=', 'SSL_KEY_PATH=', 'USE_SSL='))]
    
    # Add production SSL settings
    env_content.append(f"USE_SSL=true\n")
    env_content.append(f"SSL_CERT_PATH={cert_path}\n")
    env_content.append(f"SSL_KEY_PATH={key_path}\n")
    env_content.append(f"DOMAIN={domain}\n")
    
    # Write updated .env file
    with open(env_file, 'w') as f:
        f.writelines(env_content)
    
    print(f"Updated {env_file} with production SSL configuration")

def setup_auto_renewal():
    """Setup automatic certificate renewal"""
    print("\nSetting up automatic certificate renewal...")
    
    # Check if renewal works
    try:
        subprocess.run(['certbot', 'renew', '--dry-run'], check=True, capture_output=True)
        print("Certificate renewal test successful!")
        
        print("\nTo setup automatic renewal, add this to your crontab:")
        print("0 12 * * * /usr/bin/certbot renew --quiet")
        print("\nRun: sudo crontab -e")
        
    except subprocess.CalledProcessError as e:
        print(f"Certificate renewal test failed: {e}")

def main():
    """Main function for Let's Encrypt setup"""
    print("SPMS Let's Encrypt SSL Certificate Setup")
    print("=" * 50)
    print("This script will setup a production SSL certificate using Let's Encrypt")
    print("Make sure:")
    print("1. Your domain points to this server")
    print("2. Port 80 is available (for domain validation)")
    print("3. You have sudo privileges")
    print()
    
    # Check if certbot is installed
    if not check_certbot():
        sys.exit(1)
    
    # Get domain and email
    domain = get_domain()
    email = get_email()
    
    # Setup Let's Encrypt
    cert_path, key_path = setup_letsencrypt(domain, email)
    
    if cert_path and key_path:
        # Update .env file
        update_env_for_production(domain, cert_path, key_path)
        
        # Setup auto-renewal
        setup_auto_renewal()
        
        print("\n" + "=" * 50)
        print("Let's Encrypt SSL Setup Complete!")
        print("=" * 50)
        print(f"Domain: {domain}")
        print(f"Certificate: {cert_path}")
        print(f"Private Key: {key_path}")
        print("\nNext steps:")
        print("1. Run: python app.py")
        print(f"2. Visit: https://{domain}:5443")
        print("3. Setup automatic renewal cron job (see instructions above)")
        print("\nNote: Certificates expire in 90 days and should auto-renew")
    else:
        print("Failed to generate Let's Encrypt certificate")
        sys.exit(1)

if __name__ == "__main__":
    main()