#!/bin/bash
# SPMS GitHub-Based Deployment Script
# Commits on Windows, pulls latest on Ubuntu via SSH, reports results

# Configuration
VPS_HOST="srv988862.hstgr.cloud"
VPS_USER="root"
VPS_PATH="/var/www/spms"
LOG_FILE="deployment_$(date +%Y%m%d_%H%M%S).log"
GITHUB_REPO="https://github.com/yourusername/spms.git"  # Update this with your repo URL

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Unicode symbols for better reporting
CHECK="✅"
CROSS="❌"
ARROW="➜"
ROCKET="🚀"
GEAR="⚙️"
MONITOR="📊"
WARNING="⚠️"
INFO="ℹ️"

print_header() {
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}                    🚀 SPMS GitHub Deployment v6.0.2                    ${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Method:${NC} Windows Commit → GitHub → Ubuntu Pull → Deploy"
    echo -e "${CYAN}Target:${NC} $VPS_HOST ($VPS_PATH)"
    echo -e "${CYAN}Started:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${CYAN}Log File:${NC} $LOG_FILE"
    echo ""
}

print_step() {
    local step_num=$1
    local step_desc=$2
    echo -e "${BOLD}${PURPLE}[$step_num/9]${NC} ${GEAR} ${BOLD}$step_desc${NC}"
}

print_success() {
    echo -e "  ${CHECK} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "  ${CROSS} ${RED}$1${NC}"
}

print_warning() {
    echo -e "  ${WARNING} ${YELLOW}$1${NC}"
}

print_info() {
    echo -e "  ${ARROW} ${BLUE}$1${NC}"
}

log_command() {
    local cmd="$1"
    local desc="$2"
    echo "[$(date '+%H:%M:%S')] $desc" >> "$LOG_FILE"
    echo "[$(date '+%H:%M:%S')] Executing: $cmd" >> "$LOG_FILE"
}

# Step 1: Pre-deployment validation (Windows)
step_1_validation() {
    print_step 1 "Pre-deployment Validation (Windows)"

    # Check required files on Windows
    print_info "Checking required files on Windows development machine..."
    local missing_files=0
    local required_files=("app.py" "scheduler.py" "working_scraper.py" "requirements.txt" "teams.config")

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file found"
        else
            print_error "$file missing"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -gt 0 ]; then
        print_error "Missing $missing_files required files. Deployment aborted."
        exit 1
    fi

    # Check SSH connectivity from Windows to Ubuntu
    print_info "Testing SSH connection from Windows to Ubuntu ($VPS_HOST)..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_HOST exit 2>/dev/null; then
        print_success "SSH connection successful"
    else
        print_warning "SSH key authentication failed, will use password"
    fi

    # Check git status on Windows - ensure we can commit
    print_info "Checking git status on Windows..."
    if ! git status --porcelain >/dev/null 2>&1; then
        print_error "Not a git repository or git not available"
        exit 1
    fi

    if git status --porcelain | grep -q .; then
        print_info "Uncommitted changes detected - will commit during deployment"
        git status --porcelain | while read line; do
            print_info "  $line"
        done
    else
        print_success "Working directory clean"
    fi

    # Check if GitHub repo is configured
    if ! git remote get-url origin >/dev/null 2>&1; then
        print_error "No GitHub remote 'origin' configured"
        exit 1
    fi

    print_success "GitHub remote configured: $(git remote get-url origin)"
    echo ""
}

# Step 2: Commit and push to GitHub (Windows)
step_2_commit_push() {
    print_step 2 "Commit and Push to GitHub (Windows)"

    # Check if we have uncommitted changes
    if git status --porcelain | grep -q .; then
        print_info "Committing changes to GitHub..."

        # Add all changes
        git add .
        log_command "git add ." "Adding all changes"

        # Create commit message with timestamp
        local commit_msg="🚀 DEPLOYMENT v$(date +%Y%m%d_%H%M%S): Cross-platform deployment updates"

        git commit -m "$commit_msg

🔧 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

        if [ $? -eq 0 ]; then
            print_success "Changes committed successfully"
        else
            print_error "Git commit failed"
            exit 1
        fi
    else
        print_info "No changes to commit"
    fi

    # Push to GitHub
    print_info "Pushing to GitHub..."
    if git push origin main; then
        print_success "Code pushed to GitHub successfully"
        print_info "Latest commit: $(git log -1 --oneline)"
    else
        print_error "Git push failed"
        exit 1
    fi

    echo ""
}

