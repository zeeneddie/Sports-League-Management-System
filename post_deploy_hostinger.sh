#!/bin/bash
# SPMS Post-Deployment Script for Hostinger VPS
# Run this after uploading your application files

set -e  # Exit on any error

# Configuration - MUST match deploy_hostinger.sh
DOMAIN="srv988862.hstgr.cloud"  # Hostinger VPS domain
APP_USER="spms"
APP_DIR="/var/www/spms"
PYTHON_VERSION="3"

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

# Fix line endings for uploaded files (if not done during initial setup)
fix_line_endings_post() {
    print_status "Ensuring proper Unix line endings..."
    
    cd $APP_DIR
    
    # Convert Python files
    find . -name "*.py" -type f -exec dos2unix {} \; 2>/dev/null || true
    # Convert shell scripts
    find . -name "*.sh" -type f -exec dos2unix {} \; 2>/dev/null || true
    # Convert config files
    find . -name "*.conf" -type f -exec dos2unix {} \; 2>/dev/null || true
    find . -name ".env*" -type f -exec dos2unix {} \; 2>/dev/null || true
    # Convert requirements.txt
    find . -name "requirements.txt" -type f -exec dos2unix {} \; 2>/dev/null || true
    
    # Make scripts executable
    chmod +x *.sh 2>/dev/null || true
    
    print_success "Line endings and permissions fixed"
}

# Setup Python virtual environment
setup_virtualenv() {
    print_status "Setting up Python virtual environment..."
    
    cd $APP_DIR
    
    # Check if Python 3 is available
    if ! python${PYTHON_VERSION} --version &>/dev/null; then
        print_error "Python ${PYTHON_VERSION} not found!"
        print_error "Make sure you ran the initial deployment script first"
        exit 1
    fi
    
    # Create virtual environment as app user
    sudo -u $APP_USER python${PYTHON_VERSION} -m venv venv
    
    # Activate virtual environment and install dependencies
    sudo -u $APP_USER bash -c "
        source venv/bin/activate
        python -m pip install --upgrade pip setuptools wheel
        pip install gunicorn
        pip install -r requirements.txt
    " || {
        print_error "Failed to install Python dependencies"
        print_error "This might be due to missing system packages or network issues"
        print_error "Try running: apt install build-essential python3-dev"
        exit 1
    }
    
    print_success "Virtual environment setup complete"
}

# Setup application configuration
setup_app_config() {
    print_status "Setting up application configuration..."
    
    cd $APP_DIR
    
    # Check if .env exists
    if [ ! -f .env ]; then
        if [ -f .env.template ]; then
            print_warning ".env file not found, copying from template"
            cp .env.template .env
        else
            print_error ".env file not found and no template available"
            print_error "Please create .env file manually"
            return 1
        fi
    fi
    
    # Set proper permissions
    chown $APP_USER:$APP_USER .env
    chmod 600 .env
    
    # Create logs directory
    mkdir -p logs
    chown $APP_USER:$APP_USER logs
    
    print_success "Application configuration setup complete"
}

# Test Flask application
test_flask_app() {
    print_status "Testing Flask application..."
    
    cd $APP_DIR
    
    # Test if Flask app can start
    sudo -u $APP_USER bash -c "
        source venv/bin/activate
        python -c 'from app import app; print(\"Flask app can be imported successfully\")'
    "
    
    print_success "Flask application test passed"
}

# Obtain SSL certificate
setup_ssl_certificate() {
    print_status "Setting up SSL certificate with Let's Encrypt..."
    
    print_warning "Make sure your domain ($DOMAIN) points to this server!"
    read -p "Continue with SSL certificate setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "SSL certificate setup skipped"
        print_warning "You can run this later with: certbot --nginx -d $DOMAIN"
        print_warning "Your site will be available at: http://$DOMAIN"
        return 0
    fi
    
    # Make sure Nginx is running for webroot verification
    if ! systemctl is-active --quiet nginx; then
        systemctl start nginx
        sleep 2
    fi
    
    # Test if domain resolves to this server
    print_status "Testing domain resolution..."
    if ! nslookup $DOMAIN >/dev/null 2>&1; then
        print_error "Domain $DOMAIN does not resolve properly"
        print_error "Please check your DNS settings and try again later"
        return 1
    fi
    
    # Try webroot method first (safer)
    print_status "Attempting SSL certificate with webroot method..."
    if certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos --email admin@$DOMAIN -d $DOMAIN -d www.$DOMAIN; then
        print_success "SSL certificate obtained successfully"
        
        # Update nginx config to use SSL
        print_status "Configuring Nginx for SSL..."
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos
        
        # Test nginx configuration
        if nginx -t; then
            systemctl reload nginx
            print_success "SSL certificate setup complete"
            print_success "Your site is now available at: https://$DOMAIN"
        else
            print_error "Nginx SSL configuration failed"
            return 1
        fi
    else
        print_warning "Webroot method failed, trying standalone method..."
        
        # Stop nginx temporarily for standalone verification
        systemctl stop nginx
        
        # Try standalone method
        if certbot certonly --standalone --non-interactive --agree-tos --email admin@$DOMAIN -d $DOMAIN -d www.$DOMAIN; then
            print_success "SSL certificate obtained with standalone method"
            
            # Start nginx and configure SSL
            systemctl start nginx
            certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos
            
            if nginx -t; then
                systemctl reload nginx
                print_success "SSL certificate setup complete"
                print_success "Your site is now available at: https://$DOMAIN"
            else
                print_error "Nginx SSL configuration failed"
                return 1
            fi
        else
            print_error "SSL certificate generation failed"
            print_error "Please check:"
            print_error "1. Domain DNS points to this server"
            print_error "2. Firewall allows ports 80 and 443"
            print_error "3. No other service is using port 80"
            systemctl start nginx  # Restart nginx anyway
            return 1
        fi
    fi
}

