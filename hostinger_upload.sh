#!/bin/bash
# SPMS File Upload Script for Hostinger VPS
# This script helps upload your application files to your Hostinger VPS

# Configuration - UPDATE THESE VALUES
VPS_HOST="srv988862.hstgr.cloud"      # Hostinger VPS hostname
VPS_USER="root"                        # SSH user (root for initial setup)
VPS_PATH="/var/www/spms"               # Destination path on VPS
LOCAL_PATH="."                         # Local application path

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

# Files to upload (relative to current directory)
FILES_TO_UPLOAD=(
    "app.py"
    "config.py"
    "scheduler.py"
    "hollandsevelden.py"
    "working_scraper.py"
    "overige_scraper.py"
    "wsgi.py"
    "gunicorn.conf.py"
    "requirements.txt"
    "templates/"
    "static/"
    ".env.template"
    "deploy_hostinger.sh"
    "post_deploy_hostinger.sh"
    "CLAUDE.md"
    "teams.config"
)

# Optional files (upload if they exist)
OPTIONAL_FILES=(
    ".env"
    "league_data.json"
)

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if rsync is available
    if ! command -v rsync &> /dev/null; then
        print_error "rsync is not installed. Please install it first."
        echo "Ubuntu/Debian: sudo apt install rsync"
        echo "macOS: brew install rsync"
        echo "Windows: Install WSL or use scp instead"
        exit 1
    fi
    
    # Check if SSH key exists or ask for password
    if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
        print_warning "No SSH key found. You'll be prompted for password."
        print_warning "Consider setting up SSH key authentication for easier deployment."
    fi
    
    print_success "Prerequisites check passed"
}

test_connection() {
    print_status "Testing connection to $VPS_HOST..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_HOST exit 2>/dev/null; then
        print_success "SSH connection test passed"
        return 0
    else
        print_warning "SSH key authentication failed, will try password authentication"
        return 1
    fi
}

stop_services() {
    print_status "Stopping services on Ubuntu server..."

    ssh $VPS_USER@$VPS_HOST "
        # Check if services exist and stop them gracefully
        if sudo systemctl is-active --quiet spms; then
            echo 'Stopping SPMS service...'
            sudo systemctl stop spms
            sleep 2
        fi

        if sudo systemctl is-active --quiet nginx; then
            echo 'Stopping Nginx service...'
            sudo systemctl stop nginx
            sleep 2
        fi

        echo 'Services stopped successfully on Ubuntu server'
    "

    print_success "Services stopped"
}

upload_files() {
    print_status "Uploading application files to $VPS_HOST:$VPS_PATH..."

    # Create remote directory
    ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

    # Upload required files
    for file in "${FILES_TO_UPLOAD[@]}"; do
        if [ -e "$LOCAL_PATH/$file" ]; then
            print_status "Uploading $file..."
            if [ -d "$LOCAL_PATH/$file" ]; then
                # Directory
                rsync -avz --progress "$LOCAL_PATH/$file" $VPS_USER@$VPS_HOST:$VPS_PATH/
            else
                # File
                rsync -avz --progress "$LOCAL_PATH/$file" $VPS_USER@$VPS_HOST:$VPS_PATH/
            fi
        else
            print_error "Required file not found: $file"
            exit 1
        fi
    done

    # Upload optional files
    for file in "${OPTIONAL_FILES[@]}"; do
        if [ -e "$LOCAL_PATH/$file" ]; then
            print_status "Uploading optional file: $file..."
            rsync -avz --progress "$LOCAL_PATH/$file" $VPS_USER@$VPS_HOST:$VPS_PATH/
        else
            print_warning "Optional file not found (skipping): $file"
        fi
    done

    print_success "File upload completed"
}

