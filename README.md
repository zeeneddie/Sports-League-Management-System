# Sports League Management System (SPMS)

A real-time sports dashboard application built with Flask that provides automated league data visualization through a carousel-based interface. The system integrates with external APIs to display comprehensive league standings, match results, and team-specific information optimized for continuous display in sports venues.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard Interface (Bootstrap 5 + Vanilla JS)                │
│  ├── 6 Carousel Screens (Auto-rotating)                        │
│  ├── Real-time Data Updates (30min intervals)                  │
│  └── Responsive Design with Team Branding                      │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/AJAX
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Flask Web Framework                                            │
│  ├── Main Dashboard Route (/)                                  │
│  ├── 8 REST API Endpoints (/api/*)                            │
│  ├── CSRF Protection & Security Headers                        │
│  └── Error Handling (404/500)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  Data Processing Engine                                         │
│  ├── League Data Processor (hollandsevelden.py)               │
│  ├── 8 Specialized Data Views                                  │
│  ├── Team Matrix Generator                                     │
│  └── Featured Team Logic (Columbia/Gorecht)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Background Scheduler (scheduler.py)                           │
│  ├── Daily Updates (10:00 AM)                                 │
│  ├── Saturday Peak Updates (16:00-19:00, every 30min)        │
│  ├── Smart Caching (league_data.json)                        │
│  └── Test/Production Mode Support                             │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INTEGRATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  External API Integration                                       │
│  ├── Holland Sevelden API (Real-time)                         │
│  ├── Test Data Module (Development)                           │
│  ├── Fallback Mechanisms                                       │
│  └── Smart Error Recovery                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  File-based Caching System                                     │
│  ├── JSON Data Cache (league_data.json)                       │
│  ├── Session State Management                                  │
│  └── Configuration Management (.env)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Core Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      app.py                                 │
│                 (Flask Application)                         │
├─────────────────────────────────────────────────────────────┤
│  Main Dashboard Route (/)                                   │
│  8 API Endpoints (/api/*)                                  │
│  Security Configuration                                     │
│  Error Handling                                            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  scheduler.py                               │
│               (Data Scheduler)                              │
├─────────────────────────────────────────────────────────────┤
│  DataScheduler Class                                        │
│  ├── fetch_and_process_data()                              │
│  ├── get_cached_data()                                     │
│  ├── start_scheduler()                                     │
│  └── Thread Management                                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              hollandsevelden.py                             │
│            (Data Processing Engine)                         │
├─────────────────────────────────────────────────────────────┤
│  get_data()                     │  create_team_matrix()     │
│  get_filtered_period_standings() │  get_all_matches()       │
│  get_last_week_results()        │  get_featured_team_matches() │
│  get_next_week_matches()        │  get_weekly_results()     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   config.py                                 │
│              (Configuration Manager)                        │
├─────────────────────────────────────────────────────────────┤
│  Environment Variables Loading                              │
│  Featured Team Selection Logic                             │
│  Test/Production Mode Switching                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
External API                Test Data                    
     │                          │                       
     ▼                          ▼                       
┌─────────────────────────────────────────┐            
│         hollandsevelden.py              │            
│       (Data Integration)                │            
└─────────────────────────────────────────┘            
                    │                                  
                    ▼                                  
┌─────────────────────────────────────────┐            
│           scheduler.py                  │            
│        (Processing & Caching)           │            
└─────────────────────────────────────────┘            
                    │                                  
                    ▼                                  
┌─────────────────────────────────────────┐            
│         league_data.json                │            
│           (Persistent Cache)            │            
└─────────────────────────────────────────┘            
                    │                                  
                    ▼                                  
┌─────────────────────────────────────────┐            
│             app.py                      │            
│         (API Endpoints)                 │            
└─────────────────────────────────────────┘            
                    │                                  
                    ▼                                  
┌─────────────────────────────────────────┐            
│         dashboard.html                  │            
│      (Frontend Interface)               │            
└─────────────────────────────────────────┘            
```

## 🎯 Features

### Core Dashboard Features

#### 1. **Carousel Dashboard System**
- **6 Auto-rotating Screens** with 10-second intervals
- **Manual Navigation** via keyboard (arrow keys) and indicators  
- **Progressive Enhancement** with countdown timer and screen numbering
- **Responsive Design** optimized for HD displays

#### 2. **League Standings Display**
- **Main League Table** with complete standings
- **Period Standings** (filtered for played matches only)
- **Team Statistics** (Played, Won, Drawn, Lost, Points)
- **Form Indicators** showing last 5 match results per team
- **Featured Team Highlighting** (Columbia/Gorecht based on mode)

#### 3. **Match Results & Fixtures**
- **Last Week Results** from most recent played matches
- **Next Week Fixtures** with intelligent week detection
- **Date Formatting** in Dutch locale (dag DD mmm yyyy)
- **Team Logo Integration** across all match displays

#### 4. **Featured Team Focus**
- **Dedicated Team Screen** with home/away match separation
- **Complete Match History** (played and upcoming)
- **Dynamic Team Selection** (Columbia for production, Gorecht for test)
- **Enhanced Visual Highlighting** throughout all screens

#### 5. **Team vs Team Matrix**
- **Complete Results Grid** showing all team matchups
- **Score Display** for completed matches
- **Fixture Dates** for upcoming matches  
- **Compact Visual Layout** with team logos in headers

#### 6. **Real-time Data Integration**
- **External API Integration** with hollandsevelden.nl
- **Automated Scheduling** (daily + Saturday peak times)
- **Smart Caching** with JSON persistence
- **Graceful Fallback** to test data on API failures

### Technical Features

#### 1. **Security & Performance**
- **CSRF Protection** with Flask-WTF
- **Security Headers** (XSS, Frame Options, CSP)
- **HTTPS Enforcement** in production
- **Content Security Policy** allowing Bootstrap CDN

#### 2. **Data Processing Engine**
- **8 Specialized Views** for different data presentations
- **Intelligent Date Parsing** handling multiple formats
- **Team Name Matching** with fuzzy logic
- **Score Extraction** from multiple field variations

#### 3. **Background Automation**
- **Smart Scheduling** with different update frequencies
- **Thread-based Execution** for non-blocking operations
- **Error Recovery** with automatic retries
- **Test/Production Mode** switching

#### 4. **Frontend Intelligence**
- **Dynamic Content Generation** with JavaScript templating
- **Form Indicators Logic** for match result visualization
- **Team Logo Mapping** with fallback handling
- **Responsive Typography** scaling for different screen sizes

## 🚀 Quick Start

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration
Create `.env` file with:
```
SECRET_KEY=your_secret_key_here
USE_TEST_DATA=false
SCREEN_DURATION_SECONDS=5
```

#### Environment Variables
- `SECRET_KEY`: Flask secret key for security
- `USE_TEST_DATA`: Set to `true` for development with VV Gorecht as featured team, `false` for production with AVV Columbia
- `SCREEN_DURATION_SECONDS`: Duration each screen is displayed (default: 5 seconds)
  - Development: Use shorter times like `3` for faster testing
  - Production: Use longer times like `8` or `10` for better readability

### Running the Application
```bash
# Development server (starts scheduler automatically)
python app.py

# Production server
gunicorn app:app
```

### Code Quality
```bash
# Linting with ruff
ruff check .

# Type checking with pyright
pyright

# Format code with ruff
ruff format .
```

## 📡 API Endpoints

### Core Data Endpoints
- **`/`** - Main dashboard with carousel interface
- **`/api/data`** - Get all cached dashboard data
- **`/api/standings`** - Get main league table
- **`/api/period-standings`** - Get period standings with played matches
- **`/api/last-week-results`** - Get results from last 7 days
- **`/api/next-week-matches`** - Get matches for next 7 days
- **`/api/featured-team-matches`** - Get all featured team matches
- **`/api/team-matrix`** - Get team vs team results/schedule matrix
- **`/api/all-matches`** - Get all matches (played and upcoming)
- **`/api/weekly-results`** - Get results grouped by week
- **`/api/refresh`** - Force refresh of data

### Response Format
```json
{
  "data": { ... },
  "last_updated": "2025-01-23T10:30:00Z"
}
```

## 🎨 Dashboard Screens

### Screen 1: Main League Standings
- Complete league table with logos and form indicators
- Team statistics (G/W/D/L/P)
- Featured team highlighting
- Last 5 matches visualization

### Screen 2: Period Standings  
- Period tables (only active periods)
- Same format as main standings
- Filtered for periods with played matches

### Screen 3: Recent Results
- Last played week's matches
- Score displays with team logos
- Automatic week detection
- Maximum 8 matches shown

### Screen 4: Upcoming Fixtures
- Next week's matches
- Date and time information
- Grouped by week with headers
- Featured team matches prioritized

### Screen 5: Featured Team Matches
- Two-column layout (Home/Away)
- Complete match history
- Played matches show scores
- Upcoming matches show dates

### Screen 6: Team Matrix
- Complete team vs team grid
- Results for played matches
- Fixture dates for upcoming
- Compact visual design

## ⚙️ Configuration

### Environment Variables
```bash
SECRET_KEY=your_secret_key           # Flask secret key
USE_TEST_DATA=false                  # Enable test data mode
FEATURED_TEAM=AVV Columbia           # Production featured team
FEATURED_TEAM_KEY=columbia           # Team matching key
```

### Scheduling Configuration
```python
# Daily update at 10:00 AM
schedule.every().day.at("10:00").do(fetch_and_process_data)

# Saturday updates (16:00-19:00, every 30 minutes)
schedule.every().saturday.at("16:00").do(fetch_and_process_data)
schedule.every().saturday.at("16:30").do(fetch_and_process_data)
# ... continues until 19:00
```

### Team Logo Mapping
Team logos are automatically mapped based on team names in `teamLogos` object in `dashboard.html`. Fallback handling ensures graceful degradation when logos are missing.

## 🔧 Development

### Project Structure
```
SPMS/
├── app.py                    # Flask application
├── scheduler.py              # Background data scheduler
├── hollandsevelden.py        # Data processing engine
├── config.py                 # Configuration management
├── test_data.py              # Test data for development
├── templates/
│   └── dashboard.html        # Main dashboard interface
├── static/
│   └── images/
│       └── team_logos/       # Team logo assets
├── requirements.txt          # Python dependencies
├── league_data.json          # Cached data (auto-generated)
└── .env                      # Environment configuration
```

### Architecture Patterns Used
- **Event-Driven**: Scheduler triggers data updates
- **Cache-Aside**: API endpoints read from cache
- **Circuit Breaker**: Graceful API failure handling
- **Observer Pattern**: Real-time frontend updates

### Quality Attributes

#### **Maintainability**
- Modular design with clear separation of concerns
- Configuration-driven behavior
- Comprehensive error handling
- Single responsibility principle

#### **Reliability**
- Graceful degradation to test data
- Persistent local caching
- Background processing isolation
- Input validation and sanitization

#### **Performance**  
- Efficient JSON-based caching
- Strategic update timing
- Client-side presentation logic
- Minimal external dependencies

#### **Scalability**
- Stateless web application design
- Modular architecture for extensions
- API-first data access pattern
- Environment-driven configuration

## 📊 Data Sources

### Primary: Holland Sevelden API
- **Endpoint**: `https://api.hollandsevelden.nl/competities/2025-2026/oost/za/3n/`
- **Format**: JSON with league tables, periods, results, programs
- **Update Frequency**: Daily + Saturday peak hours
- **Fallback**: Test data on API failure

### Data Processing Pipeline
1. **Fetch** - Retrieve raw data from API
2. **Validate** - Check data integrity and format
3. **Transform** - Process into 8 specialized views
4. **Cache** - Store in local JSON file
5. **Serve** - Provide via REST API endpoints

### Test Data Mode
Set `USE_TEST_DATA=true` for development with static data featuring VV Gorecht as the featured team.

## 🔐 Security

### Implemented Protections
- **CSRF Protection** via Flask-WTF
- **Security Headers** (XSS, Frame Options, HSTS)
- **Content Security Policy** with whitelisted sources
- **Input Validation** on all data processing
- **Error Sanitization** preventing information disclosure

### Production Considerations
- Use strong `SECRET_KEY` value
- Enable HTTPS in production environment
- Regular security updates for dependencies
- Monitor for suspicious API usage patterns

---

**Built with**: Flask, Bootstrap 5, Python Schedule, Dutch Football League API Integration

**Optimized for**: Sports venue displays, continuous operation, real-time data visualization
