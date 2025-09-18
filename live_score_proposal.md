# Live Score Voorstel voor SPMS

## 📋 Overzicht
Real-time score updates voor Columbia wedstrijden en overige Apeldoornse clubs tijdens wedstrijden op zaterdag.

## ⏰ Timing
- **Zaterdag 14:00-17:00**: Elke 5 minuten live score check
- **Live website**: https://voetbaloost.nl/live.html?a=3

## 🎯 Doelstellingen

### 1. Columbia Wedstrijden
- Update Columbia wedstrijden met live scores
- Toon huidige stand (bijv. "1-2 (67')")
- Status aanpassen van "Nog te spelen" naar "Live"

### 2. Overige Apeldoornse Clubs
- Update overige clubs wedstrijden met live scores
- Toon op komende wedstrijden scherm
- Real-time updates voor alle Apeldoornse teams

## 🏗️ Technische Architectuur

### 1. Live Score Scraper (`live_score_scraper.py`)
```python
async def get_live_scores():
    """
    Scrape https://voetbaloost.nl/live.html?a=3
    Return: [
        {
            "home": "Team A",
            "away": "Team B",
            "homeGoals": 2,
            "awayGoals": 1,
            "minute": "67'",
            "status": "Live",
            "match_time": "15:00"
        }
    ]
    """
```

### 2. Data Merge Logic
```python
def merge_live_scores(existing_matches, live_scores):
    """
    Merge live scores into existing match data
    - Match teams by name comparison
    - Update homeGoals, awayGoals, status
    - Add minute information
    - Preserve original data structure
    """
```

### 3. Data Files
- **`live_scores.json`**: Huidige live scores
- **`komende_wedstrijden_live.json`**: Komende wedstrijden + live updates
- **`featured_team_matches_live.json`**: Columbia wedstrijden + live updates

## 📊 Data Structuur Uitbreiding

### Bestaande Structuur
```json
{
    "status": "Nog te spelen",
    "date": "2025-09-20",
    "home": "AVV Columbia",
    "away": "VV SEH",
    "homeGoals": 0,
    "awayGoals": 0,
    "result": "",
    "time": "15:00"
}
```

### Uitgebreide Structuur (Live)
```json
{
    "status": "Live",
    "date": "2025-09-20",
    "home": "AVV Columbia",
    "away": "VV SEH",
    "homeGoals": 2,
    "awayGoals": 1,
    "result": "2-1",
    "time": "15:00",
    "minute": "67'",
    "isLive": true,
    "lastUpdate": "2025-09-20T16:30:00"
}
```

## 🔄 Workflow

### 1. Live Score Collection
1. **Browser navigatie** naar live.html
2. **Cookie acceptance** (automatisch)
3. **Page parsing** voor live wedstrijden
4. **Team matching** met bekende teams
5. **Score extraction** (goals + minuut)
6. **JSON output** naar live_scores.json

### 2. Data Integration
1. **Load existing data** (komende_wedstrijden.json, featured_team_matches)
2. **Match teams** (fuzzy matching voor variaties)
3. **Update scores** alleen voor live wedstrijden
4. **Preserve structure** van bestaande data
5. **Save updated files** met live suffix

### 3. Frontend Updates
1. **API endpoints** voor live data
2. **Auto-refresh logic** elke 30 seconden tijdens live tijd
3. **Visual indicators** voor live wedstrijden
4. **Score animations** bij doelpunten

## 🛠️ Implementatie Plan

### Fase 1: Live Score Scraper
```python
# live_score_scraper.py
- get_live_scores() functie
- Team name matching logic
- Error handling & timeouts
- Test met bekende teams
```

### Fase 2: Data Integration
```python
# live_score_merger.py
- merge_live_scores() functie
- Fuzzy team matching
- Data structure preservation
- Backup & rollback logic
```

### Fase 3: Scheduler Integration
```python
# scheduler.py uitbreiding
- run_live_score_update() methode
- Zaterdag 14:00-17:00 timing
- 5-minuten interval
- Error handling
```