restart_services() {
    print_status "Restarting services on Ubuntu server..."

    ssh $VPS_USER@$VPS_HOST "
        # Change to app directory
        cd $VPS_PATH

        # Set correct ownership for all files
        sudo chown -R spms:spms $VPS_PATH

        # Update dependencies if requirements.txt changed
        if [ -f requirements.txt ]; then
            echo 'Updating Python dependencies...'
            if [ -f venv/bin/activate ]; then
                source venv/bin/activate
                pip install -r requirements.txt
                echo 'Dependencies updated successfully'
            else
                echo 'Warning: Virtual environment not found at venv/bin/activate'
            fi
        fi

        # Restart services with sudo
        echo 'Starting SPMS service...'
        sudo systemctl start spms
        sleep 3

        echo 'Starting Nginx service...'
        sudo systemctl start nginx
        sleep 2

        # Check service status
        echo 'Checking service status...'
        if sudo systemctl is-active --quiet spms; then
            echo '✓ SPMS service is running'
        else
            echo '✗ SPMS service failed to start'
            sudo systemctl status spms --no-pager -l
            echo 'Recent SPMS logs:'
            sudo journalctl -u spms -n 10 --no-pager
        fi

        if sudo systemctl is-active --quiet nginx; then
            echo '✓ Nginx service is running'
        else
            echo '✗ Nginx service failed to start'
            sudo systemctl status nginx --no-pager -l
        fi

        # Test application response
        echo 'Testing application response...'
        sleep 5
        if curl -f -s http://localhost:5000/ > /dev/null; then
            echo '✓ Application is responding on port 5000'
            echo '✓ Dashboard should be available at: https://srv988862.hstgr.cloud'
        else
            echo '✗ Application is not responding'
            echo 'Checking application logs:'
            sudo journalctl -u spms -n 15 --no-pager
        fi
    "

    print_success "Services restarted"
}

set_permissions() {
    print_status "Setting file permissions on Ubuntu server..."

    ssh $VPS_USER@$VPS_HOST "
        # Set executable permissions for scripts
        sudo chmod +x $VPS_PATH/deploy_hostinger.sh 2>/dev/null || true
        sudo chmod +x $VPS_PATH/post_deploy_hostinger.sh 2>/dev/null || true

        # Set correct permissions for Python files
        sudo chmod 644 $VPS_PATH/*.py 2>/dev/null || true
        sudo chmod 644 $VPS_PATH/requirements.txt 2>/dev/null || true
        sudo chmod 644 $VPS_PATH/teams.config 2>/dev/null || true

        # Set secure permissions for environment files
        if [ -f $VPS_PATH/.env ]; then
            sudo chmod 600 $VPS_PATH/.env
            echo 'Set secure permissions for .env file'
        fi

        if [ -f $VPS_PATH/.env.template ]; then
            sudo chmod 644 $VPS_PATH/.env.template
        fi

        # Set ownership to spms user
        sudo chown -R spms:spms $VPS_PATH

        echo 'File permissions set for Ubuntu server'
    "

    print_success "Permissions set successfully"
}

show_next_steps() {
    echo
    print_success "Deployment completed successfully!"
    echo
    print_status "Services have been automatically restarted on your server."
    echo
    print_status "You can verify the deployment by:"
    echo "1. Check service status: ssh $VPS_USER@$VPS_HOST 'systemctl status spms nginx'"
    echo "2. View application logs: ssh $VPS_USER@$VPS_HOST 'journalctl -u spms -f'"
    echo "3. Test the application: https://srv988862.hstgr.cloud"
    echo
    print_status "If there are any issues:"
    echo "1. SSH to your server: ssh $VPS_USER@$VPS_HOST"
    echo "2. Check logs: cd $VPS_PATH && journalctl -u spms -n 50"
    echo "3. Manual restart: systemctl restart spms nginx"
    echo "4. Test manually: cd $VPS_PATH && source venv/bin/activate && python app.py"
    echo
    print_warning "Important notes:"
    echo "• Working scraper dependencies (Playwright) should still be functional"
    echo "• Scheduler.py changes for data separation are now active"
    echo "• Dashboard should show separated data sources correctly"
}

# Backup function
create_backup() {
    print_status "Creating backup of current deployment..."

    ssh $VPS_USER@$VPS_HOST "
        if [ -d $VPS_PATH ]; then
            sudo tar -czf /tmp/spms_backup_\$(date +%Y%m%d_%H%M%S).tar.gz -C $VPS_PATH .
            sudo chown $VPS_USER:$VPS_USER /tmp/spms_backup_*.tar.gz
            echo 'Backup created in /tmp/ on Ubuntu server'
        fi
    "

    print_success "Backup created"
}

# Main function
main() {
    echo "========================================"
    echo "SPMS Hostinger VPS Upload Script"
    echo "========================================"
    echo
    
    print_warning "IMPORTANT: Make sure you have updated the configuration at the top of this script:"
    print_warning "• VPS_HOST: Your server IP or hostname"
    print_warning "• VPS_USER: SSH username (usually root)"
    print_warning "• VPS_PATH: Destination path on server"
    echo
    
    read -p "Continue with upload? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Upload cancelled"
        exit 1
    fi
    
    check_prerequisites
    test_connection

    # Ask if backup should be created
    read -p "Create backup of existing deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_backup
    fi

    # Stop services first
    stop_services

    # Upload files
    upload_files
    set_permissions

    # Restart services
    restart_services

    show_next_steps
}

main "$@"