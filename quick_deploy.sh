#!/bin/bash
# SPMS Quick Deployment Script for Hostinger VPS
# This script creates a deployment package and deploys it with service management

# Configuration - UPDATE THESE VALUES
VPS_HOST="srv988862.hstgr.cloud"
VPS_USER="root"
VPS_PATH="/var/www/spms"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Critical files for deployment
DEPLOY_FILES=(
    "app.py"
    "config.py"
    "scheduler.py"
    "hollandsevelden.py"
    "working_scraper.py"
    "overige_scraper.py"
    "wsgi.py"
    "gunicorn.conf.py"
    "requirements.txt"
    "teams.config"
)

check_files() {
    print_status "Checking required files..."
    local missing_files=0

    for file in "${DEPLOY_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Missing required file: $file"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -gt 0 ]; then
        print_error "Missing $missing_files required files. Cannot proceed."
        exit 1
    fi

    print_success "All required files found"
}

create_deployment_package() {
    print_status "Creating deployment package..."

    # Create temporary deployment directory
    DEPLOY_DIR="spms_deploy_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$DEPLOY_DIR"

    # Copy files
    for file in "${DEPLOY_FILES[@]}"; do
        cp "$file" "$DEPLOY_DIR/"
    done

    # Copy directories
    if [ -d "templates" ]; then
        cp -r templates "$DEPLOY_DIR/"
    fi

    if [ -d "static" ]; then
        cp -r static "$DEPLOY_DIR/"
    fi

    # Copy .env if it exists
    if [ -f ".env" ]; then
        cp .env "$DEPLOY_DIR/"
    fi

    # Create deployment script for Ubuntu server
    cat > "$DEPLOY_DIR/deploy.sh" << 'EOF'
#!/bin/bash
# Auto-generated deployment script for Ubuntu server

echo "Starting deployment on Ubuntu server..."

# Stop services
if sudo systemctl is-active --quiet spms; then
    echo "Stopping SPMS service..."
    sudo systemctl stop spms
    sleep 2
fi

if sudo systemctl is-active --quiet nginx; then
    echo "Stopping Nginx..."
    sudo systemctl stop nginx
    sleep 2
fi

# Update dependencies in virtual environment
if [ -f requirements.txt ]; then
    echo "Updating Python dependencies..."
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
        pip install -r requirements.txt
        echo "Dependencies updated"
    else
        echo "Warning: Virtual environment not found"
    fi
fi

# Set correct permissions for Ubuntu
echo "Setting file permissions..."
sudo chown -R spms:spms /var/www/spms
chmod +x *.py
chmod 644 *.py
chmod 600 .env 2>/dev/null || true
chmod 644 requirements.txt 2>/dev/null || true

# Set correct ownership
sudo chown spms:spms /var/www/spms -R

# Start services
echo "Starting services..."
sudo systemctl start spms
sleep 3

sudo systemctl start nginx
sleep 2

# Verify services
echo "Verifying deployment..."
if sudo systemctl is-active --quiet spms && sudo systemctl is-active --quiet nginx; then
    echo "✓ Deployment successful - services running"

    # Test app response
    sleep 5
    if curl -f -s http://localhost:5000/ > /dev/null; then
        echo "✓ Application responding correctly"
        echo "✓ Dashboard available at: https://srv988862.hstgr.cloud"
    else
        echo "⚠ Application not responding - checking logs..."
        sudo journalctl -u spms -n 10 --no-pager
    fi
else
    echo "✗ Service startup failed - checking status..."
    echo "SPMS Status:"
    sudo systemctl status spms --no-pager -l
    echo "Nginx Status:"
    sudo systemctl status nginx --no-pager -l
fi
EOF

    chmod +x "$DEPLOY_DIR/deploy.sh"

    # Create archive
    tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

    print_success "Deployment package created: ${DEPLOY_DIR}.tar.gz"
    echo "DEPLOY_DIR=$DEPLOY_DIR" > .deploy_temp
}

upload_and_deploy() {
    source .deploy_temp
    local package="${DEPLOY_DIR}.tar.gz"

    print_status "Uploading and deploying to $VPS_HOST..."

    # Create backup on Ubuntu server
    ssh $VPS_USER@$VPS_HOST "
        if [ -d $VPS_PATH ]; then
            sudo tar -czf /tmp/spms_backup_\$(date +%Y%m%d_%H%M%S).tar.gz -C $VPS_PATH .
            sudo chown $VPS_USER:$VPS_USER /tmp/spms_backup_*.tar.gz
            echo 'Backup created in /tmp/'
        fi
    "

    # Upload package
    print_status "Uploading deployment package..."
    scp "$package" $VPS_USER@$VPS_HOST:/tmp/

    # Extract and deploy on Ubuntu server
    ssh $VPS_USER@$VPS_HOST "
        cd /tmp
        tar -xzf $package
        cd $DEPLOY_DIR

        # Copy files to application directory with proper permissions
        sudo cp -r * $VPS_PATH/
        sudo chown -R spms:spms $VPS_PATH

        # Run deployment script
        cd $VPS_PATH
        sudo chmod +x deploy.sh
        sudo ./deploy.sh

        # Cleanup temporary files
        rm -rf /tmp/$DEPLOY_DIR /tmp/$package
        echo 'Deployment completed and temporary files cleaned up'
    "

    print_success "Deployment completed!"
}

verify_deployment() {
    print_status "Verifying deployment on Ubuntu server..."

    # Check services and application
    ssh $VPS_USER@$VPS_HOST "
        echo 'Service Status:'
        sudo systemctl is-active spms && echo '✓ SPMS: Running' || echo '✗ SPMS: Not running'
        sudo systemctl is-active nginx && echo '✓ Nginx: Running' || echo '✗ Nginx: Not running'

        echo ''
        echo 'Testing application response:'
        if curl -f -s http://localhost:5000/ > /dev/null; then
            echo '✓ Application responding on port 5000'
        else
            echo '✗ Application not responding'
            echo 'Checking SPMS logs for errors:'
            sudo journalctl -u spms -n 10 --no-pager
        fi

        echo ''
        echo 'File permissions check:'
        ls -la $VPS_PATH | head -5

        echo ''
        echo 'Virtual environment check:'
        if [ -f $VPS_PATH/venv/bin/activate ]; then
            echo '✓ Virtual environment found'
        else
            echo '✗ Virtual environment not found'
        fi

        echo ''
        echo 'Recent application logs:'
        sudo journalctl -u spms -n 5 --no-pager
    "
}

cleanup() {
    if [ -f .deploy_temp ]; then
        source .deploy_temp
        rm -rf "$DEPLOY_DIR" "${DEPLOY_DIR}.tar.gz" .deploy_temp
        print_status "Cleaned up temporary files"
    fi
}

main() {
    echo "========================================"
    echo "SPMS Quick Deployment Script v6.0.2"
    echo "========================================"
    echo

    print_warning "This will stop services, deploy files, and restart services on $VPS_HOST"
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi

    # Set trap for cleanup
    trap cleanup EXIT

    check_files
    create_deployment_package
    upload_and_deploy
    verify_deployment

    print_success "Quick deployment completed successfully!"
    echo
    print_status "Your application should be available at: https://srv988862.hstgr.cloud"
    print_status "View logs with: ssh $VPS_USER@$VPS_HOST 'journalctl -u spms -f'"
}

main "$@"