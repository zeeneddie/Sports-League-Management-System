# Data Models

Comprehensive documentation of data structures, schemas, and models used throughout SPMS.

## Model Overview

SPMS uses **strongly-typed data models** with consistent field naming and validation throughout the data pipeline. All models are designed for JSON serialization and API compatibility.

### Model Categories
1. **Core League Models**: Teams, standings, matches
2. **Processed View Models**: Dashboard-specific data structures  
3. **Configuration Models**: Application and feature settings
4. **External API Models**: Integration with hollandsevelden.nl

## Core League Models

### 1. Team Model
**Purpose**: Represents a football team with league statistics

```python
@dataclass
class Team:
    team: str                    # Team name
    position: int                # League position (1-based)
    played: int                  # Matches played
    wins: int                   # Matches won
    draws: int                  # Matches drawn
    losses: int                 # Matches lost
    goals_for: int              # Goals scored
    goals_against: int          # Goals conceded
    points: int                 # League points (3 win, 1 draw, 0 loss)
    
    # Calculated properties
    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against
    
    @property
    def win_percentage(self) -> float:
        return (self.wins / self.played * 100) if self.played > 0 else 0.0
```

**JSON Schema**:
```json
{
  "type": "object",
  "required": ["team", "position", "played", "wins", "draws", "losses", "goals_for", "goals_against", "points"],
  "properties": {
    "team": {"type": "string", "minLength": 1, "maxLength": 50},
    "position": {"type": "integer", "minimum": 1, "maximum": 50},
    "played": {"type": "integer", "minimum": 0, "maximum": 50},
    "wins": {"type": "integer", "minimum": 0},
    "draws": {"type": "integer", "minimum": 0},
    "losses": {"type": "integer", "minimum": 0},
    "goals_for": {"type": "integer", "minimum": 0},
    "goals_against": {"type": "integer", "minimum": 0},
    "points": {"type": "integer", "minimum": 0}
  }
}
```

**Example**:
```json
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
```

**Validation Rules**:
- `wins + draws + losses = played`
- `points = (wins * 3) + (draws * 1)`
- Team names must be unique within a league
- Position must be unique within a league

### 2. Match Model
**Purpose**: Represents a football match (played or scheduled)

```python
@dataclass
class Match:
    date: str                   # ISO date (YYYY-MM-DD)
    time: Optional[str]         # Time (HH:MM format)
    home: str                   # Home team name
    away: str                   # Away team name
    competition: Optional[str]  # Competition name
    matchday: Optional[int]     # Match round/day number
    venue: Optional[str]        # Playing venue
    
    # Results (only for played matches)
    homeGoals: Optional[int] = None    # Home team goals
    awayGoals: Optional[int] = None    # Away team goals
    status: str = "scheduled"          # "scheduled" or "played"
    
    @property
    def is_played(self) -> bool:
        return self.homeGoals is not None and self.awayGoals is not None
    
    @property
    def result_string(self) -> Optional[str]:
        if self.is_played:
            return f"{self.homeGoals}-{self.awayGoals}"
        return None
    
    def get_outcome_for_team(self, team_name: str) -> Optional[str]:
        """Get match outcome from a specific team's perspective"""
        if not self.is_played:
            return None
            
        if team_name == self.home:
            if self.homeGoals > self.awayGoals:
                return "win"
            elif self.homeGoals < self.awayGoals:
                return "loss"
            else:
                return "draw"
        elif team_name == self.away:
            if self.awayGoals > self.homeGoals:
                return "win"
            elif self.awayGoals < self.homeGoals:
                return "loss"
            else:
                return "draw"
        return None
```

**JSON Schema**:
```json
{
  "type": "object",
  "required": ["date", "home", "away"],
  "properties": {
    "date": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$"},
    "time": {"type": "string", "pattern": "^\\d{2}:\\d{2}$"},
    "home": {"type": "string", "minLength": 1},
    "away": {"type": "string", "minLength": 1},
    "competition": {"type": "string"},
    "matchday": {"type": "integer", "minimum": 1},
    "venue": {"type": "string"},
    "homeGoals": {"type": "integer", "minimum": 0},
    "awayGoals": {"type": "integer", "minimum": 0},
    "status": {"type": "string", "enum": ["scheduled", "played"]}
  }
}
```

**Examples**:

*Played Match*:
```json
{
  "date": "2025-08-23",
  "time": "14:30",
  "home": "AVV Columbia",
  "away": "VV Gorecht",
  "homeGoals": 3,
  "awayGoals": 1,
  "competition": "Zaterdag 3N",
  "matchday": 5,
  "venue": "Sportpark Columbia",
  "status": "played"
}
```

*Scheduled Match*:
```json
{
  "date": "2025-08-30",
  "time": "14:30",
  "home": "AVV Columbia",
  "away": "VV Delfzijl",
  "competition": "Zaterdag 3N",
  "matchday": 6,
  "venue": "Sportpark Columbia",
  "status": "scheduled"
}
```

### 3. Period Standings Model
**Purpose**: League standings for a specific period (e.g., first half of season)

```python
@dataclass
class PeriodStandings:
    name: str                   # Period name (e.g., "Periode 1")
    standings: List[Team]       # Team standings for this period
    
    @property
    def has_played_matches(self) -> bool:
        """Check if any matches have been played in this period"""
        return any(team.played > 0 for team in self.standings)
    
    @property
    def total_matches_played(self) -> int:
        return sum(team.played for team in self.standings) // 2  # Divide by 2 (each match involves 2 teams)
```

**JSON Schema**:
```json
{
  "type": "object",
  "required": ["name", "standings"],
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "standings": {
      "type": "array",
      "items": {"$ref": "#/definitions/Team"}
    }
  }
}
```

## Processed View Models

### 4. Featured Team Matches Model
**Purpose**: All matches for a specific featured team

```python
@dataclass
class FeaturedTeamMatch:
    date: str                   # ISO date
    time: Optional[str]         # Time (HH:MM)
    opponent: str               # Opponent team name
    venue: str                  # "home" or "away"
    result: Optional[str] = None        # "3-1" format for played matches
    outcome: Optional[str] = None       # "win", "draw", "loss" for played matches
    
    @classmethod
    def from_match(cls, match: Match, featured_team: str) -> 'FeaturedTeamMatch':
        """Create FeaturedTeamMatch from regular Match"""
        if match.home == featured_team:
            opponent = match.away
            venue = "home"
        else:
            opponent = match.home  
            venue = "away"
        
        result = match.result_string if match.is_played else None
        outcome = match.get_outcome_for_team(featured_team) if match.is_played else None
        
        return cls(
            date=match.date,
            time=match.time,
            opponent=opponent,
            venue=venue,
            result=result,
            outcome=outcome
        )

@dataclass
class FeaturedTeamMatches:
    played: List[FeaturedTeamMatch]     # Historical matches
    upcoming: List[FeaturedTeamMatch]   # Future matches
    team_name: str                      # Featured team name
    team_key: str                       # Featured team identifier
```

**JSON Example**:
```json
{
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
}
```

### 5. Team Matrix Model
**Purpose**: Head-to-head results between all teams

```python
@dataclass
class TeamMatrixEntry:
    date: Optional[str] = None          # Match date
    result: Optional[str] = None        # Match result
    venue: Optional[str] = None         # "home" or "away" from first team's perspective
    
@dataclass 
class TeamMatrix:
    teams: List[str]                    # All team names
    matrix: Dict[str, Dict[str, Optional[TeamMatrixEntry]]]  # team1 -> team2 -> match data
    
    def get_match(self, team1: str, team2: str) -> Optional[TeamMatrixEntry]:
        """Get match result between two teams"""
        return self.matrix.get(team1, {}).get(team2)
    
    def set_match(self, team1: str, team2: str, match_data: TeamMatrixEntry):
        """Set match result between two teams"""
        if team1 not in self.matrix:
            self.matrix[team1] = {}
        self.matrix[team1][team2] = match_data
```

**JSON Example**:
```json
{
  "teams": ["AVV Columbia", "VV Gorecht", "VV Delfzijl"],
  "matrix": {
    "AVV Columbia": {
      "VV Gorecht": {
        "date": "2025-08-23", 
        "result": "3-1",
        "venue": "home"
      },
      "VV Delfzijl": null
    },
    "VV Gorecht": {
      "AVV Columbia": {
        "date": "2025-08-23",
        "result": "1-3", 
        "venue": "away"
      }
    }
  }
}
```

### 6. Weekly Results Model
**Purpose**: Match results organized by week number