# Step 3: Backup current deployment
step_3_backup() {
    print_step 3 "Creating Server Backup"

    print_info "Creating backup on Ubuntu server via SSH..."
    ssh $VPS_USER@$VPS_HOST "
        if [ -d $VPS_PATH ]; then
            sudo tar -czf /tmp/spms_backup_\$(date +%Y%m%d_%H%M%S).tar.gz -C $VPS_PATH . 2>/dev/null
            sudo chown $VPS_USER:$VPS_USER /tmp/spms_backup_*.tar.gz 2>/dev/null
            echo 'Backup created on Ubuntu server'
        fi
    " 2>/dev/null

    if [ $? -eq 0 ]; then
        print_success "Server backup created in /tmp/ on Ubuntu"
    else
        print_warning "Backup creation skipped (first deployment?)"
    fi

    echo ""
}

# Step 4: Pull latest code on Ubuntu
step_4_pull_code() {
    print_step 4 "Pulling Latest Code on Ubuntu"

    print_info "Pulling latest code from GitHub on Ubuntu server..."
    ssh $VPS_USER@$VPS_HOST "
        cd $VPS_PATH

        # Check if it's a git repository
        if [ ! -d .git ]; then
            echo 'Initializing git repository...'
            git init
            git remote add origin \$(git config --get remote.origin.url || echo 'https://github.com/yourusername/spms.git')
        fi

        # Fetch and pull latest changes
        echo 'Fetching latest changes from GitHub...'
        git fetch origin main

        # Reset to latest version (force pull)
        echo 'Resetting to latest version...'
        git reset --hard origin/main

        echo 'Latest code pulled successfully'
        echo \"Current commit: \$(git log -1 --oneline)\"
    " 2>/dev/null

    if [ $? -eq 0 ]; then
        print_success "Latest code pulled on Ubuntu server"
    else
        print_error "Failed to pull code from GitHub"
        exit 1
    fi

    echo ""
}

# Step 5: Stop services on Ubuntu
step_5_stop_services() {
    print_step 5 "Stopping Ubuntu Services"

    print_info "Stopping services on Ubuntu server via SSH..."
    ssh $VPS_USER@$VPS_HOST "
        if sudo systemctl is-active --quiet spms; then
            echo 'Stopping SPMS...'
            sudo systemctl stop spms
            sleep 2
        fi
        if sudo systemctl is-active --quiet nginx; then
            echo 'Stopping Nginx...'
            sudo systemctl stop nginx
            sleep 2
        fi
        echo 'Services stopped successfully'
    " 2>/dev/null

    print_success "Services stopped on Ubuntu server"
    echo ""
}

# Step 6: Deploy on Ubuntu
step_6_deploy() {
    print_step 6 "Deploying on Ubuntu Server"

    print_info "Running deployment on Ubuntu server via SSH..."
    ssh $VPS_USER@$VPS_HOST "
        cd $VPS_PATH

        # Update dependencies in virtual environment
        if [ -f requirements.txt ] && [ -f venv/bin/activate ]; then
            echo '📦 Updating Python dependencies...'
            source venv/bin/activate
            pip install -r requirements.txt
        fi

        # Set correct permissions for Ubuntu
        echo '🔧 Setting file permissions...'
        sudo chown -R spms:spms $VPS_PATH
        chmod 644 *.py requirements.txt 2>/dev/null || true
        chmod 600 .env 2>/dev/null || true

        # Start services
        echo '▶️ Starting services...'
        sudo systemctl start spms && echo '✅ SPMS started' || echo '❌ SPMS failed'
        sleep 3
        sudo systemctl start nginx && echo '✅ Nginx started' || echo '❌ Nginx failed'
        sleep 3

        # Test application
        if curl -f -s http://localhost:5000/ > /dev/null; then
            echo '✅ Application responding - Deployment successful!'
            echo '🌐 Dashboard available at: https://srv988862.hstgr.cloud'
        else
            echo '❌ Application not responding'
            echo '📋 Recent SPMS logs:'
            sudo journalctl -u spms -n 10 --no-pager
        fi
    "

    echo ""
}

# Step 7: Verify deployment
step_7_verify() {
    print_step 7 "Verifying Deployment"

    print_info "Checking service status..."
    local spms_status=$(ssh $VPS_USER@$VPS_HOST "sudo systemctl is-active spms 2>/dev/null")
    local nginx_status=$(ssh $VPS_USER@$VPS_HOST "sudo systemctl is-active nginx 2>/dev/null")

    if [ "$spms_status" = "active" ]; then
        print_success "SPMS service is running"
    else
        print_error "SPMS service is not running ($spms_status)"
    fi

    if [ "$nginx_status" = "active" ]; then
        print_success "Nginx service is running"
    else
        print_error "Nginx service is not running ($nginx_status)"
    fi

    print_info "Testing application response..."
    if ssh $VPS_USER@$VPS_HOST "curl -f -s http://localhost:5000/ > /dev/null 2>&1"; then
        print_success "Application responding on port 5000"
    else
        print_error "Application not responding"
        print_info "Recent logs:"
        ssh $VPS_USER@$VPS_HOST "sudo journalctl -u spms -n 5 --no-pager 2>/dev/null" | while read line; do
            echo "    $line"
        done
    fi

    echo ""
}

