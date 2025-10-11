@echo off
REM SPMS Production Deployment Script - GitHub-based with comprehensive checks
REM Combines GitHub deployment with proper permissions, scheduler restart, and smoke tests

setlocal enabledelayedexpansion

REM Configuration
set VPS_HOST=srv988862.hstgr.cloud
set VPS_USER=root
set VPS_PATH=/var/www/spms
set GITHUB_BRANCH=main

echo.
echo ===============================================================================
echo                    SPMS Production Deployment v7.0
echo ===============================================================================
echo Method: GitHub Pull - Configure - Test - Deploy
echo Target: %VPS_HOST% (%VPS_PATH%)
echo Started: %date% %time%
echo.

REM Step 1: Pre-deployment validation
echo [1/11] Pre-deployment Validation (Local)
echo.

echo Checking local files...
set missing_files=0
for %%f in (app.py scheduler.py working_scraper.py requirements.txt teams.config) do (
    if exist %%f (
        echo   [OK] %%f found
    ) else (
        echo   [ERROR] %%f missing
        set /a missing_files+=1
    )
)

if %missing_files% gtr 0 (
    echo [ERROR] Missing %missing_files% required files. Deployment aborted.
    pause
    exit /b 1
)

echo Checking git status...
git status >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a git repository
    pause
    exit /b 1
)

for /f "delims=" %%i in ('git remote get-url origin') do set GITHUB_URL=%%i
echo   [OK] GitHub remote: %GITHUB_URL%

echo Testing SSH connection...
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_HOST% exit >nul 2>&1
if errorlevel 1 (
    echo   [WARN] SSH key authentication issue
) else (
    echo   [OK] SSH connection successful
)

echo.

REM Step 2: Check for local changes and push
echo [2/11] GitHub Sync (Local)
echo.

git status --porcelain >nul 2>&1
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set changes=%%i

if %changes% gtr 0 (
    echo WARNING: You have %changes% uncommitted changes
    set /p commit_changes="Commit and push changes before deployment? (y/N): "
    if /i "!commit_changes!"=="y" (
        git add .
        git commit -m "DEPLOY: Pre-deployment commit %date% %time%"
        git push origin %GITHUB_BRANCH%
        echo   [OK] Changes committed and pushed
    ) else (
        echo   [WARN] Deploying without committing local changes
    )
) else (
    echo   [OK] No uncommitted changes
)

echo Pushing latest code to GitHub...
git push origin %GITHUB_BRANCH%
if errorlevel 1 (
    echo   [WARN] Push failed or already up-to-date
) else (
    echo   [OK] Latest code on GitHub
)

echo.

REM Deployment confirmation
echo WARNING: This will deploy to PRODUCTION server
echo Target: %VPS_HOST%
echo Path: %VPS_PATH%
echo.
set /p confirm="Continue with production deployment? (y/N): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled
    pause
    exit /b 1
)

echo.

