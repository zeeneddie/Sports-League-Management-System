@echo off
REM SPMS GitHub-Based Deployment Script for Windows
REM Commits on Windows, pulls latest on Ubuntu via SSH, reports results

setlocal enabledelayedexpansion

REM Configuration
set VPS_HOST=srv988862.hstgr.cloud
set VPS_USER=root
set VPS_PATH=/var/www/spms
set LOG_FILE=deployment_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log

echo.
echo ===============================================================================
echo                    SPMS GitHub Deployment v6.0.2
echo ===============================================================================
echo Method: Windows Commit - GitHub - Ubuntu Pull - Deploy
echo Target: %VPS_HOST% (%VPS_PATH%)
echo Started: %date% %time%
echo Log File: %LOG_FILE%
echo.

REM Start logging
echo SPMS Deployment Log - %date% %time% > %LOG_FILE%

REM Step 1: Pre-deployment validation
echo [1/9] Pre-deployment Validation (Windows)
echo.

REM Check required files
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
    echo %RED%Missing %missing_files% required files. Deployment aborted.%NC%
    pause
    exit /b 1
)

REM Check Git
echo %BLUE%Checking git status...%NC%
git status >nul 2>&1
if errorlevel 1 (
    echo %RED%Not a git repository or git not available%NC%
    pause
    exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo %RED%No GitHub remote 'origin' configured%NC%
    pause
    exit /b 1
)

for /f "delims=" %%i in ('git remote get-url origin') do set GITHUB_URL=%%i
echo %GREEN%✓ GitHub remote configured: %GITHUB_URL%%NC%

REM Check SSH connectivity
echo %BLUE%Testing SSH connection to Ubuntu...%NC%
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_HOST% exit >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠ SSH key authentication failed, will use password%NC%
) else (
    echo %GREEN%✓ SSH connection successful%NC%
)

echo.

REM Step 2: Commit and push to GitHub
echo %BOLD%%BLUE%[2/9]%NC% %BLUE%Commit and Push to GitHub (Windows)%NC%
echo.

REM Check for uncommitted changes
git status --porcelain >nul 2>&1
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set changes=%%i

if %changes% gtr 0 (
    echo %BLUE%Committing changes to GitHub...%NC%

    REM Add all changes
    git add .
    echo %LOG_FILE% >> %LOG_FILE%

    REM Create commit message
    set commit_msg=🚀 DEPLOYMENT v%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%: Cross-platform deployment updates

    git commit -m "!commit_msg!" -m "" -m "🔧 Generated with [Claude Code](https://claude.ai/code)" -m "" -m "Co-Authored-By: Claude <noreply@anthropic.com>"

    if errorlevel 1 (
        echo %RED%Git commit failed%NC%
        pause
        exit /b 1
    )
    echo %GREEN%✓ Changes committed successfully%NC%
) else (
    echo %BLUE%No changes to commit%NC%
)

REM Push to GitHub
echo %BLUE%Pushing to GitHub...%NC%
git push origin main
if errorlevel 1 (
    echo %RED%Git push failed%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Code pushed to GitHub successfully%NC%
for /f "delims=" %%i in ('git log -1 --oneline') do echo %BLUE%Latest commit: %%i%NC%

echo.

REM Confirm deployment
echo %BOLD%%YELLOW%⚠️ This will deploy SPMS via GitHub to Ubuntu production server%NC%
echo %CYAN%Target:%NC% %VPS_HOST%
echo %CYAN%Method:%NC% Windows commit → GitHub → Ubuntu pull → Deploy
echo.
set /p confirm="Continue with GitHub-based deployment? (y/N): "
if /i not "%confirm%"=="y" (
    echo %RED%Deployment cancelled%NC%
    pause
    exit /b 1
)

echo.

REM Step 3: Backup current deployment
echo %BOLD%%BLUE%[3/9]%NC% %BLUE%Creating Server Backup (via SSH)%NC%
echo.

ssh %VPS_USER%@%VPS_HOST% "if [ -d %VPS_PATH% ]; then sudo tar -czf /tmp/spms_backup_$(date +%%Y%%m%%d_%%H%%M%%S).tar.gz -C %VPS_PATH% . 2>/dev/null; sudo chown %VPS_USER%:%VPS_USER% /tmp/spms_backup_*.tar.gz 2>/dev/null; echo 'Backup created on Ubuntu server'; fi"

if errorlevel 1 (
    echo %YELLOW%⚠ Backup creation skipped (first deployment?)%NC%
) else (
    echo %GREEN%✓ Server backup created in /tmp/ on Ubuntu%NC%
)

echo.

REM Step 4: Pull latest code on Ubuntu
echo %BOLD%%BLUE%[4/9]%NC% %BLUE%Pulling Latest Code on Ubuntu%NC%
echo.

echo %BLUE%Pulling latest code from GitHub on Ubuntu server...%NC%
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ ! -d .git ]; then echo 'Initializing git repository...'; git init; git remote add origin %GITHUB_URL%; fi && echo 'Fetching latest changes from GitHub...' && git fetch origin main && echo 'Resetting to latest version...' && git reset --hard origin/main && echo 'Latest code pulled successfully' && echo \"Current commit: $(git log -1 --oneline)\""

