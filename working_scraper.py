import asyncio
from playwright.async_api import async_playwright
import re
import json
from datetime import datetime

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
        teams = ["Robur et Velocitas", "Victoria Boys", "Albatross"]
    return teams

async def get_football_results():
    """Extract specific team results with scores and dates"""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            print("Navigating to website...")
            await page.goto("https://voetbaloost.nl/uitslagen.html?a=3", wait_until="networkidle")
            await page.wait_for_timeout(5000)

            # Accept cookies
            try:
                selectors = ["text=Akkoord, ik ben 24+", ".cmpboxbtnyes", "text=Akkoord"]
                for selector in selectors:
                    try:
                        element = page.locator(selector)
                        if await element.is_visible():
                            await element.click()
                            await page.wait_for_timeout(3000)
                            break
                    except:
                        continue
            except:
                pass

            # Get the full text content
            text_content = await page.evaluate("document.body.innerText")

            # Load target teams from config file
            target_teams = load_teams_config()

            results = []

            # Split content into lines
            lines = [line.strip() for line in text_content.split('\n')]

            for i, line in enumerate(lines):
                if not line:
                    continue

                # Check if this line contains any of our target teams
                for team_name in target_teams:
                    if team_name in line:
                        print(f"\nFound match line: {line}")

                        # Look backwards for score and date
                        score = None
                        date = None
                        match_type = None

                        # Search backwards from current line
                        for j in range(i-1, max(0, i-15), -1):  # Look up to 15 lines back
                            check_line = lines[j].strip()

                            # Look for score pattern first
                            score_match = re.match(r'^(\d+)\s*-\s*(\d+)$', check_line)
                            if score_match and not score:
                                score = check_line
                                print(f"  Found score: {score}")

                            # Look for date pattern
                            date_match = re.match(r'^(\d{1,2}\s+[A-Z]{3})$', check_line)
                            if date_match and not date:
                                date = check_line
                                print(f"  Found date: {date}")

                            # Look for match type
                            if check_line in ['beker', 'oefen'] and not match_type:
                                match_type = check_line
                                print(f"  Found type: {match_type}")

                            # Stop if we found score and date
                            if score and date:
                                break

                        # Parse teams from the line
                        # The format appears to be: "Team1\tTeam2"
                        teams_parts = line.split('\t')
                        home_team = teams_parts[0].strip() if len(teams_parts) > 0 else "Unknown"
                        away_team = teams_parts[1].strip() if len(teams_parts) > 1 else "Unknown"

                        # Create result
                        result = {
                            'team': team_name,
                            'home_team': home_team,
                            'away_team': away_team,
                            'score': score or "Score not found",
                            'date': date or "Date not found",
                            'match_type': match_type or ""
                        }
                        results.append(result)

            return results

        except Exception as e:
            print(f"Error: {e}")
            return []
        finally:
            await browser.close()

def remove_duplicate_matches(results):
    """Remove duplicate matches when both teams are in our target list"""
    unique_results = []
    seen_matches = set()

    for result in results:
        home_team = result['home_team']
        away_team = result['away_team']
        date = result['date']

        # Create a match identifier that's the same regardless of which team was found first
        # Sort teams alphabetically to create consistent identifier
        teams_sorted = tuple(sorted([home_team, away_team]))
        match_id = (teams_sorted, date)

        if match_id not in seen_matches:
            seen_matches.add(match_id)
            unique_results.append(result)
        else:
            print(f"Removed duplicate: {home_team} vs {away_team} on {date}")

    return unique_results

def convert_date_format(date_str):
    """Convert date from '14 SEP' format to '2024-09-14' format"""
    if not date_str or date_str == "Date not found":
        return datetime.now().strftime("%Y-%m-%d")

    try:
        # Map month abbreviations to numbers
        month_map = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        }

        parts = date_str.strip().split()
        if len(parts) == 2:
            day, month_abbr = parts
            day = day.zfill(2)  # Ensure two digits
            month = month_map.get(month_abbr, '01')
            year = datetime.now().year  # Use current year
            return f"{year}-{month}-{day}"
    except:
        pass

    return datetime.now().strftime("%Y-%m-%d")

def parse_score(score_str):
    """Parse score string to separate home and away goals"""
    if not score_str or score_str == "Score not found":
        return 0, 0

    try:
        # Handle formats like "1 - 4" or "1	-	4"
        clean_score = re.sub(r'\s+', ' ', score_str.replace('\t', ' '))
        parts = clean_score.split(' - ')
        if len(parts) == 2:
            home_goals = int(parts[0].strip())
            away_goals = int(parts[1].strip())
            return home_goals, away_goals
    except:
        pass

    return 0, 0

def results_to_json(results):
    """Convert results to JSON format matching the example structure"""
    json_results = []

    for result in results:
        home_goals, away_goals = parse_score(result['score'])
        date_formatted = convert_date_format(result['date'])

        json_result = {
            "status": "Gespeeld",
            "date": date_formatted,
            "home": result['home_team'],
            "away": result['away_team'],
            "homeGoals": home_goals,
            "awayGoals": away_goals,
            "result": result['score'] if result['score'] != "Score not found" else ""
        }
        json_results.append(json_result)

    return json_results

