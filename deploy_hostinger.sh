#!/bin/bash
# SPMS Deployment Script for Hostinger VPS
# This script sets up the Flask application with Nginx reverse proxy and SSL

set -e  # Exit on any error

# Configuration - CHANGE THESE VALUES
DOMAIN="srv988862.hstgr.cloud"  # Hostinger VPS domain
APP_USER="spms"          # User to run the application
APP_DIR="/var/www/spms"  # Application directory
PYTHON_VERSION="3"      # Python version

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

# Update system packages
update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated successfully"
}

# Install required packages
install_packages() {
    print_status "Installing required packages..."
    
    # Install core packages first
    apt install -y \
        python${PYTHON_VERSION} \
        python${PYTHON_VERSION}-pip \
        python${PYTHON_VERSION}-venv \
        python${PYTHON_VERSION}-dev \
        nginx \
        certbot \
        python3-certbot-nginx \
        git \
        curl \
        ufw \
        supervisor \
        dos2unix \
        build-essential \
        pkg-config
    
    # Try to install python3-distutils, but don't fail if it's not available
    print_status "Attempting to install python3-distutils (may not be needed on newer systems)..."
    apt install -y python3-distutils 2>/dev/null || {
        print_warning "python3-distutils not available - this is normal on Ubuntu 22.04+ and Debian 12+"
        print_warning "Python should work fine without it"
    }
    
    # Ensure pip is properly installed and updated
    print_status "Ensuring pip is properly installed..."
    python${PYTHON_VERSION} -m ensurepip --upgrade 2>/dev/null || true
    python${PYTHON_VERSION} -m pip install --upgrade pip setuptools wheel 2>/dev/null || true
    
    print_success "All packages installed successfully"
}

# Create application user
create_app_user() {
    print_status "Creating application user: $APP_USER"
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists"
    else
        useradd --system --shell /bin/bash --home-dir $APP_DIR --create-home $APP_USER
        print_success "User $APP_USER created successfully"
    fi
}

# Setup application directory
setup_app_directory() {
    print_status "Setting up application directory..."
    
    # Create directory structure
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/logs
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    # Set ownership
    chown -R $APP_USER:$APP_USER $APP_DIR
    
    print_success "Application directory setup complete"
}

# Fix line endings for uploaded files
fix_line_endings() {
    print_status "Converting Windows line endings to Unix..."
    
    if [ -d "$APP_DIR" ]; then
        # Convert Python files
        find $APP_DIR -name "*.py" -type f -exec dos2unix {} \;
        # Convert shell scripts
        find $APP_DIR -name "*.sh" -type f -exec dos2unix {} \;
        # Convert config files
        find $APP_DIR -name "*.conf" -type f -exec dos2unix {} \; 2>/dev/null || true
        find $APP_DIR -name "*.cfg" -type f -exec dos2unix {} \; 2>/dev/null || true
        find $APP_DIR -name ".env*" -type f -exec dos2unix {} \; 2>/dev/null || true
        # Convert text files
        find $APP_DIR -name "*.txt" -type f -exec dos2unix {} \;
        find $APP_DIR -name "*.md" -type f -exec dos2unix {} \;
        # Convert HTML and CSS files
        find $APP_DIR -name "*.html" -type f -exec dos2unix {} \;
        find $APP_DIR -name "*.css" -type f -exec dos2unix {} \;
        find $APP_DIR -name "*.js" -type f -exec dos2unix {} \;
        
        print_success "Line endings converted successfully"
    else
        print_warning "Application directory not found, skipping line ending conversion"
    fi
}

# Setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    # Reset ufw to default settings
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (important!)
    ufw allow ssh
    ufw allow 22
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    ufw allow 80
    ufw allow 443
    
    # Enable firewall
    ufw --force enable
    
    print_success "Firewall configured successfully"
}

# Create systemd service file
create_systemd_service() {
    print_status "Creating systemd service file..."
    
    cat > /etc/systemd/system/spms.service << EOF
[Unit]
Description=SPMS Flask Application
After=network.target

[Service]
Type=simple
User=spms
Group=spms
WorkingDirectory=/var/www/spms
Environment=PATH=/var/www/spms/venv/bin
Environment=FLASK_ENV=production
ExecStart=/var/www/spms/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 3 --timeout 120 app:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    print_success "Systemd service file created"
}

# Create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx configuration..."
    
    # Create initial HTTP-only configuration (SSL will be added later)
    cat > /etc/nginx/sites-available/spms << EOF
