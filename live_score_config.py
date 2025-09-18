"""
Live Score Configuration for SPMS
Centralized configuration management for live score functionality
"""

from datetime import datetime
import os

class LiveScoreConfig:
    """Main configuration class for live score scraping"""

    # ==================== TIMING CONFIGURATION ====================

    # Live score update hours (24-hour format)
    LIVE_HOURS_START = 14  # 2 PM
    LIVE_HOURS_END = 17    # 5 PM (until 17:00, so last update at 17:00)

    # Update interval during live hours
    UPDATE_INTERVAL_MINUTES = 5

    # Days when live updates are active (0=Monday, 5=Saturday)
    LIVE_UPDATE_DAYS = [5]  # Saturday only

    # ==================== SCRAPING CONFIGURATION ====================

    # Target website
    LIVE_URL = "https://voetbaloost.nl/live.html?a=3"

    # Browser timeouts (milliseconds)
    PAGE_LOAD_TIMEOUT = 15000      # 15 seconds
    COOKIE_WAIT_TIMEOUT = 5000     # 5 seconds
    SCRAPE_TIMEOUT_SECONDS = 30    # Total scrape timeout

    # Browser settings
    BROWSER_HEADLESS = True
    BROWSER_REUSE = True

    # Error handling
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 5

    # ==================== TEAM MATCHING CONFIGURATION ====================

    # Team configuration file
    TARGET_TEAMS_FILE = "teams.config"

    # Fuzzy matching threshold (0.0 - 1.0)
    FUZZY_MATCH_THRESHOLD = 0.85

    # Known team aliases for better matching
    TEAM_ALIASES = {
        "AVV Columbia": ["Columbia", "Columbia AVV", "AVV Col.", "Col."],
        "Apeldoorn CSV": ["CSV Apeldoorn", "CSV", "Apeldoorn"],
        "Apeldoornse Boys": ["Boys Apeldoorn", "A. Boys", "Apeld. Boys"],
        "Victoria Boys": ["V. Boys", "V.Boys", "Victoria B.", "Vict. Boys"],
        "Robur et Velocitas": ["Robur", "R.e.V.", "Robur/Vel.", "Rev"],
        "ZVV 56": ["ZVV '56", "ZVV56", "ZVV-56"]
    }

    # ==================== FILE CONFIGURATION ====================

    # Output files
    LIVE_SCORES_FILE = "live_scores.json"
    BACKUP_DIR = "backups/live_scores/"

    # Log configuration
    LOG_DIR = "logs/"
    LOG_FILE = "live_score_scraper.log"
    LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR

    # ==================== DATA MERGE CONFIGURATION ====================

    # Files to update with live scores
    MERGE_TARGET_FILES = {
        "komende_wedstrijden.json": {
            "enabled": True,
            "backup": True,
            "match_field": "upcoming"
        },
        "league_data.json": {
            "enabled": True,
            "backup": True,
            "match_field": "featured_team_matches.upcoming"
        }
    }

    # Data validation rules
    VALIDATION_RULES = {
        "max_goals_per_team": 20,  # Sanity check for scores
        "max_minute": 120,         # Maximum reasonable minute
        "required_fields": ["home", "away", "homeGoals", "awayGoals"]
    }

    # ==================== VISUAL DISPLAY CONFIGURATION ====================

    # Live status indicators
    LIVE_STATUS_INDICATORS = {
        "live": "🔴 LIVE",
        "halftime": "⏸️ HT",
        "fulltime": "⏹️ FT",
        "upcoming": "🕐",
        "cancelled": "❌"
    }

    # Score display formats
    SCORE_FORMATS = {
        "live": "{homeGoals}-{awayGoals} ({minute})",
        "halftime": "{homeGoals}-{awayGoals} HT",
        "fulltime": "{homeGoals}-{awayGoals} FT",
        "upcoming": "{time}"
    }

    # ==================== HELPER METHODS ====================

    @classmethod
    def is_live_time(cls) -> bool:
        """Check if current time is within live update hours"""
        now = datetime.now()

        # Check if it's a live update day
        if now.weekday() not in cls.LIVE_UPDATE_DAYS:
            return False

        # Check if within live hours
        current_hour = now.hour
        return cls.LIVE_HOURS_START <= current_hour <= cls.LIVE_HOURS_END

    @classmethod
    def get_next_update_time(cls) -> datetime:
        """Get the next scheduled update time"""
        now = datetime.now()
        next_update = now.replace(
            minute=(now.minute // cls.UPDATE_INTERVAL_MINUTES + 1) * cls.UPDATE_INTERVAL_MINUTES,
            second=0,
            microsecond=0
        )

        # If we've passed the update time for today, schedule for next week
        if next_update.hour > cls.LIVE_HOURS_END:
            # Add 7 days and set to start time
            next_update = next_update.replace(
                day=next_update.day + 7,
                hour=cls.LIVE_HOURS_START,
                minute=0
            )

        return next_update

    @classmethod
    def create_directories(cls):
        """Create necessary directories for logs and backups"""
        os.makedirs(cls.LOG_DIR, exist_ok=True)
        os.makedirs(cls.BACKUP_DIR, exist_ok=True)

    @classmethod
    def get_log_file_path(cls) -> str:
        """Get full path to log file"""
        cls.create_directories()
        return os.path.join(cls.LOG_DIR, cls.LOG_FILE)

    @classmethod
    def get_backup_file_path(cls, original_file: str) -> str:
        """Get backup file path with timestamp"""
        cls.create_directories()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{os.path.basename(original_file)}.{timestamp}.backup"
        return os.path.join(cls.BACKUP_DIR, filename)

    @classmethod
    def get_team_aliases(cls, team_name: str) -> list:
        """Get all known aliases for a team"""
        # Return the team name plus any known aliases
        aliases = [team_name]

        for canonical_name, alias_list in cls.TEAM_ALIASES.items():
            if team_name.lower() == canonical_name.lower():
                aliases.extend(alias_list)
            elif team_name.lower() in [alias.lower() for alias in alias_list]:
                aliases.append(canonical_name)
                aliases.extend(alias_list)

        return list(set(aliases))  # Remove duplicates

    @classmethod
    def format_score_display(cls, match_data: dict) -> str:
        """Format score for display based on match status"""
        status = match_data.get('status', 'upcoming').lower()

        if status == 'live' and 'minute' in match_data:
            return cls.SCORE_FORMATS['live'].format(**match_data)
        elif status in ['ht', 'halftime']:
            return cls.SCORE_FORMATS['halftime'].format(**match_data)
        elif status in ['ft', 'fulltime']:
            return cls.SCORE_FORMATS['fulltime'].format(**match_data)
        else:
            return cls.SCORE_FORMATS['upcoming'].format(**match_data)

class DevelopmentConfig(LiveScoreConfig):
    """Development environment configuration"""

    # Development overrides
    BROWSER_HEADLESS = False  # Show browser for debugging
    LOG_LEVEL = "DEBUG"
    UPDATE_INTERVAL_MINUTES = 1  # More frequent updates for testing
    LIVE_HOURS_START = 0  # Allow testing at any time
    LIVE_HOURS_END = 23
    LIVE_UPDATE_DAYS = [0, 1, 2, 3, 4, 5, 6]  # All days for testing

class ProductionConfig(LiveScoreConfig):
    """Production environment configuration"""

    # Production overrides
    BROWSER_HEADLESS = True
    LOG_LEVEL = "INFO"
    MAX_RETRIES = 5  # More retries in production
    SCRAPE_TIMEOUT_SECONDS = 45  # Longer timeout for stability

# Configuration selector
def get_config():
    """Get configuration based on environment"""
    env = os.getenv('ENVIRONMENT', 'production').lower()

    if env == 'development':
        return DevelopmentConfig
    else:
        return ProductionConfig

# Global config instance
Config = get_config()