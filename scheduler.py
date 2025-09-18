import schedule
import time
import threading
import subprocess
import sys
import asyncio
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
from live_score_scraper import scrape_live_scores
from live_score_merger import merge_live_scores
from live_score_config import Config as LiveConfig

# Load environment variables
load_dotenv()


class DataScheduler:
    def __init__(self):
        self.data_file = 'league_data.json'
        self.last_update = None
        self.cached_data = None
        self.live_scores_active = False
        self.last_live_update = None
        
    def clear_cache(self):
        """Force clear all cached data"""
        print("Clearing cached data...")
        self.cached_data = None
        self.last_update = None

    def run_working_scraper(self):
        """Run the working scraper to update uitslagen.json and komende_wedstrijden.json"""
        print(f"Running working scraper at {datetime.now()}")

        try:
            # Run the working_scraper.py script
            result = subprocess.run([
                sys.executable, 'working_scraper.py'
            ], capture_output=True, text=True, timeout=300)  # 5 minute timeout

            if result.returncode == 0:
                print("Working scraper completed successfully")
                print("STDOUT:", result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
            else:
                print(f"Working scraper failed with return code {result.returncode}")
                print("STDERR:", result.stderr)

        except subprocess.TimeoutExpired:
            print("Working scraper timed out after 5 minutes")
        except Exception as e:
            print(f"Error running working scraper: {e}")

    def run_live_score_update(self):
        """Run live score scraper and merge with existing data"""
        print(f"Running live score update at {datetime.now()}")

        try:
            # Check if we're in live time
            if not LiveConfig.is_live_time():
                print("Not in live time window, skipping live score update")
                return

            # Run live score scraper
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                live_scores = loop.run_until_complete(scrape_live_scores(save_to_file=True))

                if live_scores:
                    print(f"Found {len(live_scores)} live matches")

                    # Merge into target files
                    target_files = [
                        'komende_wedstrijden.json',
                        'league_data.json'
                    ]

                    results = merge_live_scores(live_scores, target_files)

                    success_count = sum(1 for success in results.values() if success)
                    print(f"Live score merge results: {success_count}/{len(results)} files updated")

                    # Update tracking
                    self.last_live_update = datetime.now()
                    self.live_scores_active = True

                    # Force cache refresh for updated data
                    self.cached_data = None

                else:
                    print("No live matches found for target teams")

            finally:
                loop.close()

        except Exception as e:
            print(f"Error in live score update: {e}")

    def run_full_update(self):
        """Run both working scraper and API data fetch"""
        print(f"=== FULL UPDATE CYCLE STARTED at {datetime.now()} ===")

        # First run the working scraper to get latest overige clubs data
        self.run_working_scraper()

        # Then run the main data fetch for hollandsevelden data
        self.fetch_and_process_data()

        # Run live score update if we're in live time window
        if LiveConfig.is_live_time():
            print("Live time detected, running live score update...")
            self.run_live_score_update()

        print(f"=== FULL UPDATE CYCLE COMPLETED at {datetime.now()} ===\n")
        
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
        current_mode = Config.USE_TEST_DATA
        
        if current_mode:
            print("Test mode enabled - fetching fresh test data...")
            self.fetch_and_process_data()
            return self.cached_data
            
        # API mode - check if we need to fetch fresh data
        need_fresh_data = False
        
        # Always check if cached data matches current mode, even if we have data in memory
        if self.cached_data is not None:
            # Check if in-memory cached data matches current mode
            cached_featured_team = self.cached_data.get('raw_data', {}).get('leaguetable', [{}])[0].get('team', '')
            expected_team = Config.FEATURED_TEAM
            
            if not (expected_team in cached_featured_team or cached_featured_team in expected_team):
                print(f"In-memory cached data is for different mode (found: {cached_featured_team}, expected: {expected_team})")
                self.cached_data = None  # Force reload
                need_fresh_data = True
            else:
                print(f"In-memory cached data matches current mode: {expected_team}")
                return self.cached_data
        
        if self.cached_data is None:
            # No data in memory, try to load from file
            try:
                if os.path.exists(self.data_file):
                    with open(self.data_file, 'r', encoding='utf-8') as f:
                        cached_file_data = json.load(f)
                        
                    # Check if cached data matches current mode (API mode = Columbia, Test mode = Gorecht)
                    cached_featured_team = cached_file_data.get('raw_data', {}).get('leaguetable', [{}])[0].get('team', '')
                    expected_team = Config.FEATURED_TEAM  # Should be 'AVV Columbia' in API mode
                    
                    if expected_team in cached_featured_team or cached_featured_team in expected_team:
                        # Cache matches current mode
                        self.cached_data = cached_file_data
                        if 'last_updated' in self.cached_data:
                            self.last_update = datetime.fromisoformat(self.cached_data['last_updated'])
                        print(f"Loaded cached data matching current mode: {expected_team}")
                    else:
                        # Cache doesn't match current mode
                        print(f"Cached data is for different mode (found: {cached_featured_team}, expected: {expected_team})")
                        need_fresh_data = True
                else:
                    print("No cached data file found")
                    need_fresh_data = True
                    
            except Exception as e:
                print(f"Error loading cached data: {e}")
                need_fresh_data = True
        
        # Fetch fresh data if needed
        if need_fresh_data:
            print("Fetching fresh API data...")
            self.fetch_and_process_data()
        
        return self.cached_data
    
    def start_scheduler(self):
        """Start the background scheduler"""
        # Schedule Thursday morning update (working scraper + API data)
        schedule.every().thursday.at(ScheduleConfig.THURSDAY_MORNING_TIME).do(self.run_full_update)

        # Schedule Saturday morning update (working scraper + API data)
        schedule.every().saturday.at(ScheduleConfig.SATURDAY_MORNING_TIME).do(self.run_full_update)

        # Schedule Saturday quarter-hour updates from 15:30 onwards (working scraper + API data)
        for time_slot in ScheduleConfig.SATURDAY_QUARTER_HOUR_TIMES:
            schedule.every().saturday.at(time_slot).do(self.run_full_update)

        # Schedule live score updates every 5 minutes on Saturday during live hours (14:00-17:00)
        live_times = []
        for hour in range(LiveConfig.LIVE_HOURS_START, LiveConfig.LIVE_HOURS_END + 1):
            for minute in range(0, 60, LiveConfig.UPDATE_INTERVAL_MINUTES):
                time_str = f"{hour:02d}:{minute:02d}"
                live_times.append(time_str)
                schedule.every().saturday.at(time_str).do(self.run_live_score_update)

        print(f"Scheduled {len(live_times)} live score updates on Saturday ({LiveConfig.LIVE_HOURS_START}:00-{LiveConfig.LIVE_HOURS_END}:00)")
        
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