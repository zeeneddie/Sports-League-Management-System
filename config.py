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

class ScheduleConfig:
    """Schedule configuration for data fetching"""
    DAILY_UPDATE_TIME = "10:00"
    
    # Saturday updates every 30 minutes from 16:00-19:00
    SATURDAY_TIMES = [f"{hour}:{minute:02d}" 
                      for hour in range(16, 20) 
                      for minute in [0, 30]]

class TeamFieldMappings:
    """Standard field mappings for team data extraction"""
    HOME_FIELDS = ['home', 'hometeam', 'home_team']
    AWAY_FIELDS = ['away', 'awayteam', 'away_team'] 
    HOME_SCORE_FIELDS = ['homeGoals', 'homescore', 'home_score']
    AWAY_SCORE_FIELDS = ['awayGoals', 'awayscore', 'away_score']
