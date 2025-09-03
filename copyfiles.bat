@echo off
echo ========================================
echo  SPMS Flask App Deployment to Hostinger
echo  Using SSH key authentication
echo ========================================
echo.

SET SERVER=root@srv988862.hstgr.cloud
SET REMOTE_PATH=/var/www/spms

REM Core Python files
echo [1/8] Copying core Python files...
scp app.py config.py scheduler.py hollandsevelden.py wsgi.py gunicorn.conf.py requirements.txt %SERVER%:%REMOTE_PATH%/

REM SSL and deployment scripts
echo [2/8] Copying SSL and deployment files...
scp generate_ssl_cert.py setup_letsencrypt.py test_ssl.py test_python_version.py %SERVER%:%REMOTE_PATH%/
scp deploy_hostinger.sh post_deploy_hostinger.sh hostinger_upload.sh fix_python_issues.sh %SERVER%:%REMOTE_PATH%/

REM Environment and configuration
echo [3/8] Copying configuration files...
scp .env.template %SERVER%:%REMOTE_PATH%/
if exist .env scp .env %SERVER%:%REMOTE_PATH%/

REM Documentation
echo [4/8] Copying documentation...
scp CLAUDE.md HOSTINGER_DEPLOYMENT.md %SERVER%:%REMOTE_PATH%/

REM Templates
echo [5/8] Copying templates...
scp templates\dashboard.html templates\404.html templates\500.html %SERVER%:%REMOTE_PATH%/templates/

REM Template includes
echo [6/8] Copying template includes...
scp templates\includes\*.html %SERVER%:%REMOTE_PATH%/templates/includes/

REM Create static directories first
echo [7/8] Creating static directories and copying CSS and JavaScript...
ssh %SERVER% "mkdir -p %REMOTE_PATH%/static/css %REMOTE_PATH%/static/js %REMOTE_PATH%/static/images %REMOTE_PATH%/templates/includes"
scp static\css\dashboard.css %SERVER%:%REMOTE_PATH%/static/css/
scp static\js\dashboard.js %SERVER%:%REMOTE_PATH%/static/js/
if exist static\js\dashboard_tv.js scp static\js\dashboard_tv.js %SERVER%:%REMOTE_PATH%/static/js/

REM Images and favicon
echo [8/8] Copying images...
if exist static\images\favicon.png scp static\images\favicon.png %SERVER%:%REMOTE_PATH%/static/images/
REM scp static\images\*.png %SERVER%:%REMOTE_PATH%/static/images/ 2>nul

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
pause