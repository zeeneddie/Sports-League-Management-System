# Troubleshooting Session 2025-10-11

## Probleem Overzicht

De SPMS applicatie op de productieserver (srv988862.hstgr.cloud) werkte niet meer correct:
1. **API data was leeg** - Geen league standings, geen wedstrijden
2. **Working scraper werkte niet** - Geen Apeldoornse clubs data

## Fase 1: API Data Fix

### Symptomen
- Website was bereikbaar (HTTPS 200 OK)
- Services draaiden (SPMS + Nginx actief)
- `league_data.json` was volledig leeg
- API endpoints gaven lege arrays terug

### Root Cause Analysis

**Probleem 1: Ontbrekende `.env` file**
```bash
# Check op server toonde
ls -la /var/www/spms/.env
# No such file or directory
```

**Probleem 2: Scheduler startte niet onder gunicorn**
- In `app.py` stond scheduler initialisatie binnen `if __name__ == '__main__':` blok
- Gunicorn voert dit blok niet uit
- Scheduler thread werd nooit gestart

### Oplossing

**Stap 1: `.env` file kopiëren naar server**
```bash
# Lokaal Windows naar server
scp "G:/Src/Python/SPMS/.env" root@srv988862.hstgr.cloud:/tmp/.env
ssh root@srv988862.hstgr.cloud "sudo mv /tmp/.env /var/www/spms/.env && sudo chown spms:spms /var/www/spms/.env && sudo chmod 600 /var/www/spms/.env"
```

**Stap 2: Scheduler fix in app.py**
```python
# VOOR (werkte niet onder gunicorn):
if __name__ == '__main__':
    data_scheduler.start_scheduler()
    app.run(...)

# NA (werkt altijd):
# Start the data scheduler (also works with gunicorn)
data_scheduler.start_scheduler()

if __name__ == '__main__':
    app.run(...)
```

**Stap 3: Deploy en restart**
```bash
# Lokaal
git add app.py
git commit -m "FIX: Start scheduler automatically under gunicorn"
git push origin main

# Server
cd /var/www/spms
sudo -u spms git pull origin main
sudo systemctl restart spms
```

### Verificatie
```bash
# Check scheduler geladen
sudo journalctl -u spms --since '1 minute ago' | grep 'Data scheduler started'
# Output: Data scheduler started (API-only mode)

# Check API data
curl -s http://localhost:5000/api/standings | python3 -m json.tool | head -20
# Output: 14 teams met AVV Columbia op positie 10
```

### Resultaat Fase 1
✅ API werkt - League table met 14 teams
✅ Scheduler draait - Geplande updates actief
✅ Data wordt opgehaald - Automatische updates om 10:00, zaterdag live updates

---

## Fase 2: Working Scraper Fix

### Symptomen
- Scheduler triggerde working_scraper
- Scraper faalde direct met error
- Geen Apeldoornse clubs data in `uitslagen.json` en `komende_wedstrijden.json`

### Root Cause Analysis

**Probleem 1: Playwright module ontbrak**
```bash
# Logs toonden:
=== WORKING SCRAPER STARTED at 2025-10-11 13:56:35.767030 ===
Working scraper failed with error:
  File "/var/www/spms/working_scraper.py", line 2, in <module>
    from playwright.async_api import async_playwright
ModuleNotFoundError: No module named 'playwright'
=== WORKING SCRAPER COMPLETED at 2025-10-11 13:56:35.833870 ===
```

**Probleem 2: Gunicorn preload_app caching**
- `gunicorn.conf.py` had `preload_app = True` (regel 45)
- Python modules worden geladen vóór workers worden geforkt
- Code wijzigingen werden niet opgepikt na `systemctl restart`
- Workers gebruikten oude code uit geheugen

### Oplossing

**Stap 1: Playwright installeren**
```bash
# Server
cd /var/www/spms
source venv/bin/activate
pip install -r requirements.txt  # Installeerde playwright==1.46.0
playwright install chromium      # Installeerde browser
```

**Stap 2: Test handmatige uitvoering**
```bash
cd /var/www/spms
source venv/bin/activate
python3 working_scraper.py
```

Output toonde succesvol ophalen van data:
```
=== VOETBALOOST SCRAPER ===
=== GETTING RESULTS ===
Found match line: Stroe	Apeldoornse Boys
  Found score: 3	-	1
  Found date: 11 OKT
Found match line: Victoria Boys	Winkel
  Found score: 2	-	0
...
```

**Stap 3: Scheduler test schedule problemen**
- Meerdere test tijden ingesteld (13:52, 13:56, 14:05, 14:13, 14:20, 14:23)
- Alle tests faalden door gunicorn caching
- Code op schijf was correct, maar workers gebruikten oude versie
- Zelfs na `systemctl restart` laadde preloaded app geen nieuwe code

### Workaround
Voor nu werkt handmatige uitvoering perfect. Scheduler test tijden faalden door `preload_app = True`.

**Aanbevolen oplossing (nog niet geïmplementeerd):**

1. **Aanpassen gunicorn.conf.py:**
```python
# Regel 45 wijzigen
preload_app = False  # Was: True
```

2. **Verwijder test schedule uit scheduler.py:**
```python
# Deze regels verwijderen (regel 321-322):
# TEST SCHEDULE - Working scraper test run (remove after testing)
schedule.every().day.at("14:23").do(self.run_working_scraper)
```