# SPMS Flask Application Nginx Configuration
# Initial HTTP-only setup - SSL will be configured by Certbot later

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias /var/www/spms/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon
    location = /favicon.ico {
        alias /var/www/spms/static/images/favicon.png;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Let's Encrypt challenge
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/html;
    }
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/spms /etc/nginx/sites-enabled/
    
    # Remove default nginx site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create web root for Let's Encrypt challenges
    mkdir -p /var/www/html
    
    # Test nginx configuration
    if nginx -t; then
        print_success "Nginx configuration created and enabled"
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

# Create deployment helper script
create_deploy_script() {
    print_status "Creating deployment helper script..."
    
    cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash
# SPMS Application Deployment Script

APP_DIR="/var/www/spms"
BACKUP_DIR="/var/www/spms/backups"
DATE=$(date +%Y%m%d_%H%M%S)

print_status() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Create backup
create_backup() {
    print_status "Creating backup..."
    mkdir -p $BACKUP_DIR
    tar -czf $BACKUP_DIR/spms_backup_$DATE.tar.gz -C $APP_DIR --exclude=backups --exclude=venv --exclude=.git .
    print_success "Backup created: $BACKUP_DIR/spms_backup_$DATE.tar.gz"
}

# Update application
update_app() {
    print_status "Updating application..."
    cd $APP_DIR
    
    # Pull latest code (if using git)
    if [ -d .git ]; then
        git pull origin main
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install/update dependencies
    pip install -r requirements.txt
    
    print_success "Application updated"
}

# Restart services
restart_services() {
    print_status "Restarting services..."
    
    # Restart application
    sudo systemctl restart spms
    
    # Reload nginx
    sudo systemctl reload nginx
    
    print_success "Services restarted"
}

# Check service status
check_status() {
    print_status "Checking service status..."
    
    echo "SPMS Service Status:"
    sudo systemctl status spms --no-pager -l
    
    echo -e "\nNginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo -e "\nApplication Health Check:"
    curl -s http://localhost:5000/ > /dev/null && echo "✅ Application is responding" || echo "❌ Application is not responding"
}

# Main deployment function
main() {
    echo "SPMS Deployment Script"
    echo "====================="
    
    case "${1:-deploy}" in
        "backup")
            create_backup
            ;;
        "update")
            update_app
            restart_services
            ;;
        "deploy")
            create_backup
            update_app
            restart_services
            check_status
            ;;
        "status")
            check_status
            ;;
        *)
            echo "Usage: $0 {backup|update|deploy|status}"
            echo "  backup - Create backup only"
            echo "  update - Update app and restart services"
            echo "  deploy - Full deployment (backup + update + restart)"
            echo "  status - Check service status"
            ;;
    esac
}

main "$@"
EOF
    
    chmod +x $APP_DIR/deploy.sh
    chown $APP_USER:$APP_USER $APP_DIR/deploy.sh
    
    print_success "Deployment script created"
}

# Create production environment file template
create_production_env() {
    print_status "Creating production environment template..."
    
    cat > $APP_DIR/.env.template << EOF
# SPMS Production Environment Configuration
# Copy this file to .env and update the values

# Flask Configuration
SECRET_KEY=your_very_secure_secret_key_change_this
FLASK_ENV=production

# Application Configuration
USE_TEST_DATA=false
SCREEN_DURATION_SECONDS=12

# SSL Configuration (handled by Nginx)
USE_SSL=false
HTTP_PORT=5000

# API Configuration
HOLLANDSE_VELDEN_API_KEY=your_api_key_here

# Domain Configuration
DOMAIN=$DOMAIN

# Featured Team Configuration
FEATURED_TEAM=AVV Columbia
FEATURED_TEAM_KEY=columbia
EOF
    
    chown $APP_USER:$APP_USER $APP_DIR/.env.template
    
    print_success "Production environment template created"
}

# Main deployment function
main() {
    echo "======================================"
    echo "SPMS Hostinger VPS Deployment Script"
    echo "======================================"
    echo
    
    print_warning "IMPORTANT: Make sure you have:"
    print_warning "1. Updated DOMAIN variable in this script"
    print_warning "2. Your domain's DNS pointing to this server"
    print_warning "3. Uploaded your Flask application files"
    echo
    
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
    
    check_root
    update_system
    install_packages
    create_app_user
    setup_app_directory
    fix_line_endings
    setup_firewall
    create_systemd_service
    create_nginx_config
    create_deploy_script
    create_production_env
    
    print_success "Base system setup complete!"
    echo
    print_status "Next steps:"
    echo "1. Upload your Flask application files to: $APP_DIR"
    echo "2. Copy .env.template to .env and configure it"
    echo "3. Create Python virtual environment and install dependencies"
    echo "4. Obtain SSL certificate with: certbot --nginx -d $DOMAIN"
    echo "5. Start the application: systemctl enable spms && systemctl start spms"
    echo
    print_warning "Run the post-installation script after uploading your files!"
}

main "$@"