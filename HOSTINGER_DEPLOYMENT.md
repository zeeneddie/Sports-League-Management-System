# SPMS Hostinger VPS Deployment Guide

Complete guide for deploying SPMS Flask application on Hostinger VPS with HTTPS/SSL support.

## 📋 Prerequisites

### Local Requirements
- Git or file transfer method
- SSH client
- Domain name pointing to your VPS IP

### VPS Requirements
- Hostinger VPS with Ubuntu 20.04+ or Debian 11+
- Root/sudo access
- Minimum 1GB RAM, 1 CPU core
- 10GB+ storage space

## 🚀 Deployment Steps

### Step 1: Prepare Your Files

1. **Update configuration files:**
   ```bash
   # Edit deploy_hostinger.sh
   nano deploy_hostinger.sh
   # Change DOMAIN="srv988862.hstgr.cloud" to your actual domain
   
   # Edit post_deploy_hostinger.sh  
   nano post_deploy_hostinger.sh
   # Change DOMAIN="srv988862.hstgr.cloud" to your actual domain
   
   # Edit hostinger_upload.sh
   nano hostinger_upload.sh
   # Change VPS_HOST="your-server-ip" to your actual VPS IP
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x deploy_hostinger.sh
   chmod +x post_deploy_hostinger.sh
   chmod +x hostinger_upload.sh
   ```

### Step 2: Upload Files to VPS

**Option A: Using the upload script (recommended)**
```bash
./hostinger_upload.sh
```

**Option B: Manual upload with scp**
```bash
scp -r . root@your-vps-ip:/var/www/spms/
```

**Option C: Using Git**
```bash
# On your VPS
git clone https://github.com/your-username/spms.git /var/www/spms
```

### Step 3: Initial VPS Setup

1. **SSH to your VPS:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Run the deployment script:**
   ```bash
   cd /var/www/spms
   ./deploy_hostinger.sh
   ```

**If you encounter the python3-distutils error:**
```bash
# Run the fix script first
sudo ./fix_python_issues.sh

# Then continue with deployment
./deploy_hostinger.sh
```

This script will:
- Update system packages
- Install Python, Nginx, Certbot, and dependencies
- Create application user and directories
- Configure firewall (UFW)
- Create systemd service
- Setup Nginx reverse proxy configuration

### Step 4: Configure Environment

1. **Setup environment file:**
   ```bash
   cd /var/www/spms
   cp .env.template .env
   nano .env
   ```

2. **Update .env with your values:**
   ```bash
   SECRET_KEY=your_very_secure_secret_key_here
   USE_TEST_DATA=false
   SCREEN_DURATION_SECONDS=12
   USE_SSL=false  # Nginx handles SSL
   HTTP_PORT=5000
   HOLLANDSE_VELDEN_API_KEY=your_api_key_here
   DOMAIN=srv988862.hstgr.cloud
   FEATURED_TEAM=AVV Columbia
   FEATURED_TEAM_KEY=columbia
   ```

### Step 5: Complete Setup

**Run the post-deployment script:**
```bash
./post_deploy_hostinger.sh
```

This script will:
- Setup Python virtual environment
- Install application dependencies
- Install and configure Playwright browsers for working_scraper
- Test Flask application
- Setup SSL certificate with Let's Encrypt
- Start and enable services
- Configure log rotation and monitoring
- Setup automatic backups

## 🔒 SSL/HTTPS Configuration

### Automatic SSL Setup
The post-deployment script will automatically:
1. Stop Nginx temporarily
2. Obtain Let's Encrypt certificate using Certbot
3. Configure Nginx for SSL
4. Start services with HTTPS enabled

### Manual SSL Setup (if needed)
```bash
# Stop Nginx
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d srv988862.hstgr.cloud -d www.srv988862.hstgr.cloud

# Configure Nginx for SSL
sudo certbot --nginx -d srv988862.hstgr.cloud

# Start Nginx
sudo systemctl start nginx
```

## 🔧 Service Management

### Start/Stop/Restart Services
```bash
# SPMS Flask Application
sudo systemctl start spms
sudo systemctl stop spms
sudo systemctl restart spms
sudo systemctl status spms

# Nginx
sudo systemctl start nginx
sudo systemctl stop nginx  
sudo systemctl restart nginx
sudo systemctl status nginx
```

