import schedule
import time
import threading
from datetime import datetime
from hollandsevelden import (
    get_data, 
    get_filtered_period_standings,
    get_last_week_results,
    get_next_week_matches,
    get_featured_team_matches,
    get_weekly_results,
    create_team_matrix,
    get_all_matches
)
import json
import os
from dotenv import load_dotenv
from config import Config, ScheduleConfig

# Load environment variables
load_dotenv()


class DataScheduler:
    def __init__(self):
        self.data_file = 'league_data.json'
        self.last_update = None
        self.cached_data = None
        
    def fetch_and_process_data(self):
        """Fetch data from API and process all required views"""
        print(f"Fetching data at {datetime.now()}")
        
        # Check if we should use test data
        use_test_data = Config.USE_TEST_DATA
        print(f"Scheduler: USE_TEST_DATA = {use_test_data}")
        
        try:
            # Get raw data (will use test data if configured)
            raw_data = get_data(use_test_data=use_test_data)
            if not raw_data:
                print("Failed to fetch data")
                return
            
            
            # Process all required views
            processed_data = {
                'raw_data': raw_data,
                'league_table': raw_data.get('leaguetable', []),
                'period_standings': get_filtered_period_standings(raw_data),
                'last_week_results': get_last_week_results(raw_data),
                'next_week_matches': get_next_week_matches(raw_data),
                'featured_team_matches': get_featured_team_matches(raw_data),
                'weekly_results': get_weekly_results(raw_data),
                'team_matrix': create_team_matrix(raw_data),
                'all_matches': get_all_matches(raw_data),
                'last_updated': datetime.now().isoformat()
            }
            
            # Save to file
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(processed_data, f, ensure_ascii=False, indent=2)
            
            self.cached_data = processed_data
            self.last_update = datetime.now()
            print(f"Data successfully updated and saved at {self.last_update}")
            
        except Exception as e:
            print(f"Error fetching/processing data: {e}")
    
    def get_cached_data(self):
        """Get cached data, load from file if not in memory"""
        if Config.USE_TEST_DATA:
            print("Test mode enabled - fetching fresh test data...")
            self.fetch_and_process_data()
            return self.cached_data
            
        if self.cached_data is None:
            try:
                if os.path.exists(self.data_file):
                    with open(self.data_file, 'r', encoding='utf-8') as f:
                        self.cached_data = json.load(f)
                        if 'last_updated' in self.cached_data:
                            self.last_update = datetime.fromisoformat(self.cached_data['last_updated'])
                else:
                    print("No cached data file found, fetching fresh data...")
                    self.fetch_and_process_data()
            except Exception as e:
                print(f"Error loading cached data: {e}")
                self.fetch_and_process_data()
        
        return self.cached_data
    
    def start_scheduler(self):
        """Start the background scheduler"""
        # Schedule daily update
        schedule.every().day.at(ScheduleConfig.DAILY_UPDATE_TIME).do(self.fetch_and_process_data)
        
        # Schedule Saturday updates using centralized configuration
        for time_slot in ScheduleConfig.SATURDAY_TIMES:
            schedule.every().saturday.at(time_slot).do(self.fetch_and_process_data)
        
        # Initial data fetch if no cached data
        if not os.path.exists(self.data_file):
            self.fetch_and_process_data()
        
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        # Start scheduler in background thread
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        print("Data scheduler started")


# Global scheduler instance
data_scheduler = DataScheduler()