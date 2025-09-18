# Week 1 Implementation Plan: Live Score Scraper + Data Merge

## 🎯 Week 1 Doelstellingen

**Hoofddoel**: Werkende live score scraper met data merge functionaliteit
**Deliverables**: 3 nieuwe Python modules + tests + documentatie
**Timeline**: 5-7 dagen development + testing

---

## 📅 Dag-voor-dag Planning

### **Dag 1-2: Live Score Scraper Development**

#### **Dag 1: Core Scraper Architecture**
**Tijd**: ~6 uur
**Bestand**: `live_score_scraper.py`

**Morning (3 uur)**:
- ✅ Playwright setup en browser configuratie
- ✅ Basic navigation naar live.html
- ✅ Cookie handling (herbruik van working_scraper.py)
- ✅ Page load error handling

**Afternoon (3 uur)**:
- ✅ HTML parsing strategy development
- ✅ Live match detection logic
- ✅ Score extraction patterns
- ✅ Team name cleaning/normalization

**Deliverable**: Basic scraper die live.html kan laden en teams kan detecteren

#### **Dag 2: Score Extraction & Data Structuring**
**Tijd**: ~6 uur

**Morning (3 uur)**:
- ✅ Score regex patterns (1-0, 2-1, etc.)
- ✅ Minute extraction (67', 45+2', HT, FT)
- ✅ Match status detection (Live, HT, FT)
- ✅ Time-based filtering (alleen vandaag)

**Afternoon (3 uur)**:
- ✅ JSON output formatting
- ✅ Error handling & fallbacks
- ✅ Basic logging implementation
- ✅ Manual testing met echte live data

**Deliverable**: Complete scraper die JSON output genereert

**Code Preview**:
```python
# live_score_scraper.py
async def get_live_scores(target_date=None):
    """
    Scrape live scores from voetbaloost.nl/live.html?a=3

    Returns:
    [
        {
            "home": "AVV Columbia",
            "away": "VV SEH",
            "homeGoals": 2,
            "awayGoals": 1,
            "minute": "67'",
            "status": "Live",
            "matchTime": "15:00",
            "lastUpdate": "2025-09-20T16:30:00"
        }
    ]
    """
```

### **Dag 3: Data Merge Logic Development**

#### **Core Data Merge Implementation**
**Tijd**: ~6 uur
**Bestand**: `live_score_merger.py`

**Morning (3 uur)**:
- ✅ Team name matching algorithm (exact + fuzzy)
- ✅ Data structure preservation logic
- ✅ Live status determination rules
- ✅ Backup/rollback mechanism

**Afternoon (3 uur)**:
- ✅ Columbia matches merge logic
- ✅ Overige clubs merge logic
- ✅ JSON file I/O with locking
- ✅ Validation & integrity checks

**Team Matching Strategy**:
```python
def match_team_names(scrape_name, existing_name):
    """
    Match team names with variations

    Examples:
    "AVV Columbia" matches "Columbia"
    "Apeldoorn CSV" matches "CSV Apeldoorn"
    "V. Boys" matches "Victoria Boys"
    """
    # 1. Exact match
    # 2. Normalized match (lowercase, no spaces)
    # 3. Substring match
    # 4. Fuzzy match (>90% similarity)
    # 5. Known aliases lookup
```

**Data Merge Logic**:
```python
def merge_live_scores(existing_matches, live_scores):
    """
    Update existing match data with live scores

    Process:
    1. Load existing JSON data
    2. For each live score, find matching existing match
    3. Update: status, homeGoals, awayGoals, minute, result
    4. Add: isLive, lastUpdate fields
    5. Preserve: all other existing data
    6. Validate: data integrity
    7. Save: with backup
    """
```

### **Dag 4: Integration & Configuration**

#### **System Integration**
**Tijd**: ~6 uur

**Morning (3 uur)**:
- ✅ Configuration management (timing, teams)
- ✅ Integration met bestaande team configs
- ✅ Command-line interface development
- ✅ Logging & monitoring setup

**Afternoon (3 uur)**:
- ✅ Error handling & recovery mechanisms
- ✅ Performance optimization (browser reuse)
- ✅ Memory management & cleanup
- ✅ Configuration validation

**Configuration Files**:

**`live_score_config.py`**:
```python
class LiveScoreConfig:
    # Timing
    LIVE_HOURS_START = 14
    LIVE_HOURS_END = 17
    UPDATE_INTERVAL_MINUTES = 5

    # Scraping
    SCRAPE_TIMEOUT_SECONDS = 30
    BROWSER_REUSE = True
    MAX_RETRIES = 3

    # Team Matching
    FUZZY_MATCH_THRESHOLD = 0.9
    KNOWN_ALIASES = {
        "Columbia": ["AVV Columbia", "Columbia AVV"],
        "CSV": ["Apeldoorn CSV", "CSV Apeldoorn"]
    }

    # Files
    LIVE_SCORES_FILE = "live_scores.json"
    BACKUP_DIR = "backups/live_scores/"
```

**Command Line Interface**:
```bash
# Manual live score fetch
python live_score_scraper.py --manual

# Test mode (dry run)
python live_score_scraper.py --test

# Specific date
python live_score_scraper.py --date 2025-09-20

# Verbose logging
python live_score_scraper.py --verbose
```

### **Dag 5: Testing & Validation**

#### **Comprehensive Testing**
**Tijd**: ~8 uur

**Morning (4 uur)**:
- ✅ Unit tests voor alle core functies
- ✅ Integration tests voor data flow
- ✅ Mock data testing (geen echte scrapes)
- ✅ Error scenario testing

**Afternoon (4 uur)**:
- ✅ Live website testing (echte data)
- ✅ Performance testing (memory, speed)
- ✅ Data integrity validation
- ✅ Edge case testing

**Test Files Structure**:
```
tests/
├── test_live_score_scraper.py
├── test_data_merger.py
├── test_team_matching.py
├── mock_data/
│   ├── sample_live_page.html
│   ├── sample_existing_matches.json
│   └── expected_merged_output.json
└── integration/
    ├── test_full_workflow.py
    └── test_error_scenarios.py
```

---

## 🔧 Technische Specificaties

### **Live Score Scraper (`live_score_scraper.py`)**

**Core Functies**:
```python
async def scrape_live_page() -> str:
    """Load and return HTML content from live page"""

async def parse_live_matches(html_content: str) -> List[Dict]:
    """Extract match data from HTML"""

def normalize_team_name(team_name: str) -> str:
    """Clean and normalize team names"""

def extract_score_info(score_text: str) -> Tuple[int, int, str]:
    """Extract home goals, away goals, and minute"""

async def get_live_scores(target_date: str = None) -> List[Dict]:
    """Main function - return live scores for target teams"""
```

**Error Scenarios Covered**:
- ❌ Website niet bereikbaar → Return empty list + log
- ❌ Cookie dialog niet gevonden → Continue zonder cookies
- ❌ Geen live wedstrijden → Return empty list
- ❌ Parsing errors → Skip probleem match, continue
- ❌ Team niet herkend → Log voor analyse
- ❌ Score format onbekend → Use fallback regex

### **Data Merger (`live_score_merger.py`)**

**Core Functies**:
```python
def load_existing_matches(file_path: str) -> List[Dict]:
    """Load current match data with error handling"""

def match_teams(live_match: Dict, existing_matches: List[Dict]) -> Dict:
    """Find matching existing match for live score"""

def merge_match_data(existing_match: Dict, live_score: Dict) -> Dict:
    """Merge live score into existing match data"""

def create_backup(file_path: str) -> str:
    """Create timestamped backup before changes"""

def validate_merged_data(merged_data: List[Dict]) -> bool:
    """Validate data integrity after merge"""

def merge_live_scores_to_file(file_path: str, live_scores: List[Dict]) -> bool:
    """Main function - merge and save"""
```

**Team Matching Algorithm**:
```python
def calculate_team_match_score(name1: str, name2: str) -> float:
    """
    Return match confidence (0.0-1.0)

    Factors:
    - Exact match: 1.0
    - Case insensitive: 0.95
    - Normalized (no spaces/punctuation): 0.9
    - Substring match: 0.8
    - Fuzzy similarity: 0.6-0.9
    - Known aliases: 1.0
    """
```

---

## 📊 Data Flow Architecture

### **Input Sources**
```
voetbaloost.nl/live.html → Live Scores JSON
komende_wedstrijden.json → Existing Match Data
league_data.json → Columbia Match Data
teams.config → Target Teams List
```