### View Logs
```bash
# Application logs
sudo journalctl -u spms -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application-specific logs
tail -f /var/www/spms/logs/access.log
tail -f /var/www/spms/logs/error.log
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Manual health check
curl -I http://localhost:5000/
curl -I https://srv988862.hstgr.cloud/

# Using the monitoring script
/var/www/spms/monitor.sh
```

### Deployment Updates
```bash
# Using the deployment script
/var/www/spms/deploy.sh

# Manual deployment steps
cd /var/www/spms
git pull origin main  # if using git
source venv/bin/activate
pip install -r requirements.txt

# If Playwright was updated, reinstall browsers
playwright install chromium
playwright install-deps

sudo systemctl restart spms
sudo systemctl reload nginx
```

### Backups
```bash
# Manual backup
/var/www/spms/backup.sh

# Automatic backups run daily at 2 AM
# View backup logs
cat /var/www/spms/logs/backup.log
```

## 🌐 DNS Configuration

Point your domain to your VPS IP address:

```
A Record: srv988862.hstgr.cloud → your.vps.ip.address
A Record: www.srv988862.hstgr.cloud → your.vps.ip.address
```

## 🔥 Firewall Configuration

The deployment script automatically configures UFW:

```bash
# Check firewall status
sudo ufw status

# Allowed ports:
# 22 (SSH)
# 80 (HTTP)
# 443 (HTTPS)
```

## 🚨 Troubleshooting

### Common Issues

**1. Application not starting:**
```bash
# Check service status
sudo systemctl status spms

# Check logs
sudo journalctl -u spms -n 50
```

**2. 502 Bad Gateway (Nginx can't reach Flask):**
```bash
# Check if Flask is running
sudo systemctl status spms
curl http://localhost:5000/

# Check Nginx configuration
sudo nginx -t
```

**3. SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

**4. Permission issues:**
```bash
# Fix ownership
sudo chown -R spms:spms /var/www/spms
sudo chmod +x /var/www/spms/*.sh
```

**5. Working scraper (Playwright) issues:**
```bash
# Check if Playwright is installed
source /var/www/spms/venv/bin/activate
python -c "from playwright.async_api import async_playwright; print('Playwright OK')"

# Reinstall Playwright if needed
pip install playwright==1.46.0
playwright install chromium
playwright install-deps

# Test working scraper manually
cd /var/www/spms
source venv/bin/activate
timeout 30s python working_scraper.py

# Check teams.config file exists
ls -la teams.config
```

### Debug Mode

**Enable debug logging:**
```bash
# Edit gunicorn config
sudo nano /var/www/spms/gunicorn.conf.py
# Change: loglevel = "debug"

# Restart service
sudo systemctl restart spms
```

## 📈 Performance Optimization

### Nginx Optimizations
The Nginx configuration includes:
- Gzip compression
- Static file caching
- Security headers
- Rate limiting (can be added)

### Application Optimizations
- Gunicorn with multiple workers
- Request/response buffering
- Log rotation
- Process monitoring

## 🔐 Security Features

### Implemented Security
- UFW firewall configuration
- SSL/TLS encryption (Let's Encrypt)
- Security headers (HSTS, CSP, etc.)
- Process isolation (dedicated user)
- Log rotation and monitoring

### Additional Security (Recommended)
```bash
# Install fail2ban for SSH protection
sudo apt install fail2ban

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## 📞 Support

If you encounter issues:

1. Check the logs first
2. Verify DNS configuration
3. Test SSL certificate
4. Check firewall settings
5. Verify service status

**Useful Commands:**
```bash
# Complete system check
/var/www/spms/deploy.sh status

# View all logs
sudo journalctl -u spms -u nginx -f

# Test configuration
sudo nginx -t
python /var/www/spms/app.py  # (as spms user)
```

---

## 📝 Summary

Your SPMS application will be accessible at:
- **HTTP**: `http://srv988862.hstgr.cloud` (redirects to HTTPS)
- **HTTPS**: `https://srv988862.hstgr.cloud` (primary)

The deployment includes:
- ✅ Nginx reverse proxy with SSL termination
- ✅ Let's Encrypt automatic SSL certificates
- ✅ Systemd service management
- ✅ Automatic monitoring and restarts
- ✅ Daily backups
- ✅ Log rotation
- ✅ Security hardening
- ✅ Performance optimization