```python
@dataclass
class WeeklyResults:
    results_by_week: Dict[str, List[Match]]    # "week_1" -> matches
    
    def get_week_matches(self, week_number: int) -> List[Match]:
        """Get matches for specific week"""
        return self.results_by_week.get(f"week_{week_number}", [])
    
    @property
    def total_weeks(self) -> int:
        return len(self.results_by_week)
```

## Configuration Models

### 7. Application Configuration
**Purpose**: Core application settings and environment configuration

```python
@dataclass
class Config:
    SECRET_KEY: str
    DATABASE_URL: Optional[str] = None
    FOOTBALL_DATA_API_KEY: Optional[str] = None
    USE_TEST_DATA: bool = False
    SCREEN_DURATION_SECONDS: int = 12
    FEATURED_TEAM: str = "AVV Columbia"
    FEATURED_TEAM_KEY: str = "columbia"

@dataclass
class ScheduleConfig:
    DAILY_UPDATE_TIME: str = "10:00"
    SATURDAY_TIMES: List[str] = None
    
    def __post_init__(self):
        if self.SATURDAY_TIMES is None:
            self.SATURDAY_TIMES = [f"{hour}:{minute:02d}" 
                                   for hour in range(16, 20) 
                                   for minute in [0, 30]]

@dataclass
class TeamFieldMappings:
    """Field mappings for data normalization"""
    HOME_FIELDS: List[str] = None
    AWAY_FIELDS: List[str] = None
    HOME_SCORE_FIELDS: List[str] = None
    AWAY_SCORE_FIELDS: List[str] = None
    
    def __post_init__(self):
        self.HOME_FIELDS = self.HOME_FIELDS or ['home', 'hometeam', 'home_team']
        self.AWAY_FIELDS = self.AWAY_FIELDS or ['away', 'awayteam', 'away_team']
        self.HOME_SCORE_FIELDS = self.HOME_SCORE_FIELDS or ['homeGoals', 'homescore', 'home_score']
        self.AWAY_SCORE_FIELDS = self.AWAY_SCORE_FIELDS or ['awayGoals', 'awayscore', 'away_score']
```

## External API Models

### 8. hollandsevelden.nl API Response Model
**Purpose**: Raw API response structure from external data source

```python
@dataclass
class HollandseVeldenResponse:
    leaguetable: List[Dict[str, Any]]   # Raw league table
    period1: List[Dict[str, Any]]       # Period 1 standings
    period2: List[Dict[str, Any]]       # Period 2 standings  
    period3: List[Dict[str, Any]]       # Period 3 standings
    results: List[Dict[str, Any]]       # Match results
    program: List[Dict[str, Any]]       # Match schedule
```

**Raw API Team Structure**:
```json
{
  "name": "AVV Columbia",
  "position": 1,
  "matches": 10,
  "wins": 8,
  "ties": 1,
  "losses": 1,
  "goalsFor": 25,
  "goalsAgainst": 8,
  "points": 25
}
```

**Raw API Match Structure**:
```json
{
  "date": "23-08-2025",
  "time": "14:30", 
  "hometeam": "AVV Columbia",
  "awayteam": "VV Gorecht",
  "homeGoals": 3,
  "awayGoals": 1,
  "competition": "Zaterdag 3N"
}
```

### 9. Data Normalization
**Purpose**: Convert external API formats to internal models

```python
def normalize_team_data(raw_team: Dict[str, Any]) -> Team:
    """Convert raw API team data to Team model"""
    return Team(
        team=raw_team.get('name', raw_team.get('team', '')),
        position=raw_team.get('position', 0),
        played=raw_team.get('matches', raw_team.get('played', 0)),
        wins=raw_team.get('wins', 0),
        draws=raw_team.get('ties', raw_team.get('draws', 0)),
        losses=raw_team.get('losses', 0),
        goals_for=raw_team.get('goalsFor', raw_team.get('goals_for', 0)),
        goals_against=raw_team.get('goalsAgainst', raw_team.get('goals_against', 0)),
        points=raw_team.get('points', 0)
    )

def normalize_match_data(raw_match: Dict[str, Any]) -> Match:
    """Convert raw API match data to Match model"""
    # Normalize date format from DD-MM-YYYY to YYYY-MM-DD
    raw_date = raw_match.get('date', '')
    normalized_date = convert_date_format(raw_date)
    
    return Match(
        date=normalized_date,
        time=raw_match.get('time'),
        home=get_field_value(raw_match, TeamFieldMappings.HOME_FIELDS),
        away=get_field_value(raw_match, TeamFieldMappings.AWAY_FIELDS),
        homeGoals=get_field_value(raw_match, TeamFieldMappings.HOME_SCORE_FIELDS),
        awayGoals=get_field_value(raw_match, TeamFieldMappings.AWAY_SCORE_FIELDS),
        competition=raw_match.get('competition'),
        matchday=raw_match.get('matchday'),
        venue=raw_match.get('venue'),
        status="played" if raw_match.get('homeGoals') is not None else "scheduled"
    )
```

