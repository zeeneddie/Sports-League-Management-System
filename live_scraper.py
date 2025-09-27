import asyncio
from playwright.async_api import async_playwright
import re
import json
from datetime import datetime, date

def load_teams_config():
    """Load team names from teams.config file"""
    teams = []
    try:
        with open('teams.config', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if line and not line.startswith('#'):
                    teams.append(line)
    except FileNotFoundError:
        print("Warning: teams.config file not found, using default teams")
        teams = ["AVV Columbia", "Robur et Velocitas", "Victoria Boys", "Albatross"]
    return teams

def load_competition_teams():
    """Load team names from league_data.json competition standings"""
    teams = []
    try:
        with open('league_data.json', 'r', encoding='utf-8') as f:
            league_data = json.load(f)

        for team in league_data.get('raw_data', {}).get('leaguetable', []):
            team_name = team.get('team', '')
            if team_name:
                teams.append(team_name)

        print(f"Loaded {len(teams)} teams from competition standings")
    except FileNotFoundError:
        print("Warning: league_data.json file not found, using default competition teams")
        teams = ["AVV Columbia", "AGOVV", "SV Epe", "Groen Wit '62"]
    except Exception as e:
        print(f"Error loading competition teams: {e}")
        teams = ["AVV Columbia", "AGOVV", "SV Epe", "Groen Wit '62"]

    return teams

async def get_live_matches_for_teams(target_teams, team_type="unknown"):
    """Extract live matches for specific teams from voetbalnederland.nl"""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            print(f"Navigating to live matches page for {team_type} teams...")
            await page.goto("https://voetbalnederland.nl/live.html?a=3", wait_until="networkidle")
            await page.wait_for_timeout(5000)

            # Accept cookies if present
            try:
                selectors = ["text=Akkoord", "text=Accepteren", ".cookie-accept", "[data-accept]"]
                for selector in selectors:
                    try:
                        element = page.locator(selector)
                        if await element.is_visible():
                            await element.click()
                            await page.wait_for_timeout(2000)
                            break
                    except:
                        continue
            except:
                pass

            # Get the full text content
            text_content = await page.evaluate("document.body.innerText")

            live_matches = []
            today_str = date.today().strftime("%Y-%m-%d")

            # Split content into lines
            lines = [line.strip() for line in text_content.split('\n')]

            print(f"Searching for {len(target_teams)} {team_type} teams...")

            for i, line in enumerate(lines):
                if not line:
                    continue

                # Check if this line contains any of our target teams
                for team_name in target_teams:
                    if team_name in line:
                        print(f"\nFound {team_type} match line: {line}")

                        # Look for live score, time, and other match info
                        live_score = None
                        match_time = None
                        match_status = None

                        # Search around current line for additional info
                        search_range = range(max(0, i-10), min(len(lines), i+10))

                        for j in search_range:
                            check_line = lines[j].strip()

                            # Look for live score pattern (e.g., "1-2", "0-0")
                            if not live_score:
                                score_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', check_line)
                                if score_match:
                                    live_score = f"{score_match.group(1)}-{score_match.group(2)}"
                                    print(f"  Found live score: {live_score}")

                            # Look for time pattern - prioritize game minutes over start times
                            if not match_time:
                                # First check for game minutes (45', 90+2', etc.)
                                minute_patterns = [
                                    r"(\d{1,2}'\+?\d*)",  # Match time like 45', 90+2'
                                    r"(rust|pauze)",      # Half-time
                                    r"(afgelopen|einde)"  # Finished
                                ]
                                for pattern in minute_patterns:
                                    time_match = re.search(pattern, check_line, re.IGNORECASE)
                                    if time_match:
                                        match_time = time_match.group(1)
                                        print(f"  Found game time: {match_time}")
                                        break

                                # Only look for start times if no game time found AND no live score
                                if not match_time and not live_score:
                                    start_time_match = re.search(r"(\d{1,2}:\d{2})", check_line)
                                    if start_time_match:
                                        # Check if this looks like a start time (not a live game)
                                        start_time = start_time_match.group(1)
                                        hour = int(start_time.split(':')[0])
                                        # Only use start times during typical match hours (14-18)
                                        if 14 <= hour <= 18:
                                            match_time = start_time
                                            print(f"  Found start time: {match_time}")
                                        break

                            # Look for match status
                            if not match_status:
                                status_patterns = ["live", "bezig", "1e helft", "2e helft", "rust", "afgelopen"]
                                for status in status_patterns:
                                    if status.lower() in check_line.lower():
                                        match_status = status
                                        print(f"  Found status: {match_status}")
                                        break

                        # Parse teams from the line
                        # Try different splitting methods
                        home_team = ""
                        away_team = ""

                        if '\t' in line:
                            teams_parts = line.split('\t')
                            home_team = teams_parts[0].strip()
                            away_team = teams_parts[1].strip() if len(teams_parts) > 1 else ""
                        elif ' - ' in line:
                            teams_parts = line.split(' - ')
                            home_team = teams_parts[0].strip()
                            away_team = teams_parts[1].strip() if len(teams_parts) > 1 else ""
                        elif ' vs ' in line:
                            teams_parts = line.split(' vs ')
                            home_team = teams_parts[0].strip()
                            away_team = teams_parts[1].strip() if len(teams_parts) > 1 else ""
                        else:
                            # If we can't split properly, use the found team and try to extract the other
                            if team_name in line:
                                remaining = line.replace(team_name, '').strip()
                                if remaining:
                                    if line.startswith(team_name):
                                        home_team = team_name
                                        away_team = remaining
                                    else:
                                        home_team = remaining
                                        away_team = team_name
                                else:
                                    home_team = team_name
                                    away_team = "Unknown"

                        # Create match data
                        if live_score:
                            # Parse live score - this indicates a live or finished match
                            score_parts = live_score.split('-')
                            home_goals = int(score_parts[0]) if len(score_parts) > 0 else 0
                            away_goals = int(score_parts[1]) if len(score_parts) > 1 else 0

                            # Determine status based on context
                            if match_status and ("afgelopen" in match_status.lower() or "einde" in match_status.lower()):
                                status = "Afgelopen"
                            elif match_time and ("'" in str(match_time) or match_status):
                                status = "Live"
                            else:
                                # Has score but unclear if live or finished - assume live
                                status = "Live"

                            # If we only have a start time (like 17:00) but also a score,
                            # this is likely incorrect - clear the time
                            if match_time and ':' in str(match_time) and len(str(match_time)) == 5:
                                # This is a start time, not game time - clear it for live matches
                                match_time = ""
                                print(f"  Cleared start time for live match")

                        else:
                            # No live score found, keep original time/date
                            home_goals = 0
                            away_goals = 0
                            status = "Nog te spelen"

                        match_data = {
                            "status": status,
                            "date": today_str,
                            "time": match_time or "",
                            "home": home_team,
                            "away": away_team,
                            "homeGoals": home_goals,
                            "awayGoals": away_goals,
                            "result": live_score or "",
                            "match_status": match_status or "",
                            "found_team": team_name,
                            "team_type": team_type
                        }

                        live_matches.append(match_data)

            return live_matches

        except Exception as e:
            print(f"Error scraping live matches for {team_type}: {e}")
            return []
        finally:
            await browser.close()

def save_live_matches(competition_matches, overige_matches):
    """Save live matches to separate JSON files"""
    success_competition = False
    success_overige = False

    # Save competition matches to live-wedstrijden.json
    try:
        with open('live-wedstrijden.json', 'w', encoding='utf-8') as f:
            json.dump(competition_matches, f, indent=2, ensure_ascii=False)
        print(f"OK live-wedstrijden.json - {len(competition_matches)} competition matches saved")
        success_competition = True
    except Exception as e:
        print(f"ERROR saving competition matches: {e}")

    # Save overige matches to live-overige.json
    try:
        with open('live-overige.json', 'w', encoding='utf-8') as f:
            json.dump(overige_matches, f, indent=2, ensure_ascii=False)
        print(f"OK live-overige.json - {len(overige_matches)} overige matches saved")
        success_overige = True
    except Exception as e:
        print(f"ERROR saving overige matches: {e}")

    return success_competition and success_overige

def remove_duplicate_live_matches(matches):
    """Remove duplicate matches from live data"""
    unique_matches = []
    seen_matches = set()

    for match in matches:
        home_team = match['home']
        away_team = match['away']
        date = match['date']

        # Create match identifier
        teams_sorted = tuple(sorted([home_team, away_team]))
        match_id = (teams_sorted, date)

        if match_id not in seen_matches:
            seen_matches.add(match_id)
            unique_matches.append(match)
        else:
            print(f"Removed duplicate live match: {home_team} vs {away_team} on {date}")

    return unique_matches

async def main():
    """Main function to run the dual live scraper once"""
    print(f"=== DUAL LIVE WEDSTRIJDEN SCRAPER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")

    try:
        # Load both team sets
        competition_teams = load_competition_teams()
        overige_teams = load_teams_config()

        print(f"\nLoaded {len(competition_teams)} competition teams and {len(overige_teams)} overige teams")

        # Get live matches for competition teams
        print(f"\n=== SCRAPING COMPETITION TEAMS ===")
        competition_matches = await get_live_matches_for_teams(competition_teams, "competition")
        unique_competition = remove_duplicate_live_matches(competition_matches)

        # Get live matches for overige teams
        print(f"\n=== SCRAPING OVERIGE TEAMS ===")
        overige_matches = await get_live_matches_for_teams(overige_teams, "overige")
        unique_overige = remove_duplicate_live_matches(overige_matches)

        # Display results
        print(f"\n=== COMPETITION LIVE MATCHES FOUND ===")
        if unique_competition:
            for i, match in enumerate(unique_competition, 1):
                print(f"{i}. {match['home']} vs {match['away']}")
                print(f"   Status: {match['status']}")
                if match['result']:
                    print(f"   Score: {match['result']}")
                if match['time']:
                    print(f"   Time: {match['time']}")
                if match['match_status']:
                    print(f"   Match Status: {match['match_status']}")
                print(f"   Found via: {match['found_team']}")
                print()
        else:
            print("No live matches found for competition teams")

        print(f"\n=== OVERIGE LIVE MATCHES FOUND ===")
        if unique_overige:
            for i, match in enumerate(unique_overige, 1):
                print(f"{i}. {match['home']} vs {match['away']}")
                print(f"   Status: {match['status']}")
                if match['result']:
                    print(f"   Score: {match['result']}")
                if match['time']:
                    print(f"   Time: {match['time']}")
                if match['match_status']:
                    print(f"   Match Status: {match['match_status']}")
                print(f"   Found via: {match['found_team']}")
                print()
        else:
            print("No live matches found for overige teams")

        # Save to separate JSON files
        if save_live_matches(unique_competition, unique_overige):
            print("\nOK All live matches successfully saved to separate JSON files")
            return True
        else:
            print("\nERROR Failed to save some live matches")
            return False

    except Exception as e:
        print(f"Error in dual live scraper: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(main())