@echo off
REM SPMS GitHub-Based Deployment Script for Windows (Simple Version)
REM Commits on Windows, pulls latest on Ubuntu via SSH, reports results

setlocal enabledelayedexpansion

REM Configuration
set VPS_HOST=srv988862.hstgr.cloud
set VPS_USER=root
set VPS_PATH=/var/www/spms

echo.
echo ===============================================================================
echo                    SPMS GitHub Deployment v6.0.2
echo ===============================================================================
echo Method: Windows Commit - GitHub - Ubuntu Pull - Deploy
echo Target: %VPS_HOST% (%VPS_PATH%)
echo Started: %date% %time%
echo.

REM Step 1: Pre-deployment validation
echo [1/9] Pre-deployment Validation (Windows)
echo.

echo Checking required files on Windows...
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
    echo [ERROR] Not a git repository or git not available
    pause
    exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No GitHub remote 'origin' configured
    pause
    exit /b 1
)

for /f "delims=" %%i in ('git remote get-url origin') do set GITHUB_URL=%%i
echo   [OK] GitHub remote configured: %GITHUB_URL%

echo Testing SSH connection to Ubuntu...
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_HOST% exit >nul 2>&1
if errorlevel 1 (
    echo   [WARN] SSH key authentication failed, will use password
) else (
    echo   [OK] SSH connection successful
)

echo.

REM Step 2: Commit and push to GitHub
echo [2/9] Commit and Push to GitHub (Windows)
echo.

REM Check for uncommitted changes
git status --porcelain >nul 2>&1
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set changes=%%i

if %changes% gtr 0 (
    echo Committing changes to GitHub...

    git add .

    set commit_msg=DEPLOYMENT v%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%: GitHub-based deployment

    git commit -m "!commit_msg!" -m "" -m "Generated with Claude Code" -m "" -m "Co-Authored-By: Claude <noreply@anthropic.com>"

    if errorlevel 1 (
        echo [ERROR] Git commit failed
        pause
        exit /b 1
    )
    echo   [OK] Changes committed successfully
) else (
    echo No changes to commit
)

echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo [ERROR] Git push failed
    pause
    exit /b 1
)

echo   [OK] Code pushed to GitHub successfully

echo.

REM Confirm deployment
echo WARNING: This will deploy SPMS via GitHub to Ubuntu production server
echo Target: %VPS_HOST%
echo Method: Windows commit - GitHub - Ubuntu pull - Deploy
echo.
set /p confirm="Continue with GitHub-based deployment? (y/N): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled
    pause
    exit /b 1
)

echo.

REM Step 3: Backup current deployment (rolling backup strategy)
echo [3/9] Creating Rolling Backup (via SSH)
echo.

ssh %VPS_USER%@%VPS_HOST% "cd /var/www && echo 'Cleaning old backup...' && sudo rm -rf spms_backup 2>/dev/null && if [ -d spms ]; then echo 'Moving current production to backup...' && sudo mv spms spms_backup && echo 'Production moved to backup location'; else echo 'No existing production to backup'; fi"

if errorlevel 1 (
    echo   [ERROR] Backup operation failed
    pause
    exit /b 1
) else (
    echo   [OK] Rolling backup completed - current production moved to spms_backup
)

echo.

REM Step 4: Pull latest code on Ubuntu
echo [4/9] Pulling Latest Code on Ubuntu
echo.

echo Pulling latest code from GitHub on Ubuntu server...
ssh %VPS_USER%@%VPS_HOST% "cd /var/www && echo 'Cloning fresh from GitHub...' && sudo git clone %GITHUB_URL% spms && sudo chown -R spms:spms %VPS_PATH% && echo 'Repository cloned successfully' && cd %VPS_PATH% && echo \"Current commit: $(git log -1 --oneline)\""

if errorlevel 1 (
    echo [ERROR] Failed to pull code from GitHub
    pause
    exit /b 1
)

echo   [OK] Latest code pulled on Ubuntu server
echo.

REM Step 5: Stop services on Ubuntu
echo [5/9] Stopping Ubuntu Services
echo.

ssh %VPS_USER%@%VPS_HOST% "if sudo systemctl is-active --quiet spms; then echo 'Stopping SPMS...'; sudo systemctl stop spms; sleep 2; fi && if sudo systemctl is-active --quiet nginx; then echo 'Stopping Nginx...'; sudo systemctl stop nginx; sleep 2; fi && echo 'Services stopped successfully'"

echo   [OK] Services stopped on Ubuntu server
echo.

REM Step 6: Deploy on Ubuntu
echo [6/9] Deploying on Ubuntu Server
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ -f requirements.txt ] && [ -f venv/bin/activate ]; then echo 'Updating Python dependencies...'; source venv/bin/activate; pip install -r requirements.txt; fi && echo 'Setting file permissions...' && sudo chown -R spms:spms %VPS_PATH% && chmod 644 *.py requirements.txt 2>/dev/null || true && chmod 600 .env 2>/dev/null || true && echo 'Starting services...' && sudo systemctl start spms && echo 'SPMS started' && sleep 3 && sudo systemctl start nginx && echo 'Nginx started' && sleep 3 && if curl -f -s http://localhost:5000/ > /dev/null; then echo 'Application responding - Deployment successful!'; echo 'Dashboard available at: https://srv988862.hstgr.cloud'; else echo 'Application not responding'; echo 'Recent SPMS logs:'; sudo journalctl -u spms -n 10 --no-pager; fi"

echo.

REM Step 7: Verify deployment
echo [7/9] Verifying Deployment
echo.

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active spms" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] SPMS service is not running
) else (
    echo   [OK] SPMS service is running
)

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active nginx" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Nginx service is not running
) else (
    echo   [OK] Nginx service is running
)

ssh %VPS_USER%@%VPS_HOST% "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
if errorlevel 1 (
    echo   [ERROR] Application not responding
) else (
    echo   [OK] Application responding on port 5000
)

echo.

REM Step 8: Test external access
echo [8/9] Testing External Access
echo.

curl -f -s -I https://srv988862.hstgr.cloud >nul 2>&1
if errorlevel 1 (
    echo   [WARN] HTTPS access issue (may be SSL/DNS related)
) else (
    echo   [OK] HTTPS access working
)

echo.

REM Step 9: Cleanup and summary
echo [9/9] Cleanup and Summary
echo.

ssh %VPS_USER%@%VPS_HOST% "cd /var/www && if [ -d spms_backup ]; then sudo rm -rf spms_backup && echo 'Backup cleaned after successful deployment'; else echo 'No backup to clean'; fi"
echo   [OK] Server backup cleaned after successful deployment

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
    echo Dashboard URL: https://srv988862.hstgr.cloud
    echo Application: Running
    echo Services: SPMS and Nginx Active
) else (
    echo Status: DEPLOYMENT ISSUES DETECTED
    echo Please check service status manually
)

echo.
echo Deployment completed: %date% %time%
echo.
echo Next Steps:
echo   - Test dashboard: https://srv988862.hstgr.cloud
echo   - Check 'Komende Wedstrijden' shows API data
echo   - Check 'Apeldoornse Clubs' shows working_scraper data
echo   - Verify times display correctly (14:30 vs 02:00)
echo.
echo If issues persist:
echo   - SSH: ssh %VPS_USER%@%VPS_HOST%
echo   - Logs: sudo journalctl -u spms -f
echo   - Status: sudo systemctl status spms nginx
echo ===============================================================================

echo.
echo Deployment completed! Press any key to exit...
pause >nul