REM Step 3: Stop services before deployment
echo [3/11] Stopping Services (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "echo 'Stopping services...' && if sudo systemctl is-active --quiet spms; then sudo systemctl stop spms && echo 'SPMS stopped'; fi && if sudo systemctl is-active --quiet nginx; then sudo systemctl stop nginx && echo 'Nginx stopped'; fi"

if errorlevel 1 (
    echo   [WARN] Service stop had issues
) else (
    echo   [OK] Services stopped
)

echo.

REM Step 4: Backup current deployment
echo [4/11] Creating Backup (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd /var/www && echo 'Creating timestamped backup...' && BACKUP_NAME=spms_backup_$(date +%%Y%%m%%d_%%H%%M%%S) && if [ -d spms ]; then sudo cp -r spms $BACKUP_NAME && echo \"Backup created: $BACKUP_NAME\" && sudo ls -ld spms_backup_* | tail -5; else echo 'No existing deployment to backup'; fi"

if errorlevel 1 (
    echo   [WARN] Backup had issues
) else (
    echo   [OK] Backup completed
)

echo.

REM Step 5: Pull latest code from GitHub
echo [5/11] Pulling Code from GitHub (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && echo 'Pulling latest from GitHub...' && sudo -u spms git fetch origin && sudo -u spms git reset --hard origin/%GITHUB_BRANCH% && COMMIT=$(git log -1 --oneline) && echo \"Deployed commit: $COMMIT\""

if errorlevel 1 (
    echo [ERROR] GitHub pull failed
    pause
    exit /b 1
)

echo   [OK] Latest code pulled from GitHub

echo.

REM Step 6: Set correct permissions
echo [6/11] Setting Permissions (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && echo 'Setting file permissions...' && sudo chown -R spms:spms . && sudo chmod 644 *.py 2>/dev/null || true && sudo chmod 644 requirements.txt teams.config 2>/dev/null || true && sudo chmod 600 .env 2>/dev/null || true && sudo chmod 755 *.sh 2>/dev/null || true && sudo chmod -R 755 static templates && echo 'Permissions set correctly'"

if errorlevel 1 (
    echo   [WARN] Permissions setting had issues
) else (
    echo   [OK] Permissions configured
)

echo.

REM Step 7: Update Python dependencies
echo [7/11] Updating Dependencies (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ -f venv/bin/activate ]; then echo 'Updating Python packages...' && source venv/bin/activate && pip install -r requirements.txt --quiet && echo 'Dependencies updated'; else echo 'Virtual environment not found'; fi"

if errorlevel 1 (
    echo   [WARN] Dependency update had issues
) else (
    echo   [OK] Dependencies updated
)

echo.

REM Step 8: Configure scheduler (cron jobs)
echo [8/11] Configuring Scheduler (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && echo 'Checking scheduler configuration...' && if sudo crontab -u spms -l 2>/dev/null | grep -q working_scraper.py; then echo 'Scheduler already configured'; sudo crontab -u spms -l | grep spms; else echo 'Scheduler not configured - needs manual setup'; fi"

echo   [OK] Scheduler check completed

echo.

REM Step 9: Start services
echo [9/11] Starting Services (Remote)
echo.

ssh %VPS_USER%@%VPS_HOST% "echo 'Starting services...' && sudo systemctl start spms && sleep 3 && sudo systemctl start nginx && sleep 2 && echo 'Services started'"

if errorlevel 1 (
    echo [ERROR] Service start failed
) else (
    echo   [OK] Services started
)

echo.

REM Step 10: Comprehensive smoke tests
echo [10/11] Running Smoke Tests (Remote)
echo.

echo Testing SPMS service...
ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active spms" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] SPMS service not running
    ssh %VPS_USER%@%VPS_HOST% "sudo journalctl -u spms -n 20 --no-pager"
) else (
    echo   [OK] SPMS service running
)

echo Testing Nginx service...
ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active nginx" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Nginx service not running
) else (
    echo   [OK] Nginx service running
)

echo Testing local application...
ssh %VPS_USER%@%VPS_HOST% "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
if errorlevel 1 (
    echo   [ERROR] Application not responding locally
) else (
    echo   [OK] Application responding on port 5000
)

echo Testing external HTTPS...
curl -f -s -I https://srv988862.hstgr.cloud >nul 2>&1
if errorlevel 1 (
    echo   [WARN] HTTPS access issue
) else (
    echo   [OK] HTTPS access working
)

echo Testing scheduler files...
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ -f working_scraper.py ] && [ -f scheduler.py ] && [ -f teams.config ]; then echo '  [OK] Scheduler files present'; else echo '  [ERROR] Scheduler files missing'; fi"

echo Testing data files...
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ -f uitslagen.json ] && [ -f komende_wedstrijden.json ]; then echo '  [OK] Data files present'; else echo '  [WARN] Data files need to be generated'; fi"

echo.

REM Step 11: Deployment summary
echo [11/11] Deployment Summary
echo.

echo ===============================================================================
echo                        DEPLOYMENT SUMMARY
echo ===============================================================================

REM Get final status
ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active spms" >nul 2>&1
set spms_status=%errorlevel%

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active nginx" >nul 2>&1
set nginx_status=%errorlevel%

ssh %VPS_USER%@%VPS_HOST% "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
set app_status=%errorlevel%

if %spms_status%==0 if %nginx_status%==0 if %app_status%==0 (
    echo Status: DEPLOYMENT SUCCESSFUL
    echo.
    echo Dashboard: https://srv988862.hstgr.cloud
    echo Services: All running
    echo.
    echo FEATURES DEPLOYED:
    echo   - Mobile navigation buttons ^(^<^< and ^>^>^)
    echo   - Improved working_scraper with Dutch month support
    echo   - Better team name parsing
    echo   - Date filtering for valid matches only
    echo.
) else (
    echo Status: DEPLOYMENT ISSUES DETECTED
    echo.
    if %spms_status% neq 0 echo   - SPMS service not running
    if %nginx_status% neq 0 echo   - Nginx service not running
    if %app_status% neq 0 echo   - Application not responding
    echo.
    echo Check logs: sudo journalctl -u spms -f
)

echo.
echo NEXT STEPS:
echo   1. Test dashboard: https://srv988862.hstgr.cloud
echo   2. Test mobile navigation buttons ^(^<^< and ^>^>^)
echo   3. Verify Apeldoornse Clubs data shows correctly
echo   4. Check scraper schedule: sudo crontab -u spms -l
echo   5. Monitor logs: sudo journalctl -u spms -f
echo.
echo MANUAL SCRAPER RUN ^(if needed^):
echo   ssh %VPS_USER%@%VPS_HOST%
echo   cd %VPS_PATH%
echo   source venv/bin/activate
echo   python working_scraper.py
echo.
echo Deployment completed: %date% %time%
echo ===============================================================================

echo.
pause
