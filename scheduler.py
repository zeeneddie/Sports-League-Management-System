import schedule
import time
import threading
from datetime import datetime, timedelta
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
from config import Config

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

    def check_local_files_modified(self):
        """Check if local JSON files have been modified since last check"""
        # Initialize local_files if not exists (for existing instances)
        if not hasattr(self, 'local_files'):
            self.local_files = {
                'uitslagen.json': None,
                'komende_wedstrijden.json': None,
                'league_data.json': None
            }

        files_modified = False

        for filename in self.local_files.keys():
            if os.path.exists(filename):
                current_mtime = os.path.getmtime(filename)
                if self.local_files[filename] is None:
                    # First time checking this file
                    self.local_files[filename] = current_mtime
                elif self.local_files[filename] != current_mtime:
                    print(f"Local file {filename} has been modified")
                    self.local_files[filename] = current_mtime
                    files_modified = True

        return files_modified

    def integrate_local_files(self, data):
        """Integrate local JSON files into the main data if they exist and have recent updates"""
        if not data:
            return data

        # Check if local files have been modified recently (last 24 hours)
        recent_threshold = datetime.now() - timedelta(hours=24)

        # Check uitslagen.json for Apeldoornse clubs results (separate from API data)
        if os.path.exists('uitslagen.json'):
            try:
                with open('uitslagen.json', 'r', encoding='utf-8') as f:
                    uitslagen_data = json.load(f)

                # Store Apeldoornse clubs results in separate field (don't mix with API data)
                apeldoornse_results = []
                for local_result in uitslagen_data:
                    result_date_str = local_result.get('date', '')
                    if result_date_str:
                        try:
                            result_date = datetime.strptime(result_date_str, '%Y-%m-%d')
                            if result_date >= recent_threshold:
                                # Add time to date if not present
                                if ' ' not in result_date_str:
                                    local_result['date'] = f"{result_date_str} 15:00:00"
                                apeldoornse_results.append(local_result)
                        except ValueError:
                            continue

                if apeldoornse_results:
                    data['apeldoornse_clubs_results'] = sorted(apeldoornse_results, key=lambda x: x.get('date', ''))
                    print(f"Loaded {len(apeldoornse_results)} Apeldoornse clubs results")

            except Exception as e:
                print(f"Error integrating uitslagen.json: {e}")

        # Check komende_wedstrijden.json for Apeldoornse clubs data (separate from API data)
        if os.path.exists('komende_wedstrijden.json'):
            try:
                with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
                    upcoming_data = json.load(f)

                # Store Apeldoornse clubs matches in separate field (don't mix with API data)
                apeldoornse_matches = []
                for local_match in upcoming_data:
                    match_date_str = local_match.get('date', '')
                    if match_date_str:
                        try:
                            match_date = datetime.strptime(match_date_str.split(' ')[0], '%Y-%m-%d')
                            # Add upcoming matches within next 2 weeks
                            future_threshold = datetime.now() + timedelta(days=14)
                            if datetime.now() <= match_date <= future_threshold:
                                apeldoornse_matches.append(local_match)
                        except (ValueError, IndexError):
                            continue

                if apeldoornse_matches:
                    data['apeldoornse_clubs_upcoming'] = sorted(apeldoornse_matches, key=lambda x: x.get('date', ''))
                    print(f"Loaded {len(apeldoornse_matches)} Apeldoornse clubs upcoming matches")

            except Exception as e:
                print(f"Error integrating komende_wedstrijden.json: {e}")

        # Check league_data.json for complete data refresh
        if os.path.exists('league_data.json'):
            try:
                file_mtime = os.path.getmtime('league_data.json')
                file_time = datetime.fromtimestamp(file_mtime)

                # If league_data.json is newer than current cached data, use it
                current_update = data.get('last_update')
                if current_update:
                    if isinstance(current_update, str):
                        try:
                            current_time = datetime.fromisoformat(current_update.replace('Z', '+00:00'))
                            if file_time > current_time:
                                print("league_data.json is newer - loading fresh data")
                                with open('league_data.json', 'r', encoding='utf-8') as f:
                                    fresh_data = json.load(f)
                                    # Merge with existing data to preserve any runtime additions
                                    data.update(fresh_data)
                                    print("Integrated fresh league_data.json")
                        except (ValueError, TypeError):
                            pass

            except Exception as e:
                print(f"Error integrating league_data.json: {e}")

        return data

    def run_working_scraper(self):
        """Run the working_scraper.py to fetch latest overige clubs data"""
        print(f"=== WORKING SCRAPER STARTED at {datetime.now()} ===")

        try:
            import subprocess
            result = subprocess.run(['python', 'working_scraper.py'],
                                  capture_output=True, text=True, timeout=300)

            if result.returncode == 0:
                print("Working scraper completed successfully")
                print(f"Output: {result.stdout[-200:]}")  # Last 200 chars

                # Force refresh of main data to integrate new local files
                self.clear_cache()
                self.fetch_and_process_data()
            else:
                print(f"Working scraper failed with error: {result.stderr}")

        except subprocess.TimeoutExpired:
            print("Working scraper timed out after 5 minutes")
        except Exception as e:
            print(f"Error running working scraper: {e}")

        print(f"=== WORKING SCRAPER COMPLETED at {datetime.now()} ===\n")

    def run_api_update(self):
        """Run only API data fetch for hollandsevelden data"""
        print(f"=== API UPDATE CYCLE STARTED at {datetime.now()} ===")

        # Run the main data fetch for hollandsevelden data
        self.fetch_and_process_data()

        print(f"=== API UPDATE CYCLE COMPLETED at {datetime.now()} ===\n")
        
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

            # Integrate local JSON files if they have recent updates
            processed_data = self.integrate_local_files(processed_data)
            
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
        
        # Check if local files have been modified
        local_files_changed = self.check_local_files_modified()
        if local_files_changed and not need_fresh_data:
            print("Local files have been modified, refreshing data...")
            need_fresh_data = True

        # Fetch fresh data if needed
        if need_fresh_data:
            print("Fetching fresh API data...")
            self.fetch_and_process_data()

        return self.cached_data
    
    def start_scheduler(self):
        """Start the background scheduler with API and scraper updates"""
        # Schedule daily API update at 10:00 AM
        schedule.every().day.at("10:00").do(self.run_api_update)

        # Schedule working scraper runs
        # Daily at 9:00 AM (before API update)
        schedule.every().day.at("09:00").do(self.run_working_scraper)
        # Saturday evenings at 18:00 (after matches)
        schedule.every().saturday.at("18:00").do(self.run_working_scraper)
        # Sunday evenings at 18:00 (after matches)
        schedule.every().sunday.at("18:00").do(self.run_working_scraper)

        # Saturday live updates - API updates every 15 minutes between 16:30-19:00
        saturday_times = [
            "16:30", "16:45", "17:00", "17:15", "17:30", "17:45",
            "18:00", "18:15", "18:30", "18:45", "19:00"
        ]
        for time_slot in saturday_times:
            schedule.every().saturday.at(time_slot).do(self.run_api_update)

        # TEST SCHEDULE - Working scraper test run (remove after testing)
        schedule.every().day.at("14:05").do(self.run_working_scraper)

        print("Scheduled daily API updates at 10:00 AM")
        print("Scheduled working scraper:")
        print("  - Daily at 09:00 AM")
        print("  - Saturdays at 18:00")
        print("  - Sundays at 18:00")
        print("  - TEST: Today at 14:05 UTC")
        print("Scheduled Saturday live API updates every 15 minutes:")
        print("  - 16:30, 16:45, 17:00, 17:15, 17:30, 17:45")
        print("  - 18:00, 18:15, 18:30, 18:45, 19:00")

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
        print("Data scheduler started (API-only mode)")


# Global scheduler instance
data_scheduler = DataScheduler()