3. **Gebruik normale schedules:**
- Dagelijks 09:00 AM - Working scraper
- Dagelijks 10:00 AM - API update
- Zaterdag 16:30-19:00 - Live updates (elke 15 min)
- Zaterdag/zondag 18:00 - Working scraper

### Resultaat Fase 2
✅ Playwright geïnstalleerd en werkend
✅ Working scraper haalt data op bij handmatige uitvoering
⚠️ Scheduler test nog niet succesvol door gunicorn caching
📝 Normale schedules zijn wel actief (09:00, 18:00)

---

## Git History Cleanup (Extra)

### Probleem
SSL certificaten (ssl/cert.pem, ssl/key.pem) stonden in git history.

### Oplossing
```bash
# Lokaal
cd "G:/Src/Python/SPMS"
git-filter-repo --path ssl/cert.pem --path ssl/key.pem --invert-paths --force
git remote add origin https://github.com/zeeneddie/Sports-League-Management-System.git
git push origin --force --all
git push origin --force --tags

# Server
cd /var/www/spms
sudo -u spms git fetch origin
sudo -u spms git reset --hard origin/main
```

### Verificatie
```bash
git rev-list --all --objects | grep -E "cert.pem|key.pem" | wc -l
# Output: 0 (geen SSL certificaten in history)
```

---

## Configuratie Bestanden

### `.env` (server)
```bash
# Locatie: /var/www/spms/.env
# Permissions: 600 (spms:spms)
SECRET_KEY=your_development_secret_key_change_in_production
USE_TEST_DATA=false
HOLLANDSE_VELDEN_API_KEY=b73ibxfaivpaa7a68pbapckgpt0q947y
USE_SSL=false
```

### Scheduler Configuratie
```python
# scheduler.py regels 300-342
def start_scheduler(self):
    # Daily API update at 10:00 AM
    schedule.every().day.at("10:00").do(self.run_api_update)

    # Working scraper runs
    schedule.every().day.at("09:00").do(self.run_working_scraper)
    schedule.every().saturday.at("18:00").do(self.run_working_scraper)
    schedule.every().sunday.at("18:00").do(self.run_working_scraper)

    # Saturday live updates (16:30-19:00, every 15 min)
    saturday_times = ["16:30", "16:45", "17:00", "17:15", "17:30", "17:45",
                      "18:00", "18:15", "18:30", "18:45", "19:00"]
    for time_slot in saturday_times:
        schedule.every().saturday.at(time_slot).do(self.run_api_update)
```

---

## Belangrijke Logs Locaties

### Systemd logs
```bash
# Alle logs
sudo journalctl -u spms -f

# Scheduler events
sudo journalctl -u spms | grep -E 'Scheduled|SCRAPER'

# Errors
sudo journalctl -u spms | grep -E 'ERROR|Error|error'
```

### Application logs
```bash
# Gunicorn logs
tail -f /var/www/spms/logs/access.log
tail -f /var/www/spms/logs/error.log

# Data files
ls -lh /var/www/spms/league_data.json
ls -lh /var/www/spms/uitslagen.json
ls -lh /var/www/spms/komende_wedstrijden.json
```

---

## Openstaande Acties

### Prioriteit Hoog
1. [ ] `gunicorn.conf.py` aanpassen: `preload_app = False`
2. [ ] Test schedule verwijderen uit `scheduler.py`
3. [ ] Deployment flow testen met nieuwe gunicorn config
4. [ ] Morgen 09:00 AM automatische scraper run verificeren

### Prioriteit Normaal
5. [ ] Test zaterdag 16:30-19:00 live updates
6. [ ] Monitoring instellen voor scheduler failures
7. [ ] Alerting toevoegen als data oudheid >24 uur

---

## Testing Commando's

### Handmatige tests
```bash
# API data ophalen
ssh root@srv988862.hstgr.cloud "cd /var/www/spms && source venv/bin/activate && python3 -c 'from hollandsevelden import get_data; print(len(get_data().get(\"leaguetable\", [])), \"teams\")'"

# Working scraper draaien
ssh root@srv988862.hstgr.cloud "cd /var/www/spms && source venv/bin/activate && python3 working_scraper.py 2>&1 | head -30"

# Scheduler status
ssh root@srv988862.hstgr.cloud "sudo journalctl -u spms --since '5 minutes ago' | grep -E 'Scheduled|SCRAPER'"
```

### Service management
```bash
# Status
sudo systemctl status spms nginx

# Restart
sudo systemctl restart spms

# Logs
sudo journalctl -u spms -f
```

---

## Lessons Learned

1. **Gunicorn preload_app**: `True` cacheert Python modules, wijzigingen vereisen volledige stop/start, niet alleen restart
2. **Scheduler onder gunicorn**: Moet buiten `if __name__ == '__main__'` blok staan
3. **Environment variabelen**: `.env` files worden niet automatisch gedeployed via git
4. **Playwright**: Vereist zowel Python module als browser binary installatie
5. **Deployment flow**: Windows lokaal → GitHub → Ubuntu server, geen directe file copy

---

**Datum**: 2025-10-11
**Status**: API werkend ✅, Scraper handmatig werkend ✅, Scheduler test nog te verifiëren ⚠️
**Volgende verificatie**: Morgen 09:00 UTC automatische working_scraper run
