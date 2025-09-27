# SPMS GitHub-Based Deployment Script for PowerShell (Automatic Version)
# Commits on Windows, pulls latest on Ubuntu via SSH, reports results
# NOTE: This version skips user confirmation for testing purposes

param(
    [string]$VpsHost = "srv988862.hstgr.cloud",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/var/www/spms"
)

Clear-Host

Write-Host "===============================================================================" -ForegroundColor Blue
Write-Host "                    SPMS GitHub Deployment v6.0.2 (AUTO)                    " -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Blue
Write-Host "Method: Windows Commit -> GitHub -> Ubuntu Pull -> Deploy" -ForegroundColor White
Write-Host "Target: $VpsHost ($VpsPath)" -ForegroundColor White
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Mode: AUTOMATIC (No user prompts)" -ForegroundColor Yellow
Write-Host ""

# Step 1: Pre-deployment validation
Write-Host "[1/9] Pre-deployment Validation (Windows)" -ForegroundColor Magenta
Write-Host ""

# Check required files
Write-Host "Checking required files on Windows..." -ForegroundColor Blue
$RequiredFiles = @("app.py", "scheduler.py", "working_scraper.py", "requirements.txt", "teams.config")
$MissingFiles = 0

foreach ($File in $RequiredFiles) {
    if (Test-Path $File) {
        Write-Host "  [OK] $File found" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $File missing" -ForegroundColor Red
        $MissingFiles++
    }
}

if ($MissingFiles -gt 0) {
    Write-Host "[ERROR] Missing $MissingFiles required files. Deployment aborted." -ForegroundColor Red
    exit 1
}

# Check Git
Write-Host "Checking git status..." -ForegroundColor Blue
try {
    git status | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed"
    }
} catch {
    Write-Host "[ERROR] Not a git repository or git not available" -ForegroundColor Red
    exit 1
}

try {
    $GitRemote = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "No remote configured"
    }
    Write-Host "  [OK] GitHub remote configured: $GitRemote" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No GitHub remote 'origin' configured" -ForegroundColor Red
    exit 1
}

# Check SSH connectivity
Write-Host "Testing SSH connection to Ubuntu..." -ForegroundColor Blue
ssh -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsHost" exit 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] SSH connection successful" -ForegroundColor Green
} else {
    Write-Host "  [WARN] SSH key authentication failed, will use password" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Commit and push to GitHub
Write-Host "[2/9] Commit and Push to GitHub (Windows)" -ForegroundColor Magenta
Write-Host ""

# Check for uncommitted changes
$Changes = git status --porcelain
if ($Changes) {
    Write-Host "Committing changes to GitHub..." -ForegroundColor Blue

    # Add all changes
    git add .

    # Create commit message
    $CommitMsg = "AUTO-DEPLOYMENT v$(Get-Date -Format 'yyyyMMdd_HHmmss'): GitHub-based deployment test"

    git commit -m $CommitMsg

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Git commit failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Blue
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Blue
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git push failed" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Code pushed to GitHub successfully" -ForegroundColor Green
$LatestCommit = git log -1 --oneline
Write-Host "Latest commit: $LatestCommit" -ForegroundColor Blue

Write-Host ""

# AUTO-PROCEED with deployment
Write-Host "AUTO-PROCEEDING with GitHub-based deployment..." -ForegroundColor Yellow
Write-Host "Target: $VpsHost" -ForegroundColor White
Write-Host "Method: Windows commit -> GitHub -> Ubuntu pull -> Deploy" -ForegroundColor White
Write-Host ""

# Step 3: Backup current deployment
Write-Host "[3/9] Creating Server Backup (via SSH)" -ForegroundColor Magenta
Write-Host ""

ssh "$VpsUser@$VpsHost" "if [ -d $VpsPath ]; then sudo tar -czf /tmp/spms_backup_`$(date +%Y%m%d_%H%M%S).tar.gz -C $VpsPath . 2>/dev/null; sudo chown $VpsUser`:$VpsUser /tmp/spms_backup_*.tar.gz 2>/dev/null; echo 'Backup created on Ubuntu server'; fi"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Server backup created in /tmp/ on Ubuntu" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Backup creation skipped (first deployment?)" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Pull latest code on Ubuntu
Write-Host "[4/9] Pulling Latest Code on Ubuntu" -ForegroundColor Magenta
Write-Host ""

Write-Host "Pulling latest code from GitHub on Ubuntu server..." -ForegroundColor Blue
ssh "$VpsUser@$VpsHost" "cd $VpsPath && git config --global --add safe.directory $VpsPath && if [ ! -d .git ]; then echo 'Initializing git repository...'; git init; git remote add origin $GitRemote; fi && echo 'Fetching latest changes from GitHub...' && git fetch origin main && echo 'Resetting to latest version...' && git reset --hard origin/main && echo 'Latest code pulled successfully' && echo `"Current commit: `$(git log -1 --oneline)`""

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to pull code from GitHub" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Latest code pulled on Ubuntu server" -ForegroundColor Green
Write-Host ""

# Step 5: Stop services on Ubuntu
Write-Host "[5/9] Stopping Ubuntu Services" -ForegroundColor Magenta
Write-Host ""

ssh "$VpsUser@$VpsHost" "if sudo systemctl is-active --quiet spms; then echo 'Stopping SPMS...'; sudo systemctl stop spms; sleep 2; fi && if sudo systemctl is-active --quiet nginx; then echo 'Stopping Nginx...'; sudo systemctl stop nginx; sleep 2; fi && echo 'Services stopped successfully'"

Write-Host "  [OK] Services stopped on Ubuntu server" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy on Ubuntu
Write-Host "[6/9] Deploying on Ubuntu Server" -ForegroundColor Magenta
Write-Host ""

ssh "$VpsUser@$VpsHost" "cd $VpsPath && if [ -f requirements.txt ] && [ -f venv/bin/activate ]; then echo 'Updating Python dependencies...'; source venv/bin/activate; pip install -r requirements.txt; fi && echo 'Setting file permissions...' && sudo chown -R spms:spms $VpsPath && chmod 644 *.py requirements.txt 2>/dev/null || true && chmod 600 .env 2>/dev/null || true && echo 'Starting services...' && sudo systemctl start spms && echo 'SPMS started' && sleep 3 && sudo systemctl start nginx && echo 'Nginx started' && sleep 3 && if curl -f -s http://localhost:5000/ > /dev/null; then echo 'Application responding - Deployment successful!'; echo 'Dashboard available at: https://srv988862.hstgr.cloud'; else echo 'Application not responding'; echo 'Recent SPMS logs:'; sudo journalctl -u spms -n 10 --no-pager; fi"

Write-Host ""

# Step 7: Verify deployment
Write-Host "[7/9] Verifying Deployment" -ForegroundColor Magenta
Write-Host ""

ssh "$VpsUser@$VpsHost" "sudo systemctl is-active spms" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] SPMS service is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] SPMS service is not running" -ForegroundColor Red
}