# Step 8: Test external access
step_8_external_test() {
    print_step 8 "Testing External Access"

    print_info "Testing HTTPS access..."
    if curl -f -s -I https://srv988862.hstgr.cloud >/dev/null 2>&1; then
        print_success "HTTPS access working"
    else
        print_warning "HTTPS access issue (may be SSL/DNS related)"
    fi

    print_info "Testing HTTP redirect..."
    if curl -f -s -I http://srv988862.hstgr.cloud >/dev/null 2>&1; then
        print_success "HTTP access working"
    else
        print_warning "HTTP access issue"
    fi

    echo ""
}

# Step 9: Cleanup and summary
step_9_cleanup() {
    print_step 9 "Cleanup & Summary"

    print_info "Cleaning up temporary files..."
    # No local deployment files to clean up (using GitHub)
    print_success "No temporary files to clean (GitHub-based deployment)"

    print_info "Cleaning up server temporary files..."
    ssh $VPS_USER@$VPS_HOST "rm -rf /tmp/spms_backup_* 2>/dev/null" 2>/dev/null
    print_success "Server temporary files cleaned"

    echo ""
    print_deployment_summary
}

print_deployment_summary() {
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${GREEN}                        🎉 DEPLOYMENT SUMMARY                        ${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Get final status
    local spms_status=$(ssh $VPS_USER@$VPS_HOST "sudo systemctl is-active spms 2>/dev/null")
    local nginx_status=$(ssh $VPS_USER@$VPS_HOST "sudo systemctl is-active nginx 2>/dev/null")
    local app_responding=$(ssh $VPS_USER@$VPS_HOST "curl -f -s http://localhost:5000/ > /dev/null 2>&1 && echo 'yes' || echo 'no'")

    if [ "$spms_status" = "active" ] && [ "$nginx_status" = "active" ] && [ "$app_responding" = "yes" ]; then
        echo -e "${BOLD}${GREEN}Status: ${CHECK} DEPLOYMENT SUCCESSFUL${NC}"
        echo -e "${CYAN}Dashboard URL:${NC} ${BOLD}https://srv988862.hstgr.cloud${NC}"
        echo -e "${CYAN}Application:${NC} ${GREEN}✅ Running${NC}"
        echo -e "${CYAN}Services:${NC} ${GREEN}✅ SPMS & Nginx Active${NC}"
    else
        echo -e "${BOLD}${RED}Status: ${CROSS} DEPLOYMENT ISSUES DETECTED${NC}"
        echo -e "${CYAN}SPMS Service:${NC} $spms_status"
        echo -e "${CYAN}Nginx Service:${NC} $nginx_status"
        echo -e "${CYAN}App Response:${NC} $app_responding"
    fi

    echo ""
    echo -e "${CYAN}Deployment completed:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${CYAN}Log file:${NC} $LOG_FILE"
    echo ""
    echo -e "${BOLD}${YELLOW}Next Steps:${NC}"
    echo -e "  ${ARROW} Test dashboard: ${BOLD}https://srv988862.hstgr.cloud${NC}"
    echo -e "  ${ARROW} Check 'Komende Wedstrijden' shows API data"
    echo -e "  ${ARROW} Check 'Apeldoornse Clubs' shows working_scraper data"
    echo -e "  ${ARROW} Verify times display correctly (14:30 vs 02:00)"
    echo ""
    echo -e "${BOLD}${YELLOW}If issues persist:${NC}"
    echo -e "  ${ARROW} SSH: ${CYAN}ssh $VPS_USER@$VPS_HOST${NC}"
    echo -e "  ${ARROW} Logs: ${CYAN}sudo journalctl -u spms -f${NC}"
    echo -e "  ${ARROW} Status: ${CYAN}sudo systemctl status spms nginx${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main execution
main() {
    # Initialize log file
    echo "SPMS Deployment Log - $(date)" > "$LOG_FILE"

    print_header

    # Confirm deployment
    echo -e "${BOLD}${YELLOW}⚠️ This will deploy SPMS via GitHub to Ubuntu production server${NC}"
    echo -e "${CYAN}Target:${NC} $VPS_HOST"
    echo -e "${CYAN}Method:${NC} Windows commit → GitHub → Ubuntu pull → Deploy"
    echo -e "${CYAN}Changes:${NC} Data separation fixes, scheduler updates, dashboard improvements"
    echo ""
    read -p "Continue with GitHub-based deployment? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi

    echo ""

    # Execute deployment steps
    step_1_validation
    step_2_commit_push
    step_3_backup
    step_4_pull_code
    step_5_stop_services
    step_6_deploy
    step_7_verify
    step_8_external_test
    step_9_cleanup
}

# Error handling
trap 'echo -e "\n${RED}${CROSS} Deployment interrupted${NC}"; exit 1' INT TERM

# Execute main function
main "$@"