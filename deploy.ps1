# SPMS GitHub-Based Deployment Script for PowerShell
# Commits on Windows, pulls latest on Ubuntu via SSH, reports results

param(
    [string]$VpsHost = "srv988862.hstgr.cloud",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/var/www/spms"
)

# Configuration
$LogFile = "deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Functions for colored output
function Write-Header {
    Write-Host "===============================================================================" -ForegroundColor Blue
    Write-Host "                    🚀 SPMS GitHub Deployment v6.0.2                    " -ForegroundColor Cyan
    Write-Host "===============================================================================" -ForegroundColor Blue
    Write-Host "Method: " -ForegroundColor Cyan -NoNewline
    Write-Host "Windows Commit → GitHub → Ubuntu Pull → Deploy" -ForegroundColor White
    Write-Host "Target: " -ForegroundColor Cyan -NoNewline
    Write-Host "$VpsHost ($VpsPath)" -ForegroundColor White
    Write-Host "Started: " -ForegroundColor Cyan -NoNewline
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host "Log File: " -ForegroundColor Cyan -NoNewline
    Write-Host "$LogFile" -ForegroundColor White
    Write-Host ""
}

function Write-Step {
    param([int]$StepNum, [string]$Description)
    Write-Host "[$StepNum/9] " -ForegroundColor Magenta -NoNewline
    Write-Host "⚙️ $Description" -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ " -ForegroundColor Green -NoNewline
    Write-Host "$Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ❌ " -ForegroundColor Red -NoNewline
    Write-Host "$Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠️ " -ForegroundColor Yellow -NoNewline
    Write-Host "$Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ➜ " -ForegroundColor Blue -NoNewline
    Write-Host "$Message" -ForegroundColor Blue
}

# Start logging
"SPMS Deployment Log - $(Get-Date)" | Out-File -FilePath $LogFile

Clear-Host
Write-Header

# Step 1: Pre-deployment validation
Write-Step 1 "Pre-deployment Validation (Windows)"
Write-Host ""

# Check required files
Write-Info "Checking required files on Windows..."
$RequiredFiles = @("app.py", "scheduler.py", "working_scraper.py", "requirements.txt", "teams.config")
$MissingFiles = 0

foreach ($File in $RequiredFiles) {
    if (Test-Path $File) {
        Write-Success "$File found"
    } else {
        Write-Error "$File missing"
        $MissingFiles++
    }
}

if ($MissingFiles -gt 0) {
    Write-Error "Missing $MissingFiles required files. Deployment aborted."
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Git
Write-Info "Checking git status..."
try {
    git status | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed"
    }
} catch {
    Write-Error "Not a git repository or git not available"
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    $GitRemote = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "No remote configured"
    }
    Write-Success "GitHub remote configured: $GitRemote"
} catch {
    Write-Error "No GitHub remote 'origin' configured"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check SSH connectivity
Write-Info "Testing SSH connection to Ubuntu..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsHost" exit 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "SSH connection successful"
} else {
    Write-Warning "SSH key authentication failed, will use password"
}

Write-Host ""

# Step 2: Commit and push to GitHub
Write-Step 2 "Commit and Push to GitHub (Windows)"
Write-Host ""

# Check for uncommitted changes
$Changes = git status --porcelain
if ($Changes) {
    Write-Info "Committing changes to GitHub..."

    # Add all changes
    git add .
    "git add ." | Add-Content -Path $LogFile

    # Create commit message
    $CommitMsg = "🚀 DEPLOYMENT v$(Get-Date -Format 'yyyyMMdd_HHmmss'): Cross-platform deployment updates"

    git commit -m $CommitMsg -m "" -m "Generated with Claude Code" -m "" -m "Co-Authored-By: Claude"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git commit failed"
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Success "Changes committed successfully"
} else {
    Write-Info "No changes to commit"
}

# Push to GitHub
Write-Info "Pushing to GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git push failed"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Success "Code pushed to GitHub successfully"
$LatestCommit = git log -1 --oneline
Write-Info "Latest commit: $LatestCommit"

Write-Host ""

# Confirm deployment
Write-Host "⚠️ This will deploy SPMS via GitHub to Ubuntu production server" -ForegroundColor Yellow
Write-Host "Target: " -ForegroundColor Cyan -NoNewline
Write-Host "$VpsHost" -ForegroundColor White
Write-Host "Method: " -ForegroundColor Cyan -NoNewline
Write-Host "Windows commit → GitHub → Ubuntu pull → Deploy" -ForegroundColor White
Write-Host ""

$Confirm = Read-Host "Continue with GitHub-based deployment? (y/N)"
if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Error "Deployment cancelled"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Step 3: Backup current deployment
Write-Step 3 "Creating Server Backup (via SSH)"
Write-Host ""

ssh "$VpsUser@$VpsHost" "if [ -d $VpsPath ]; then sudo tar -czf /tmp/spms_backup_`$(date +%Y%m%d_%H%M%S).tar.gz -C $VpsPath . 2>/dev/null; sudo chown $VpsUser`:$VpsUser /tmp/spms_backup_*.tar.gz 2>/dev/null; echo 'Backup created on Ubuntu server'; fi"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Server backup created in /tmp/ on Ubuntu"
} else {
    Write-Warning "Backup creation skipped (first deployment?)"
}

Write-Host ""

# Step 4: Pull latest code on Ubuntu
Write-Step 4 "Pulling Latest Code on Ubuntu"
Write-Host ""