ssh "$VpsUser@$VpsHost" "sudo systemctl is-active nginx" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Nginx service is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Nginx service is not running" -ForegroundColor Red
}

ssh "$VpsUser@$VpsHost" "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Application responding on port 5000" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Application not responding" -ForegroundColor Red
}

Write-Host ""

# Step 8: Test external access
Write-Host "[8/9] Testing External Access" -ForegroundColor Magenta
Write-Host ""

try {
    Invoke-WebRequest -Uri "https://srv988862.hstgr.cloud" -Method Head -TimeoutSec 10 | Out-Null
    Write-Host "  [OK] HTTPS access working" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] HTTPS access issue (may be SSL/DNS related)" -ForegroundColor Yellow
}

Write-Host ""

# Step 9: Cleanup and summary
Write-Host "[9/9] Cleanup and Summary" -ForegroundColor Magenta
Write-Host ""

ssh "$VpsUser@$VpsHost" "rm -rf /tmp/spms_backup_* 2>/dev/null"
Write-Host "  [OK] Server temporary files cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Blue
Write-Host "                        DEPLOYMENT SUMMARY                        " -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Blue

# Get final status
$SpmsStatus = ssh "$VpsUser@$VpsHost" "sudo systemctl is-active spms" 2>$null
$NginxStatus = ssh "$VpsUser@$VpsHost" "sudo systemctl is-active nginx" 2>$null
ssh "$VpsUser@$VpsHost" "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
$AppStatus = $LASTEXITCODE

if ($SpmsStatus -eq "active" -and $NginxStatus -eq "active" -and $AppStatus -eq 0) {
    Write-Host "Status: DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    Write-Host "Dashboard URL: https://srv988862.hstgr.cloud" -ForegroundColor White
    Write-Host "Application: Running" -ForegroundColor Green
    Write-Host "Services: SPMS and Nginx Active" -ForegroundColor Green
} else {
    Write-Host "Status: DEPLOYMENT ISSUES DETECTED" -ForegroundColor Red
    Write-Host "Please check service status manually" -ForegroundColor Yellow
    Write-Host "SPMS Status: $SpmsStatus" -ForegroundColor Yellow
    Write-Host "Nginx Status: $NginxStatus" -ForegroundColor Yellow
    Write-Host "App Response: $(if ($AppStatus -eq 0) { 'OK' } else { 'Failed' })" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  - Test dashboard: https://srv988862.hstgr.cloud"
Write-Host "  - Check 'Komende Wedstrijden' shows API data"
Write-Host "  - Check 'Apeldoornse Clubs' shows working_scraper data"
Write-Host "  - Verify times display correctly (14:30 vs 02:00)"
Write-Host ""
Write-Host "If issues persist:" -ForegroundColor Yellow
Write-Host "  - SSH: ssh $VpsUser@$VpsHost" -ForegroundColor Cyan
Write-Host "  - Logs: sudo journalctl -u spms -f" -ForegroundColor Cyan
Write-Host "  - Status: sudo systemctl status spms nginx" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Blue

Write-Host ""
Write-Host "AUTO-DEPLOYMENT COMPLETED!" -ForegroundColor Green