def programme_to_json(programme):
    """Convert programme to JSON format matching the example structure"""
    json_programme = []

    for match in programme:
        date_formatted = convert_date_format(match['date'])

        json_match = {
            "status": "Nog te spelen",
            "date": date_formatted,
            "home": match['home_team'],
            "away": match['away_team'],
            "homeGoals": 0,
            "awayGoals": 0,
            "result": "",
            "time": match['time'] if match['time'] != "Time not found" else ""
        }
        json_programme.append(json_match)

    return json_programme

def save_json_files(results, programme):
    """Save results and programme to separate JSON files"""

    # Convert to JSON format
    json_results = results_to_json(results)
    json_programme = programme_to_json(programme)

    # Save results to uitslagen.json
    with open('uitslagen.json', 'w', encoding='utf-8') as f:
        json.dump(json_results, f, indent=2, ensure_ascii=False)

    # Save programme to komende_wedstrijden.json
    with open('komende_wedstrijden.json', 'w', encoding='utf-8') as f:
        json.dump(json_programme, f, indent=2, ensure_ascii=False)

    print(f"\n=== JSON FILES CREATED ===")
    print(f"uitslagen.json - {len(json_results)} results saved")
    print(f"komende_wedstrijden.json - {len(json_programme)} matches saved")

async def get_football_programme():
    """Extract upcoming matches for target teams"""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            print("Navigating to programme page...")
            await page.goto("https://voetbaloost.nl/programma.html?a=3", wait_until="networkidle")
            await page.wait_for_timeout(5000)

            # Accept cookies
            try:
                selectors = ["text=Akkoord, ik ben 24+", ".cmpboxbtnyes", "text=Akkoord"]
                for selector in selectors:
                    try:
                        element = page.locator(selector)
                        if await element.is_visible():
                            await element.click()
                            await page.wait_for_timeout(3000)
                            break
                    except:
                        continue
            except:
                pass

            # Get the full text content
            text_content = await page.evaluate("document.body.innerText")

            # Load target teams from config file
            target_teams = load_teams_config()

            matches = []

            # Split content into lines
            lines = [line.strip() for line in text_content.split('\n')]

            for i, line in enumerate(lines):
                if not line:
                    continue

                # Check if this line contains any of our target teams
                for team_name in target_teams:
                    if team_name in line:
                        print(f"\nFound programme line: {line}")

                        # Look backwards for time and date
                        match_time = None
                        date = None
                        match_type = None

                        # Search backwards from current line
                        for j in range(i-1, max(0, i-15), -1):  # Look up to 15 lines back
                            check_line = lines[j].strip()

                            # Look for time pattern first (e.g., "14:30")
                            time_match = re.match(r'^(\d{1,2}:\d{2})$', check_line)
                            if time_match and not match_time:
                                match_time = check_line
                                print(f"  Found time: {match_time}")

                            # Look for date pattern
                            date_match = re.match(r'^(\d{1,2}\s+[A-Z]{3})$', check_line)
                            if date_match and not date:
                                date = check_line
                                print(f"  Found date: {date}")

                            # Look for match type
                            if check_line in ['beker', 'oefen', 'competitie'] and not match_type:
                                match_type = check_line
                                print(f"  Found type: {match_type}")

                            # Stop if we found time and date
                            if match_time and date:
                                break

                        # Parse teams from the line
                        # The format appears to be: "Team1\tTeam2"
                        teams_parts = line.split('\t')
                        home_team = teams_parts[0].strip() if len(teams_parts) > 0 else "Unknown"
                        away_team = teams_parts[1].strip() if len(teams_parts) > 1 else "Unknown"

                        # Create match
                        match = {
                            'team': team_name,
                            'home_team': home_team,
                            'away_team': away_team,
                            'time': match_time or "Time not found",
                            'date': date or "Date not found",
                            'match_type': match_type or ""
                        }
                        matches.append(match)

            return matches

        except Exception as e:
            print(f"Error: {e}")
            return []
        finally:
            await browser.close()

if __name__ == "__main__":
    print("=== VOETBALOOST SCRAPER ===\n")

    # Get results (past matches)
    print("=== GETTING RESULTS ===\n")
    results = asyncio.run(get_football_results())

    if results:
        # Remove duplicate matches
        unique_results = remove_duplicate_matches(results)

        print(f"\n=== FINAL RESULTS ===\n")

        for result in unique_results:
            print(f"{result['home_team']} - {result['away_team']} : {result['score']} : {result['date']}")
            if result['match_type']:
                print(f"  (Type: {result['match_type']})")
            print()
    else:
        print("\nNo results found")

    # Get programme (upcoming matches)
    print("\n=== GETTING PROGRAMME ===\n")
    programme = asyncio.run(get_football_programme())

    if programme:
        # Remove duplicate matches
        unique_programme = remove_duplicate_matches(programme)

        print(f"\n=== UPCOMING MATCHES ===\n")

        for match in unique_programme:
            print(f"{match['home_team']} - {match['away_team']} : {match['time']} : {match['date']}")
            if match['match_type']:
                print(f"  (Type: {match['match_type']})")
            print()
    else:
        print("\nNo upcoming matches found")

    # Save JSON files if we have data
    if results or programme:
        unique_results = remove_duplicate_matches(results) if results else []
        unique_programme = remove_duplicate_matches(programme) if programme else []
        save_json_files(unique_results, unique_programme)