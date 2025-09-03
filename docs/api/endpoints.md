# API Endpoints

Comprehensive documentation of all SPMS API endpoints, request/response formats, and error handling.

## API Overview

SPMS provides a **RESTful JSON API** for accessing processed league data. All endpoints are read-only and designed for high-performance data serving with intelligent caching.

### Base URL
```
Production: https://your-domain.com/api
Development: http://127.0.0.1:5000/api
```

### Response Format
All API responses follow a consistent JSON structure:

```json
{
  "data_field": [...],           // Main data payload
  "last_updated": "2025-08-27T10:30:00",  // ISO timestamp
  "featured_team_name": "AVV Columbia",    // Context info (main endpoint only)
  "featured_team_key": "columbia"          // Context info (main endpoint only)
}
```

### Error Format
```json
{
  "error": "Error message description",
  "status": "error",
  "timestamp": "2025-08-27T10:30:00"
}
```

## Core Data Endpoints

### 1. GET `/api/data`
**Purpose**: Main dashboard data endpoint - returns all processed views

**Response Structure**:
```json
{
  "raw_data": {
    "leaguetable": [...],
    "period1": [...],
    "period2": [...], 
    "period3": [...],
    "results": [...],
    "program": [...]
  },
  "league_table": [...],
  "period_standings": [...],
  "last_week_results": [...],
  "next_week_matches": [...],
  "featured_team_matches": {
    "played": [...],
    "upcoming": [...]
  },
  "weekly_results": {...},
  "team_matrix": {
    "teams": [...],
    "matrix": {...}
  },
  "all_matches": [...],
  "featured_team_name": "AVV Columbia",
  "featured_team_key": "columbia",
  "last_updated": "2025-08-27T10:30:00"
}
```

**Usage**: Primary endpoint for dashboard initialization and full data refresh

**Performance**: 
- Cached response: 10-20ms
- Full payload: ~100KB
- Cache duration: Up to 30 minutes

### 2. GET `/api/standings`
**Purpose**: Current league table standings