# Start and enable services
start_services() {
    print_status "Starting and enabling services..."
    
    # Enable and start SPMS service
    systemctl enable spms
    systemctl start spms
    
    # Enable and start Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    # Check service status
    sleep 3
    
    if systemctl is-active --quiet spms; then
        print_success "SPMS service is running"
    else
        print_error "SPMS service failed to start"
        systemctl status spms --no-pager -l
        return 1
    fi
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx service is running"
    else
        print_error "Nginx service failed to start"
        systemctl status nginx --no-pager -l
        return 1
    fi
}

# Setup log rotation
setup_log_rotation() {
    print_status "Setting up log rotation..."
    
    cat > /etc/logrotate.d/spms << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload spms
    endscript
}
EOF
    
    print_success "Log rotation setup complete"
}

# Setup monitoring script
setup_monitoring() {
    print_status "Setting up monitoring script..."
    
    cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash
# SPMS Application Monitoring Script

APP_DIR="/var/www/spms"
LOG_FILE="$APP_DIR/logs/monitor.log"
EMAIL="admin@srv988862.hstgr.cloud"  # Monitoring email

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check if application is responding
check_app() {
    if curl -s -f http://localhost:5000/ > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if SPMS service is running
check_service() {
    if systemctl is-active --quiet spms; then
        return 0
    else
        return 1
    fi
}

# Restart application if needed
restart_app() {
    log_message "Restarting SPMS application..."
    systemctl restart spms
    sleep 10
    
    if check_app && check_service; then
        log_message "Application restarted successfully"
        return 0
    else
        log_message "Application restart failed"
        return 1
    fi
}

# Main monitoring loop
main() {
    if ! check_service; then
        log_message "SPMS service is not running"
        restart_app
    elif ! check_app; then
        log_message "Application not responding"
        restart_app
    fi
}

main "$@"
EOF
    
    chmod +x $APP_DIR/monitor.sh
    chown $APP_USER:$APP_USER $APP_DIR/monitor.sh
    
    # Add to crontab for automatic monitoring every 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh") | crontab -
    
    print_success "Monitoring script setup complete"
}

# Setup automatic backup
setup_backup() {
    print_status "Setting up automatic backup..."
    
    cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
# SPMS Automatic Backup Script

APP_DIR="/var/www/spms"
BACKUP_DIR="/var/www/spms/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/spms_auto_backup_$DATE.tar.gz -C $APP_DIR --exclude=backups --exclude=venv --exclude=.git .

# Remove old backups
find $BACKUP_DIR -name "spms_auto_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup created: spms_auto_backup_$DATE.tar.gz" >> $APP_DIR/logs/backup.log
EOF
    
    chmod +x $APP_DIR/backup.sh
    chown $APP_USER:$APP_USER $APP_DIR/backup.sh
    
    # Add to crontab for daily backup at 2 AM
    (crontab -u $APP_USER -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -u $APP_USER -
    
    print_success "Automatic backup setup complete"
}

# Perform final health check
final_health_check() {
    print_status "Performing final health check..."
    
    # Wait for services to fully start
    sleep 10
    
    # Check services
    echo "Service Status:"
    systemctl status spms --no-pager -l | head -10
    echo
    systemctl status nginx --no-pager -l | head -10
    echo
    
    # Check application response
    echo "Application Health Check:"
    if curl -s http://localhost:5000/ > /dev/null; then
        print_success "✅ Application is responding on HTTP"
    else
        print_error "❌ Application is not responding on HTTP"
    fi
    
    # Check HTTPS if SSL is setup
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        if curl -s https://$DOMAIN/ > /dev/null; then
            print_success "✅ Application is responding on HTTPS"
        else
            print_error "❌ Application is not responding on HTTPS"
        fi
    fi
    
    # Check logs
    echo
    echo "Recent application logs:"
    journalctl -u spms --no-pager -n 10
}

# Main function
main() {
    echo "========================================="
    echo "SPMS Post-Deployment Setup for Hostinger"
    echo "========================================="
    echo
    
    print_warning "Make sure you have:"
    print_warning "1. Uploaded all Flask application files to $APP_DIR"
    print_warning "2. Updated the DOMAIN variable in this script"
    print_warning "3. Configured the .env file"
    echo
    
    read -p "Continue with post-deployment setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Post-deployment setup cancelled"
        exit 1
    fi
    
    check_root
    
    # Check if application files exist
    if [ ! -f "$APP_DIR/app.py" ]; then
        print_error "Flask application files not found in $APP_DIR"
        print_error "Please upload your application files first"
        exit 1
    fi
    
    fix_line_endings_post
    setup_virtualenv
    setup_app_config
    test_flask_app
    start_services
    setup_log_rotation
    setup_monitoring
    setup_backup
    
    # Optional SSL setup
    setup_ssl_certificate
    
    final_health_check
    
    echo
    print_success "🎉 Post-deployment setup complete!"
    echo
    print_status "Your application should now be accessible at:"
    echo "  HTTP:  http://$DOMAIN"
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        echo "  HTTPS: https://$DOMAIN"
    fi
    echo
    print_status "Useful commands:"
    echo "  Check status: systemctl status spms"
    echo "  View logs:    journalctl -u spms -f"
    echo "  Deploy:       $APP_DIR/deploy.sh"
    echo "  Monitor:      $APP_DIR/monitor.sh"
    echo
    print_warning "Don't forget to:"
    echo "1. Configure your .env file with proper API keys"
    echo "2. Test your application thoroughly"
    echo "3. Setup domain DNS if not done already"
    echo "4. Configure monitoring alerts"
}

main "$@"