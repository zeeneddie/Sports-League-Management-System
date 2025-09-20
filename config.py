import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY')
    DATABASE_URL = os.getenv('DATABASE_URL')
    FOOTBALL_DATA_API_KEY = os.getenv('FOOTBALL_DATA_API_KEY')
    USE_TEST_DATA = os.getenv('USE_TEST_DATA', 'false').lower() == 'true'
    
    # Screen display duration configuration
    SCREEN_DURATION_SECONDS = int(os.getenv('SCREEN_DURATION_SECONDS', '12'))
    
    # Featured team configuration - depends on test/production mode
    FEATURED_TEAM = 'VV Gorecht' if USE_TEST_DATA else 'AVV Columbia'
    FEATURED_TEAM_KEY = 'gorecht' if USE_TEST_DATA else 'columbia'
    
    # SSL Configuration
    USE_SSL = os.getenv('USE_SSL', 'false').lower() == 'true'
    SSL_CERT_PATH = os.getenv('SSL_CERT_PATH', 'ssl/cert.pem')
    SSL_KEY_PATH = os.getenv('SSL_KEY_PATH', 'ssl/key.pem')
    SSL_PORT = int(os.getenv('SSL_PORT', '5443'))
    HTTP_PORT = int(os.getenv('HTTP_PORT', '5000'))

class ScheduleConfig:
    """Schedule configuration for data fetching"""

    # Working scraper schedule
    THURSDAY_MORNING_TIME = "09:00"
    SATURDAY_MORNING_TIME = "09:00"

    # Saturday updates every 15 minutes from 15:30 onwards
    SATURDAY_QUARTER_HOUR_TIMES = [f"15:{minute:02d}" for minute in [30, 45]] + \
                                  [f"{hour}:{minute:02d}"
                                   for hour in range(16, 20)
                                   for minute in [0, 15, 30, 45]]

class TeamFieldMappings:
    """Standard field mappings for team data extraction"""
    HOME_FIELDS = ['home', 'hometeam', 'home_team']
    AWAY_FIELDS = ['away', 'awayteam', 'away_team'] 
    HOME_SCORE_FIELDS = ['homeGoals', 'homescore', 'home_score']
    AWAY_SCORE_FIELDS = ['awayGoals', 'awayscore', 'away_score']