**Response Structure**:
```json
{
  "league_table": [
    {
      "team": "AVV Columbia",
      "position": 1,
      "played": 10,
      "wins": 8,
      "draws": 1,
      "losses": 1,
      "goals_for": 25,
      "goals_against": 8,
      "points": 25
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- `team`: Team name (string)
- `position`: League position (integer, 1-based)
- `played`: Matches played (integer)
- `wins`: Matches won (integer)
- `draws`: Matches drawn (integer)
- `losses`: Matches lost (integer)
- `goals_for`: Goals scored (integer)
- `goals_against`: Goals conceded (integer)
- `points`: League points (integer, 3 for win, 1 for draw)

### 3. GET `/api/period-standings`
**Purpose**: Period-specific standings (only periods with played matches)

**Response Structure**:
```json
{
  "period_standings": [
    {
      "name": "Periode 1",
      "standings": [
        {
          "team": "AVV Columbia",
          "position": 1,
          "played": 5,
          "wins": 4,
          "draws": 1,
          "losses": 0,
          "goals_for": 12,
          "goals_against": 3,
          "points": 13
        }
      ]
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

**Business Logic**: 
- Only includes periods where at least one team has played matches
- Filters out empty or future periods automatically
- Supports up to 3 periods (standard Dutch league structure)

### 4. GET `/api/last-week-results`
**Purpose**: Match results from the last 7 days

**Response Structure**:
```json
{
  "results": [
    {
      "date": "2025-08-23",
      "time": "14:30",
      "home": "AVV Columbia",
      "away": "VV Gorecht",
      "homeGoals": 3,
      "awayGoals": 1,
      "competition": "Zaterdag 3N",
      "matchday": 5
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- `date`: Match date (ISO date string)
- `time`: Kick-off time (HH:MM format)
- `home`: Home team name
- `away`: Away team name
- `homeGoals`: Home team goals (integer)
- `awayGoals`: Away team goals (integer)
- `competition`: Competition name
- `matchday`: Match day/round number

**Business Logic**:
- Filters results to last 7 days from current date
- In test mode, returns all available results
- Sorted by date (most recent first)

### 5. GET `/api/next-week-matches`
**Purpose**: Upcoming matches in the next 7 days

**Response Structure**:
```json
{
  "matches": [
    {
      "date": "2025-08-30",
      "time": "14:30",
      "home": "AVV Columbia", 
      "away": "VV Delfzijl",
      "competition": "Zaterdag 3N",
      "matchday": 6,
      "venue": "Sportpark Columbia"
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- Same as results, but without goal fields
- `venue`: Playing venue/location (optional)

**Business Logic**:
- Filters program to next 7 days from current date
- In test mode, returns all upcoming matches
- Sorted by date (earliest first)

### 6. GET `/api/featured-team-matches`
**Purpose**: All matches for the configured featured team

**Response Structure**:
```json
{
  "featured_team_matches": {
    "played": [
      {
        "date": "2025-08-23",
        "time": "14:30",
        "opponent": "VV Gorecht",
        "venue": "home",
        "result": "3-1",
        "outcome": "win"
      }
    ],
    "upcoming": [
      {
        "date": "2025-08-30",
        "time": "14:30", 
        "opponent": "VV Delfzijl",
        "venue": "home"
      }
    ]
  },
  "featured_team_name": "AVV Columbia",
  "featured_team_key": "columbia",
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- `opponent`: Opponent team name (string)
- `venue`: "home" or "away" from featured team perspective
- `result`: Match result (e.g., "3-1") for played matches
- `outcome`: "win", "draw", or "loss" from featured team perspective

**Configuration**:
- Featured team determined by `Config.FEATURED_TEAM`
- Different teams for test mode vs. production mode
- Test mode: "VV Gorecht", Production: "AVV Columbia"

### 7. GET `/api/weekly-results`
**Purpose**: Results organized by week number

**Response Structure**:
```json
{
  "weekly_results": {
    "week_1": [
      {
        "date": "2025-08-10",
        "matches": [...]
      }
    ],
    "week_2": [...]
  },
  "last_updated": "2025-08-27T10:30:00"
}
```

**Business Logic**:
- Groups results by calculated week numbers
- Week 1 starts from season beginning
- Useful for historical analysis and reporting

### 8. GET `/api/team-matrix`
**Purpose**: Head-to-head results matrix between all teams

**Response Structure**:
```json
{
  "team_matrix": {
    "teams": [
      "AVV Columbia",
      "VV Gorecht", 
      "VV Delfzijl"
    ],
    "matrix": {
      "AVV Columbia": {
        "VV Gorecht": {
          "date": "2025-08-23",
          "result": "3-1",
          "venue": "home"
        },
        "VV Delfzijl": null
      }
    }
  },
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- `teams`: Array of all teams in competition
- `matrix`: Nested object with team1 -> team2 -> match data
- `null` values indicate matches not yet played
- `venue`: "home" or "away" from first team's perspective

### 9. GET `/api/all-matches`
**Purpose**: Complete match database (played and upcoming)

**Response Structure**:
```json
{
  "matches": [
    {
      "date": "2025-08-23",
      "time": "14:30",
      "home": "AVV Columbia",
      "away": "VV Gorecht", 
      "status": "played",
      "homeGoals": 3,
      "awayGoals": 1
    },
    {
      "date": "2025-08-30",
      "time": "14:30",
      "home": "AVV Columbia",
      "away": "VV Delfzijl",
      "status": "scheduled"
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

**Field Descriptions**:
- `status`: "played" or "scheduled"
- Goal fields only present for played matches
- Combined results and program data

## System Endpoints

### 10. GET `/api/refresh`
**Purpose**: Force immediate data refresh (administrative)

**Response Structure**:
```json
{
  "success": true,
  "message": "Data refreshed successfully",
  "timestamp": "2025-08-27T10:30:00"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to fetch data from API",
  "timestamp": "2025-08-27T10:30:00"
}
```

**Usage**: Manual cache invalidation and immediate data refresh
**Performance**: 2-5 seconds (includes full data pipeline)

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful request with data
- `500 Internal Server Error`: Data unavailable or processing error
- `404 Not Found`: Invalid endpoint
- `405 Method Not Allowed`: Wrong HTTP method (only GET supported)

### Error Scenarios

#### 1. External API Failure
```json
{
  "error": "No data available",
  "details": "External API unavailable, using cached/fallback data",
  "timestamp": "2025-08-27T10:30:00"
}
```

#### 2. Cache Corruption
```json
{
  "error": "Data processing error", 
  "details": "Cache file corrupted, rebuilding from source",
  "timestamp": "2025-08-27T10:30:00"
}
```

#### 3. Processing Failure
```json
{
  "error": "Data transformation failed",
  "details": "Invalid data format from source",
  "timestamp": "2025-08-27T10:30:00"
}
```

## Performance Characteristics

### Response Times (95th percentile)
- **Cached data**: 20ms
- **Fresh data**: 2000ms (includes external API)
- **Error responses**: 10ms

### Payload Sizes
- **Full data endpoint**: ~100KB
- **Standings**: ~5KB  
- **Results/Matches**: ~10-20KB
- **Team matrix**: ~15KB

### Cache Strategy
- **Memory cache**: Immediate response for repeated requests
- **File cache**: Fast startup after application restart
- **Scheduled updates**: Proactive cache warming
- **On-demand refresh**: Manual cache invalidation

## Rate Limiting

### Current Implementation
- **No explicit rate limiting** (read-only endpoints)
- **Natural throttling** via caching (30-minute minimum cache duration)
- **External API respect**: Limited outbound API calls

### Recommended Limits (Future Enhancement)
```yaml
Rate Limits:
  - Per IP: 100 requests/minute
  - Per endpoint: 60 requests/minute
  - Refresh endpoint: 1 request/minute
```

## Authentication & Security

### Current Security
- **CSRF exemption**: API endpoints exempt from CSRF (read-only)
- **Security headers**: Applied to all responses
- **Input validation**: No user input required
- **Output sanitization**: Safe JSON serialization

### Security Headers Applied
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY  
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## Integration Examples

### JavaScript Frontend Integration
```javascript
// Load main dashboard data
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
    }
}

// Load specific data view
async function loadStandings() {
    const response = await fetch('/api/standings');
    const data = await response.json();
    return data.league_table;
}
```

### Python Client Integration
```python
import requests

class SPMSClient:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def get_standings(self):
        response = requests.get(f"{self.base_url}/api/standings")
        response.raise_for_status()
        return response.json()
    
    def get_featured_team_matches(self):
        response = requests.get(f"{self.base_url}/api/featured-team-matches")
        response.raise_for_status()
        return response.json()
```

### cURL Examples
```bash
# Get main data
curl -X GET "http://localhost:5000/api/data"

# Get league standings
curl -X GET "http://localhost:5000/api/standings" \
  -H "Accept: application/json"

# Force data refresh
curl -X GET "http://localhost:5000/api/refresh"
```

## Monitoring & Observability

### Key Metrics to Monitor
- **Response times**: P50, P95, P99 percentiles
- **Error rates**: 4xx and 5xx responses
- **Cache hit rates**: Memory vs. file vs. API calls
- **Data freshness**: Age of cached data
- **External API health**: Success/failure rates

### Recommended Alerting
```yaml
Alerts:
  - API error rate > 5% (5 minutes)
  - Response time P95 > 500ms (5 minutes)  
  - Data staleness > 2 hours (immediate)
  - External API failures > 3 consecutive (immediate)
```

This API design provides a robust, performant, and maintainable interface for accessing SPMS league data with comprehensive error handling and caching strategies.