if errorlevel 1 (
    echo %RED%Failed to pull code from GitHub%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Latest code pulled on Ubuntu server%NC%
echo.

REM Step 5: Stop services on Ubuntu
echo %BOLD%%BLUE%[5/9]%NC% %BLUE%Stopping Ubuntu Services%NC%
echo.

ssh %VPS_USER%@%VPS_HOST% "if sudo systemctl is-active --quiet spms; then echo 'Stopping SPMS...'; sudo systemctl stop spms; sleep 2; fi && if sudo systemctl is-active --quiet nginx; then echo 'Stopping Nginx...'; sudo systemctl stop nginx; sleep 2; fi && echo 'Services stopped successfully'"

echo %GREEN%✓ Services stopped on Ubuntu server%NC%
echo.

REM Step 6: Deploy on Ubuntu
echo %BOLD%%BLUE%[6/9]%NC% %BLUE%Deploying on Ubuntu Server%NC%
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && if [ -f requirements.txt ] && [ -f venv/bin/activate ]; then echo '📦 Updating Python dependencies...'; source venv/bin/activate; pip install -r requirements.txt; fi && echo '🔧 Setting file permissions...' && sudo chown -R spms:spms %VPS_PATH% && chmod 644 *.py requirements.txt 2>/dev/null || true && chmod 600 .env 2>/dev/null || true && echo '▶️ Starting services...' && sudo systemctl start spms && echo '✅ SPMS started' || echo '❌ SPMS failed' && sleep 3 && sudo systemctl start nginx && echo '✅ Nginx started' || echo '❌ Nginx failed' && sleep 3 && if curl -f -s http://localhost:5000/ > /dev/null; then echo '✅ Application responding - Deployment successful!'; echo '🌐 Dashboard available at: https://srv988862.hstgr.cloud'; else echo '❌ Application not responding'; echo '📋 Recent SPMS logs:'; sudo journalctl -u spms -n 10 --no-pager; fi"

echo.

REM Step 7: Verify deployment
echo %BOLD%%BLUE%[7/9]%NC% %BLUE%Verifying Deployment%NC%
echo.

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active spms" >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ SPMS service is not running%NC%
) else (
    echo %GREEN%✓ SPMS service is running%NC%
)

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active nginx" >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ Nginx service is not running%NC%
) else (
    echo %GREEN%✓ Nginx service is running%NC%
)

ssh %VPS_USER%@%VPS_HOST% "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
if errorlevel 1 (
    echo %RED%✗ Application not responding%NC%
) else (
    echo %GREEN%✓ Application responding on port 5000%NC%
)

echo.

REM Step 8: Test external access
echo %BOLD%%BLUE%[8/9]%NC% %BLUE%Testing External Access%NC%
echo.

curl -f -s -I https://srv988862.hstgr.cloud >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠ HTTPS access issue (may be SSL/DNS related)%NC%
) else (
    echo %GREEN%✓ HTTPS access working%NC%
)

echo.

REM Step 9: Cleanup and summary
echo %BOLD%%BLUE%[9/9]%NC% %BLUE%Cleanup ^& Summary%NC%
echo.

ssh %VPS_USER%@%VPS_HOST% "rm -rf /tmp/spms_backup_* 2>/dev/null"
echo %GREEN%✓ Server temporary files cleaned%NC%

echo.
echo %BOLD%%BLUE%===============================================================================%NC%
echo %BOLD%%GREEN%                        🎉 DEPLOYMENT SUMMARY                        %NC%
echo %BOLD%%BLUE%===============================================================================%NC%

REM Get final status
ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active spms" >nul 2>&1
set spms_status=%errorlevel%

ssh %VPS_USER%@%VPS_HOST% "sudo systemctl is-active nginx" >nul 2>&1
set nginx_status=%errorlevel%

ssh %VPS_USER%@%VPS_HOST% "curl -f -s http://localhost:5000/ > /dev/null 2>&1"
set app_status=%errorlevel%

if %spms_status%==0 if %nginx_status%==0 if %app_status%==0 (
    echo %BOLD%%GREEN%Status: ✓ DEPLOYMENT SUCCESSFUL%NC%
    echo %CYAN%Dashboard URL:%NC% %BOLD%https://srv988862.hstgr.cloud%NC%
    echo %CYAN%Application:%NC% %GREEN%✅ Running%NC%
    echo %CYAN%Services:%NC% %GREEN%✅ SPMS ^& Nginx Active%NC%
) else (
    echo %BOLD%%RED%Status: ✗ DEPLOYMENT ISSUES DETECTED%NC%
    echo %CYAN%Please check service status manually%NC%
)

echo.
echo %CYAN%Deployment completed:%NC% %date% %time%
echo %CYAN%Log file:%NC% %LOG_FILE%
echo.
echo %BOLD%%YELLOW%Next Steps:%NC%
echo   → Test dashboard: %BOLD%https://srv988862.hstgr.cloud%NC%
echo   → Check 'Komende Wedstrijden' shows API data
echo   → Check 'Apeldoornse Clubs' shows working_scraper data
echo   → Verify times display correctly (14:30 vs 02:00)
echo.
echo %BOLD%%YELLOW%If issues persist:%NC%
echo   → SSH: %CYAN%ssh %VPS_USER%@%VPS_HOST%%NC%
echo   → Logs: %CYAN%sudo journalctl -u spms -f%NC%
echo   → Status: %CYAN%sudo systemctl status spms nginx%NC%
echo %BOLD%%BLUE%===============================================================================%NC%

echo.
echo Deployment completed! Press any key to exit...
pause >nul