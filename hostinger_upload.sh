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
    "wsgi.py"
    "gunicorn.conf.py"
    "requirements.txt"
    "templates/"
    "static/"
    ".env.template"
    "deploy_hostinger.sh"
    "post_deploy_hostinger.sh"
    "CLAUDE.md"
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

set_permissions() {
    print_status "Setting file permissions on remote server..."
    
    ssh $VPS_USER@$VPS_HOST "
        chmod +x $VPS_PATH/deploy_hostinger.sh
        chmod +x $VPS_PATH/post_deploy_hostinger.sh
        chmod 644 $VPS_PATH/*.py
        chmod 644 $VPS_PATH/requirements.txt
        if [ -f $VPS_PATH/.env ]; then chmod 600 $VPS_PATH/.env; fi
        if [ -f $VPS_PATH/.env.template ]; then chmod 644 $VPS_PATH/.env.template; fi
    "
    
    print_success "Permissions set successfully"
}

show_next_steps() {
    echo
    print_success "Upload completed successfully!"
    echo
    print_status "Next steps on your Hostinger VPS:"
    echo "1. SSH to your server: ssh $VPS_USER@$VPS_HOST"
    echo "2. Update domain in deployment script:"
    echo "   nano $VPS_PATH/deploy_hostinger.sh"
    echo "   nano $VPS_PATH/post_deploy_hostinger.sh"
    echo "3. Run initial deployment:"
    echo "   cd $VPS_PATH && chmod +x deploy_hostinger.sh && ./deploy_hostinger.sh"
    echo "4. Configure environment:"
    echo "   cp .env.template .env && nano .env"
    echo "5. Run post-deployment setup:"
    echo "   ./post_deploy_hostinger.sh"
    echo
    print_warning "Make sure to:"
    echo "• Point your domain DNS to your VPS IP"
    echo "• Configure firewall to allow ports 80 and 443"
    echo "• Update .env file with your actual values"
}

# Backup function
create_backup() {
    print_status "Creating backup of current deployment..."
    
    ssh $VPS_USER@$VPS_HOST "
        if [ -d $VPS_PATH ]; then
            tar -czf /tmp/spms_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C $VPS_PATH .
            echo 'Backup created in /tmp/'
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
    
    upload_files
    set_permissions
    show_next_steps
}

main "$@"