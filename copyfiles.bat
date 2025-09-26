@echo off
echo ========================================
echo  SPMS Flask App Deployment to Hostinger
echo  Windows-compatible SSH deployment
echo ========================================
echo.

SET SERVER=root@srv988862.hstgr.cloud
SET REMOTE_PATH=/var/www/spms

REM Test SSH key authentication
echo Testing SSH key authentication...
ssh -o ConnectTimeout=10 -o BatchMode=yes %SERVER% "echo 'SSH key authentication successful'"
if %ERRORLEVEL% neq 0 (
    echo Failed to establish SSH connection. Please check your credentials.
    pause
    exit /b 1
)

echo SSH connection verified. Proceeding with file transfers...

REM Core Python files
echo [1/7] Copying core Python files...
scp app.py config.py scheduler.py hollandsevelden.py overige_scraper.py working_scraper.py wsgi.py gunicorn.conf.py requirements.txt %SERVER%:%REMOTE_PATH%/

REM JSON template files (for local data updates)
echo [2/7] Copying JSON template files...
scp league_data_template.json %SERVER%:%REMOTE_PATH%/league_data.json
scp uitslagen_template.json %SERVER%:%REMOTE_PATH%/uitslagen.json
scp komende_wedstrijden_template.json %SERVER%:%REMOTE_PATH%/komende_wedstrijden.json

REM SSL and deployment scripts (essential only)
echo [3/7] Copying essential deployment files...
scp generate_ssl_cert.py setup_letsencrypt.py %SERVER%:%REMOTE_PATH%/
scp deploy_hostinger.sh post_deploy_hostinger.sh %SERVER%:%REMOTE_PATH%/

REM Environment and configuration
echo [4/7] Copying configuration files...
scp .env.template %SERVER%:%REMOTE_PATH%/
if exist .env scp .env %SERVER%:%REMOTE_PATH%/

REM Documentation (essential only)
echo [5/7] Skipping documentation files...

REM Templates
echo [6/7] Copying templates...
scp templates\dashboard.html templates\404.html templates\500.html %SERVER%:%REMOTE_PATH%/templates/
scp templates\includes\*.html %SERVER%:%REMOTE_PATH%/templates/includes/

REM Create static directories and copy CSS/JavaScript
echo [7/7] Creating static directories and copying CSS and JavaScript...
ssh %SERVER% "mkdir -p %REMOTE_PATH%/static/css %REMOTE_PATH%/static/js %REMOTE_PATH%/static/images %REMOTE_PATH%/templates/includes"
scp static\css\dashboard.css %SERVER%:%REMOTE_PATH%/static/css/
scp static\js\dashboard.js %SERVER%:%REMOTE_PATH%/static/js/

REM Essential images only
echo Copying essential images...
if exist static\images\favicon.png scp static\images\favicon.png %SERVER%:%REMOTE_PATH%/static/images/
if exist static\images\icon.png scp static\images\icon.png %SERVER%:%REMOTE_PATH%/static/images/
scp static\images\logo_club1919.png %SERVER%:%REMOTE_PATH%/static/images/

REM Logo directories commented out as requested
REM REM Copy team logos
REM echo Copying team logos...
REM ssh %SERVER% "mkdir -p %REMOTE_PATH%/static/images/team_logos"
REM scp static\images\team_logos\t_184.png %SERVER%:%REMOTE_PATH%/static/images/team_logos/
REM if exist static\images\team_logos\*.png scp static\images\team_logos\*.png %SERVER%:%REMOTE_PATH%/static/images/team_logos/ 2>nul

REM Copy required image directories
echo Copying club logos and overige images...
ssh %SERVER% "mkdir -p %REMOTE_PATH%/static/images/club_logos %REMOTE_PATH%/static/images/overige"
if exist static\images\club_logos\*.webp scp static\images\club_logos\*.webp %SERVER%:%REMOTE_PATH%/static/images/club_logos/ 2>nul
if exist static\images\club_logos\*.png scp static\images\club_logos\*.png %SERVER%:%REMOTE_PATH%/static/images/club_logos/ 2>nul
if exist static\images\overige\*.* scp static\images\overige\*.* %SERVER%:%REMOTE_PATH%/static/images/overige/ 2>nul

echo.
echo ========================================
echo  Files uploaded successfully!
echo ========================================
echo.
echo Setting permissions and fixing line endings on remote server...
ssh %SERVER% "cd %REMOTE_PATH% && dos2unix *.py *.sh *.txt *.md 2>/dev/null || true && find . -name '*.html' -o -name '*.css' -o -name '*.js' | xargs dos2unix 2>/dev/null || true && chmod +x *.sh && chmod 600 .env 2>/dev/null || true && chmod -R 755 static templates"

echo.
echo ========================================
echo  Next Steps:
echo ========================================
echo 1. SSH to server: ssh %SERVER%
echo 2. Navigate to: cd %REMOTE_PATH%
echo 3. Configure environment: cp .env.template .env && nano .env
echo 4. Run post-deployment setup:
echo    - sudo ./post_deploy_hostinger.sh
echo.
echo Note: All files are already uploaded to the correct location
echo (%REMOTE_PATH%) and scripts are configured for the flaskapp user.
echo.
echo Your site will be available at:
echo - HTTP:  http://srv988862.hstgr.cloud
echo - HTTPS: https://srv988862.hstgr.cloud (after SSL setup)
echo.
echo NEW FEATURES:
echo - Updated grid layout system for match displays
echo - Automatic local JSON file integration
echo - Template JSON files for manual data updates
echo - Optimized file deployment (logos commented out)
echo.
pause