Write-Info "Pulling latest code from GitHub on Ubuntu server..."
ssh "$VpsUser@$VpsHost" "cd $VpsPath && if [ ! -d .git ]; then echo 'Initializing git repository...'; git init; git remote add origin $GitRemote; fi && echo 'Fetching latest changes from GitHub...' && git fetch origin main && echo 'Resetting to latest version...' && git reset --hard origin/main && echo 'Latest code pulled successfully' && echo `"Current commit: `$(git log -1 --oneline)`""

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull code from GitHub"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Success "Latest code pulled on Ubuntu server"
Write-Host ""

# Step 5: Stop services on Ubuntu
Write-Step 5 "Stopping Ubuntu Services"
Write-Host ""

ssh "$VpsUser@$VpsHost" "if sudo systemctl is-active --quiet spms; then echo 'Stopping SPMS...'; sudo systemctl stop spms; sleep 2; fi && if sudo systemctl is-active --quiet nginx; then echo 'Stopping Nginx...'; sudo systemctl stop nginx; sleep 2; fi && echo 'Services stopped successfully'"

Write-Success "Services stopped on Ubuntu server"
Write-Host ""

# Step 6: Deploy on Ubuntu
Write-Step 6 "Deploying on Ubuntu Server"
Write-Host ""

ssh "$VpsUser@$VpsHost" "cd $VpsPath && if [ -f requirements.txt ] && [ -f venv/bin/activate ]; then echo '📦 Updating Python dependencies...'; source venv/bin/activate; pip install -r requirements.txt; fi && echo '🔧 Setting file permissions...' && sudo chown -R spms:spms $VpsPath && chmod 644 *.py requirements.txt 2>/dev/null || true && chmod 600 .env 2>/dev/null || true && echo '▶️ Starting services...' && sudo systemctl start spms && echo '✅ SPMS started' || echo '❌ SPMS failed' && sleep 3 && sudo systemctl start nginx && echo '✅ Nginx started' || echo '❌ Nginx failed' && sleep 3 && if curl -f -s http://localhost:5000/ > /dev/null; then echo '✅ Application responding - Deployment successful!'; echo '🌐 Dashboard available at: https://srv988862.hstgr.cloud'; else echo '❌ Application not responding'; echo '📋 Recent SPMS logs:'; sudo journalctl -u spms -n 10 --no-pager; fi"

Write-Host ""

# Step 7: Verify deployment
Write-Step 7 "Verifying Deployment"
Write-Host ""

ssh "$VpsUser@$VpsHost" "sudo systemctl is-active spms" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Success "SPMS service is running"
} else {
    Write-Error "SPMS service is not running"
}

ssh "$VpsUser@$VpsHost" "sudo systemctl is-active nginx" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Nginx service is running"
} else {
    Write-Error "Nginx service is not running"
}

ssh "$VpsUser@$VpsHost" "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Success "Application responding on port 5000"
} else {
    Write-Error "Application not responding"
}

Write-Host ""

# Step 8: Test external access
Write-Step 8 "Testing External Access"
Write-Host ""

try {
    Invoke-WebRequest -Uri "https://srv988862.hstgr.cloud" -Method Head -TimeoutSec 10 | Out-Null
    Write-Success "HTTPS access working"
} catch {
    Write-Warning "HTTPS access issue (may be SSL/DNS related)"
}

Write-Host ""

# Step 9: Cleanup and summary
Write-Step 9 "Cleanup & Summary"
Write-Host ""

ssh "$VpsUser@$VpsHost" "rm -rf /tmp/spms_backup_* 2>/dev/null"
Write-Success "Server temporary files cleaned"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Blue
Write-Host "                        🎉 DEPLOYMENT SUMMARY                        " -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Blue

# Get final status
$SpmsStatus = ssh "$VpsUser@$VpsHost" "sudo systemctl is-active spms" 2>$null
$NginxStatus = ssh "$VpsUser@$VpsHost" "sudo systemctl is-active nginx" 2>$null
ssh "$VpsUser@$VpsHost" "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
$AppStatus = $LASTEXITCODE

if ($SpmsStatus -eq "active" -and $NginxStatus -eq "active" -and $AppStatus -eq 0) {
    Write-Host "Status: " -ForegroundColor Cyan -NoNewline
    Write-Host "✓ DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    Write-Host "Dashboard URL: " -ForegroundColor Cyan -NoNewline
    Write-Host "https://srv988862.hstgr.cloud" -ForegroundColor White
    Write-Host "Application: " -ForegroundColor Cyan -NoNewline
    Write-Host "✅ Running" -ForegroundColor Green
    Write-Host "Services: " -ForegroundColor Cyan -NoNewline
    Write-Host "✅ SPMS and Nginx Active" -ForegroundColor Green
} else {
    Write-Host "Status: " -ForegroundColor Cyan -NoNewline
    Write-Host "✗ DEPLOYMENT ISSUES DETECTED" -ForegroundColor Red
    Write-Host "Please check service status manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment completed: " -ForegroundColor Cyan -NoNewline
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Log file: " -ForegroundColor Cyan -NoNewline
Write-Host "$LogFile" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  → Test dashboard: " -NoNewline
Write-Host "https://srv988862.hstgr.cloud" -ForegroundColor White
Write-Host "  → Check 'Komende Wedstrijden' shows API data"
Write-Host "  → Check 'Apeldoornse Clubs' shows working_scraper data"
Write-Host "  → Verify times display correctly (14:30 vs 02:00)"
Write-Host ""
Write-Host "If issues persist:" -ForegroundColor Yellow
Write-Host "  → SSH: " -NoNewline
Write-Host "ssh $VpsUser@$VpsHost" -ForegroundColor Cyan
Write-Host "  → Logs: " -NoNewline
Write-Host "sudo journalctl -u spms -f" -ForegroundColor Cyan
Write-Host "  → Status: " -NoNewline
Write-Host "sudo systemctl status spms nginx" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Blue

Write-Host ""
Read-Host "Deployment completed! Press Enter to exit"