## Validation and Constraints

### Data Validation Rules

#### Team Validation
```python
def validate_team(team: Team) -> List[str]:
    """Validate team data and return list of errors"""
    errors = []
    
    if not team.team or len(team.team.strip()) == 0:
        errors.append("Team name cannot be empty")
    
    if team.position < 1:
        errors.append("Position must be positive integer")
    
    if team.played < 0:
        errors.append("Played matches cannot be negative")
    
    if team.wins + team.draws + team.losses != team.played:
        errors.append("Wins + draws + losses must equal played matches")
    
    if team.points != (team.wins * 3 + team.draws):
        errors.append("Points calculation is incorrect")
    
    if team.goals_for < 0 or team.goals_against < 0:
        errors.append("Goals cannot be negative")
    
    return errors
```

#### Match Validation
```python
def validate_match(match: Match) -> List[str]:
    """Validate match data and return list of errors"""
    errors = []
    
    if not match.date:
        errors.append("Match date is required")
    
    if not match.home or not match.away:
        errors.append("Both home and away teams are required")
    
    if match.home == match.away:
        errors.append("Home and away teams cannot be the same")
    
    if match.is_played:
        if match.homeGoals is None or match.awayGoals is None:
            errors.append("Played matches must have goal scores")
        
        if match.homeGoals < 0 or match.awayGoals < 0:
            errors.append("Goal scores cannot be negative")
    
    return errors
```

### Business Rules

#### League Integrity Rules
1. **Unique Positions**: No two teams can have the same league position
2. **Unique Team Names**: Team names must be unique within a league
3. **Match Consistency**: Each match must involve exactly two different teams
4. **Point Calculation**: Points must equal (wins × 3) + (draws × 1)
5. **Match Balance**: Total goals for all teams must equal total goals against

#### Data Freshness Rules
1. **Cache Expiry**: Cached data expires after 30 minutes maximum
2. **Update Windows**: Data updates respect configured time windows
3. **Fallback Timeout**: API failures trigger immediate fallback after 30 seconds

#### Security Constraints
1. **Input Sanitization**: All text fields sanitized for XSS prevention
2. **Length Limits**: Team names limited to 50 characters
3. **Numeric Bounds**: All numeric fields have reasonable upper bounds
4. **Date Validation**: Dates must be valid ISO format

## Serialization and Deserialization

### JSON Serialization
```python
import json
from datetime import datetime
from typing import Any, Dict

class SPMSJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for SPMS models"""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        
        if hasattr(obj, '__dict__'):
            return obj.__dict__
        
        return super().default(obj)

def serialize_to_json(data: Any) -> str:
    """Serialize SPMS models to JSON"""
    return json.dumps(data, cls=SPMSJSONEncoder, ensure_ascii=False, indent=2)
```

### Database Schema (Future Enhancement)
```sql
-- PostgreSQL schema for future database integration

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    position INTEGER NOT NULL,
    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,  
    losses INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_played CHECK (wins + draws + losses = played),
    CONSTRAINT valid_points CHECK (points = wins * 3 + draws),
    CONSTRAINT non_negative_goals CHECK (goals_for >= 0 AND goals_against >= 0)
);

CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    match_time TIME,
    home_team VARCHAR(50) NOT NULL,
    away_team VARCHAR(50) NOT NULL,
    home_goals INTEGER,
    away_goals INTEGER,
    competition VARCHAR(100),
    matchday INTEGER,
    venue VARCHAR(100),
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT different_teams CHECK (home_team != away_team),
    CONSTRAINT non_negative_scores CHECK (home_goals >= 0 AND away_goals >= 0),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'played'))
);
```

This comprehensive data model documentation provides a solid foundation for understanding SPMS data structures and supports future enhancements including database migration and advanced validation.