### Fase 4: Frontend Updates
```javascript
// dashboard.js uitbreiding
- Live score API endpoints
- Real-time refresh logic
- Live status indicators
- Score change animations
```

## 📡 API Endpoints

### Nieuwe Endpoints
- **`/api/live-scores`**: Huidige live scores
- **`/api/columbia-matches-live`**: Columbia wedstrijden + live
- **`/api/overige-clubs-live`**: Overige clubs + live
- **`/api/live-status`**: Live update status

### Bestaande Endpoints (uitgebreid)
- **`/api/data`**: Include live data wanneer beschikbaar
- **`/komende_wedstrijden.json`**: Live updates included

## 🎨 Frontend Wijzigingen

### Visual Indicators
- **🔴 LIVE**: Rode indicator voor live wedstrijden
- **⚽ 2-1 (67')**: Score + minuut weergave
- **Pulsing animation**: Voor live status
- **Green highlight**: Bij recent doelpunt

### Screen Updates
1. **Columbia Wedstrijden Scherm**:
   - Live scores prominent
   - Minuut indicator
   - Status "LIVE" in plaats van tijd

2. **Overige Clubs Komende Wedstrijden**:
   - Live scores voor vandaag
   - Behoud planning voor andere dagen
   - Live/Nog te spelen mix

## ⚡ Performance Overwegingen

### Caching Strategy
- **Live scores cache**: 5 minuten
- **Fallback data**: Behoud laatste bekende status
- **Error recovery**: Automatische fallback naar statische data

### Resource Management
- **Browser reuse**: Hergebruik Playwright browser
- **Timeout handling**: 30 seconden per scrape
- **Rate limiting**: Respecteer website limits
- **Memory cleanup**: Browser cleanup na elke run

## 🔐 Error Handling

### Scraper Errors
- **Website down**: Gebruik cached data
- **Parsing errors**: Log en gebruik fallback
- **Team not found**: Log voor analyse
- **Network timeout**: Retry met backoff

### Data Integrity
- **Backup files**: Voor elke live update
- **Rollback capability**: Bij corrupte data
- **Validation**: Score en team validatie
- **Audit trail**: Log alle wijzigingen

## 📅 Rollout Plan

### Week 1: Development
- Live score scraper ontwikkeling
- Data merge logic
- Basic testing

### Week 2: Integration
- Scheduler integratie
- API endpoints
- Frontend aanpassingen

### Week 3: Testing
- End-to-end testing
- Error scenario testing
- Performance testing

### Week 4: Deployment
- Production deployment
- Live monitoring
- Feedback verwerking

## 🧪 Testing Strategy

### Unit Tests
- Scraper functionaliteit
- Data merge logic
- Team matching accuracy

### Integration Tests
- Scheduler timing
- API endpoints
- Frontend updates

### Live Tests
- Echte wedstrijden
- Error scenarios
- Performance onder load

## 💡 Toekomstige Uitbreidingen

### Fase 2 Features
- **Half-time scores**: Rust stand tracking
- **Goal timeline**: Wie scoorde wanneer
- **Cards tracking**: Gele/rode kaarten
- **Substitutions**: Wisselgegevens

### Fase 3 Features
- **Push notifications**: Bij doelpunten
- **Historical data**: Live score historie
- **Statistics**: Schoten, bezit, etc.
- **Multi-competition**: Andere competities

## 🎯 Succeskrirteria

### Functioneel
- ✅ Live scores binnen 5 minuten na doelpunt
- ✅ 99% uptime tijdens wedstrijden
- ✅ Correcte team matching (>95%)
- ✅ Automatische fallback bij errors

### Technisch
- ✅ <30 seconden scrape tijd
- ✅ <1MB extra data per update
- ✅ Zero data corruption
- ✅ Seamless user experience

### Business
- ✅ Real-time informatie
- ✅ Geen handmatige interventie
- ✅ Robuuste error handling
- ✅ Scalable architecture

---

**Next Steps**: Akkoord op voorstel → Fase 1 implementatie → Testing → Deployment