### **Processing Pipeline**
```
1. Load Target Teams
2. Scrape Live Page
3. Extract Live Matches
4. Filter for Target Teams
5. Load Existing Match Data
6. Match Teams (live ↔ existing)
7. Merge Score Data
8. Validate Integrity
9. Create Backup
10. Save Updated Files
```

### **Output Files**
```
live_scores.json → Raw live score data
komende_wedstrijden.json → Updated (if live matches found)
league_data.json → Updated featured_team_matches
backups/ → Timestamped backups
logs/ → Processing logs
```

---

## 🧪 Testing Strategy

### **Unit Tests** (Dag 5 Morning)

**test_live_score_scraper.py**:
```python
def test_normalize_team_name():
    assert normalize_team_name("  AVV Columbia  ") == "AVV Columbia"
    assert normalize_team_name("V.Boys") == "Victoria Boys"

def test_extract_score_info():
    assert extract_score_info("2 - 1 (67')") == (2, 1, "67'")
    assert extract_score_info("0-0 HT") == (0, 0, "HT")

def test_parse_live_matches_with_mock_html():
    # Test with saved HTML sample

def test_error_handling():
    # Test website timeout, parsing errors
```

**test_data_merger.py**:
```python
def test_exact_team_match():
    # Test perfect team name matches

def test_fuzzy_team_match():
    # Test similar team name matching

def test_merge_preserve_structure():
    # Ensure original data structure preserved

def test_backup_creation():
    # Test backup file creation and restore
```

### **Integration Tests** (Dag 5 Afternoon)

**test_full_workflow.py**:
```python
def test_end_to_end_workflow():
    # Mock live page → scrape → merge → validate

def test_multiple_matches_same_team():
    # Handle team playing multiple matches

def test_no_live_matches_scenario():
    # Graceful handling when no live matches
```

### **Manual Testing Checklist**
- [ ] Run scraper during actual live matches
- [ ] Verify team name matching accuracy
- [ ] Check data integrity after merge
- [ ] Test error recovery (disconnect network)
- [ ] Validate backup/restore functionality
- [ ] Performance test (memory usage, timing)

---

## 📦 Week 1 Deliverables

### **Code Files**
- ✅ `live_score_scraper.py` - Live score scraping
- ✅ `live_score_merger.py` - Data merge logic
- ✅ `live_score_config.py` - Configuration management
- ✅ `tests/` - Complete test suite
- ✅ `requirements_live.txt` - Additional dependencies

### **Data Files**
- ✅ `live_scores.json` - Live score data format
- ✅ `team_aliases.json` - Team name mapping
- ✅ `backups/` - Backup directory structure

### **Documentation**
- ✅ `README_live_scores.md` - Usage instructions
- ✅ `API_live_scores.md` - API documentation
- ✅ `TROUBLESHOOTING.md` - Common issues & solutions

### **Testing Evidence**
- ✅ Unit test results (>90% coverage)
- ✅ Integration test results
- ✅ Performance benchmarks
- ✅ Live testing screenshots/logs

---

## 🚀 Week 1 Success Criteria

### **Functional Requirements**
- ✅ Successfully scrape live.html during actual matches
- ✅ Correctly identify and extract scores for target teams
- ✅ Accurately match scraped teams with existing data
- ✅ Merge live scores without corrupting existing data
- ✅ Create reliable backups before any changes

### **Technical Requirements**
- ✅ <30 second scrape execution time
- ✅ >95% team matching accuracy
- ✅ Zero data loss/corruption
- ✅ Robust error handling and recovery
- ✅ Memory efficient (no browser instance leaks)

### **Quality Requirements**
- ✅ >90% unit test coverage
- ✅ All integration tests passing
- ✅ Complete documentation
- ✅ Code review ready
- ✅ Production deployment ready

---

## ⚡ Daily Progress Tracking

**End of Each Day**:
- [ ] Code committed to version control
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance benchmarked
- [ ] Manual testing completed
- [ ] Issues/blockers logged

**Week 1 Completion Definition**:
*"Live score scraper successfully extracts scores from live.html, merges with existing match data while preserving data integrity, and is thoroughly tested with comprehensive error handling."*

---

**Ready to start Week 1 implementation?**
Laten we beginnen met Dag 1 - ik kan direct de `live_score_scraper.py` architecture uitwerken en beginnen met de Playwright setup!