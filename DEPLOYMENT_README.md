# SPMS Deployment Guide

## Cross-Platform Deployment (Windows → Ubuntu)

**Development Environment**: Windows 10/11
**Production Server**: Hostinger VPS Ubuntu 20.04+

Dit project heeft twee deployment opties voor Hostinger VPS Ubuntu server:

### 1. `quick_deploy.sh` - Snelle Deployment (Aanbevolen)

**Gebruik:**
```bash
./quick_deploy.sh
```

**Wat het doet:**
- ✅ Controleert alle vereiste bestanden (Windows)
- ✅ Stopt Ubuntu services automatisch (`sudo systemctl stop spms nginx`)
- ✅ Maakt backup van huidige deployment op Ubuntu server
- ✅ Upload kritiéke bestanden in tar.gz pakket
- ✅ Update Python dependencies in virtual environment
- ✅ Zet correcte Ubuntu permissions (`chown spms:spms`)
- ✅ Start Ubuntu services opnieuw op (`sudo systemctl start`)
- ✅ Verifieert deployment success met Ubuntu checks
- ✅ Test applicatie response op Ubuntu server

**Voordelen:**
- Cross-platform compatible (Windows → Ubuntu)
- Automatische Ubuntu service management
- Built-in Ubuntu-specific verification
- Minimal downtime met proper sudo handling
- Ubuntu permission management

### 2. `hostinger_upload.sh` - Volledige Upload

**Gebruik:**
```bash
./hostinger_upload.sh
```

**Wat het doet:**
- Stopt Ubuntu services eerst (`sudo systemctl stop`)
- Upload alle bestanden via rsync (inclusief templates/static)
- Zet correcte Ubuntu permissions en ownership
- Start Ubuntu services opnieuw op (`sudo systemctl start`)
- Uitgebreide Ubuntu-specifieke logging en diagnostics

## Voor v6.0.2 Data Separation Fix

**Kritiéke bestanden die geüpdatet zijn:**
- `scheduler.py` - Data separation logic
- `static/js/dashboard.js` - Updated data field usage
- `app.py` - New API endpoint

**Na deployment controleren:**
1. Dashboard carousel werkt correct
2. "Komende Wedstrijden" toont API data
3. "Apeldoornse Clubs" toont working_scraper data
4. Tijden tonen correct (14:30 vs 02:00)

## Ubuntu Service Management Commands

**Op de Ubuntu server (via SSH):**
```bash
# Status checken
sudo systemctl status spms nginx

# Services herstarten
sudo systemctl restart spms nginx

# Logs bekijken (requires sudo)
sudo journalctl -u spms -f

# Applicatie test
curl http://localhost:5000/

# Virtual environment check
ls -la /var/www/spms/venv/bin/activate

# File permissions check
ls -la /var/www/spms/ | head -10
```

## Troubleshooting

**Als deployment faalt op Ubuntu:**
1. Check service logs: `sudo journalctl -u spms -n 50`
2. Test manual start: `cd /var/www/spms && source venv/bin/activate && python app.py`
3. Check dependencies: `source venv/bin/activate && pip list | grep -E "(playwright|schedule|flask)"`
4. Check file ownership: `ls -la /var/www/spms/ | grep -E "(app.py|scheduler.py)"`
5. Check permissions: `sudo systemctl status spms --no-pager -l`

**Voor working_scraper issues op Ubuntu:**
```bash
# SSH to Ubuntu server
ssh root@srv988862.hstgr.cloud

# Navigate and test
cd /var/www/spms
source venv/bin/activate

# Reinstall Playwright if needed
pip install playwright==1.46.0
playwright install chromium
playwright install-deps

# Test working scraper
timeout 30s python working_scraper.py

# Check teams.config exists
ls -la teams.config
```

## Configuration

**Update server details in scripts:**
- VPS_HOST="srv988862.hstgr.cloud"
- VPS_USER="root"
- VPS_PATH="/var/www/spms"

**Environment variables (`.env`):**
- USE_TEST_DATA=false
- SCREEN_DURATION_SECONDS=12
- FEATURED_TEAM=AVV Columbia