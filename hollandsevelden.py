import requests
import json
import os
from datetime import datetime, timedelta
from test_data import get_test_data
from dotenv import load_dotenv
from config import Config, TeamFieldMappings

# Load environment variables
load_dotenv()


def get_data(use_test_data=None):
    """Fetch data from API or use test data based on configuration"""
    
    # Check if we should use test data
    if use_test_data is None:
        use_test_data = os.getenv('USE_TEST_DATA', 'false').lower() == 'true'
    
    if use_test_data:
        return get_test_data()
    
    # Use real API data
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0"
    x_api_key = os.getenv('HOLLANDSE_VELDEN_API_KEY', 'b73ibxfaivpaa7a68pbapckgpt0q947y')
    apiUrl = 'https://api.hollandsevelden.nl/competities/2025-2026/oost/za/3n/'
    
    try:
        response = requests.get(apiUrl, headers={"User-Agent": user_agent, "x-api-key": x_api_key})
        
        if response.status_code != 200:
            return get_test_data()
        
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            return get_test_data()
        
        result = {}
        
        for k, v in data.items():
            # Normalize league table structure to match test data format
            leaguetable = v.get('leaguetable', [])
            normalized_leaguetable = []
            for team in leaguetable:
                normalized_team = {
                    'team': team.get('name', team.get('team', '')),  # Normalize name field
                    'position': team.get('position', 0),
                    'played': team.get('matches', team.get('played', 0)),  # matches -> played
                    'wins': team.get('wins', 0),
                    'draws': team.get('ties', team.get('draws', 0)),  # ties -> draws
                    'losses': team.get('losses', 0),
                    'goals_for': team.get('goalsFor', team.get('goals_for', 0)),
                    'goals_against': team.get('goalsAgainst', team.get('goals_against', 0)),
                    'points': team.get('points', 0),
                    'shirt': team.get('shirt', '')  # Add shirt logo info
                }
                normalized_leaguetable.append(normalized_team)
            
            result = {
                'leaguetable': normalized_leaguetable,
                'period1': v.get('period1', []),
                'period2': v.get('period2', []),
                'period3': v.get('period3', []),
                'results': v.get('results', []),
                'program': v.get('program', [])
            }
            break
        
        return result
        
    except Exception:
        return get_test_data()


def get_filtered_period_standings(data):
    """Get period standings where at least 1 match has been played"""
    if not data:
        return []
    
    filtered_periods = []
    
    for period_name in ['period1', 'period2', 'period3']:
        period_data = data.get(period_name, [])
        if period_data:
            # Check if any team has played at least 1 match
            has_matches = any(team.get('played', 0) > 0 for team in period_data)
            if has_matches:
                filtered_periods.append({
                    'name': period_name.replace('period', 'Periode '),
                    'standings': period_data
                })
    
    return filtered_periods


def get_last_week_results(data):
    """Get results from the last 7 days, or all results in test mode"""
    if not data or 'results' not in data:
        return []

    # In test mode, return all results since test data is not current
    if Config.USE_TEST_DATA:
        print(f"Test mode: returning all {len(data['results'])} results")
        return sorted(data['results'], key=lambda x: x.get('date', ''))

    today = datetime.now()
    week_ago = today - timedelta(days=7)

    last_week_results = []
    for match in data['results']:
        match_date_str = match.get('date', '')
        if match_date_str:
            # Use the existing _parse_match_date function that handles both formats
            match_date = _parse_match_date(match_date_str)
            if match_date and week_ago <= match_date <= today:
                last_week_results.append(match)

    return sorted(last_week_results, key=lambda x: x.get('date', ''))


def _parse_match_date(date_str):
    """Parse match date string to datetime object"""
    if not date_str:
        return None
    
    try:
        if ' ' in date_str:
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        else:
            return datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return None

def _normalize_to_date_only(dt):
    """Normalize datetime to date only for comparison"""
    if dt is None:
        return None
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)

def _find_future_matches(matches, today):
    """Find all future matches from program"""
    future_matches = []
    all_program_matches = []
    
    for match in matches:
        match_date = _parse_match_date(match.get('date', ''))
        if match_date is None:
            continue
            
        match_date = _normalize_to_date_only(match_date)
        all_program_matches.append((match, match_date))

        if match_date >= today:
            future_matches.append(match)

    # If no future matches, use the last matches from program as demo data
    if not future_matches:
        all_program_matches.sort(key=lambda x: x[1])  # Sort by date
        future_matches = [match for match, _ in all_program_matches[-10:]]  # Take last 10 matches

    return future_matches

def _group_matches_by_week(matches, first_match_week, first_match_year, min_matches=7):
    """Group matches by week starting from first match's week"""
    matches_by_week = {}
    total_matches = 0
    current_year_now = datetime.now().year
    
    def get_week_key(week_num, year):
        if year != current_year_now:
            return f"Week {week_num} ({year})"
        else:
            return f"Week {week_num}"
    
    for match in matches:
        match_date = _parse_match_date(match.get('date', ''))
        if match_date is None:
            continue
            
        match_week = match_date.isocalendar()[1]
        match_year = match_date.year
        
        # Include matches from current week onwards
        is_current_week_or_later = (
            (match_year > first_match_year) or 
            (match_year == first_match_year and match_week >= first_match_week)
        )
        
        if is_current_week_or_later:
            week_key = get_week_key(match_week, match_year)
            
            if week_key not in matches_by_week:
                matches_by_week[week_key] = []
            
            matches_by_week[week_key].append(match)
            total_matches += 1
            
            if total_matches >= min_matches:
                break
    
    return matches_by_week

def _format_weekly_matches(matches_by_week):
    """Convert grouped matches to flat list with week information"""
    result_matches = []
    
    def sort_week_key(week_key):
        if '(' in week_key:
            week_part, year_part = week_key.split(' (')
            week_num = int(week_part.split()[1])
            year = int(year_part.rstrip(')'))
        else:
            week_num = int(week_key.split()[1])
            year = datetime.now().year
        return (year, week_num)
    
    sorted_week_keys = sorted(matches_by_week.keys(), key=sort_week_key)
    
    for week_key in sorted_week_keys:
        for match in matches_by_week[week_key]:
            match_with_week = match.copy()
            match_with_week['week_label'] = week_key
            result_matches.append(match_with_week)

    return result_matches

def get_next_week_matches(data):
    """Get upcoming matches starting from the week of the first upcoming match, grouped by week, minimum 7 matches.
    If no future matches exist, show the last matches from the program as 'upcoming' for demo purposes."""
    if not data or 'program' not in data:
        return []

    today = _normalize_to_date_only(datetime.now())

    # Step 1: Find all future matches and sort them
    future_matches = _find_future_matches(data['program'], today)
    
    if not future_matches:
        return []

    # Sort future matches by date
    future_matches = sorted(future_matches, key=lambda x: x.get('date', ''))

    # Step 2: Find the first match and determine its week
    first_match = future_matches[0]
    first_match_date = _parse_match_date(first_match.get('date', ''))
    
    if first_match_date is None:
        return []
        
    first_match_week = first_match_date.isocalendar()[1]  # ISO week number
    first_match_year = first_match_date.year

    # Step 3-5: Group matches by week and format results
    matches_by_week = _group_matches_by_week(future_matches, first_match_week, first_match_year)
    return _format_weekly_matches(matches_by_week)


def _get_team_name_from_match(match, field_variations):
    """Extract team name from match using various field name variations"""
    for field in field_variations:
        team = match.get(field, '')
        if team:
            return team
    return ''

def _is_featured_team_match(match, featured_team):
    """Check if match involves the featured team"""
    home_team = _get_team_name_from_match(match, TeamFieldMappings.HOME_FIELDS)
    away_team = _get_team_name_from_match(match, TeamFieldMappings.AWAY_FIELDS)
    
    return featured_team in home_team or featured_team in away_team

def get_featured_team_matches(data):
    """Get all featured team matches (played and upcoming) - team depends on USE_TEST_DATA"""
    if not data:
        return {'played': [], 'upcoming': []}
    
    featured_team = Config.FEATURED_TEAM
    featured_played = []
    featured_upcoming = []
    
    # Check results for played matches
    for match in data.get('results', []):
        if _is_featured_team_match(match, featured_team):
            featured_played.append(match)
    
    # Check program for upcoming matches  
    for match in data.get('program', []):
        if _is_featured_team_match(match, featured_team):
            featured_upcoming.append(match)
    
    return {
        'played': sorted(featured_played, key=lambda x: x.get('date', '')),
        'upcoming': sorted(featured_upcoming, key=lambda x: x.get('date', ''))
    }


def get_weekly_results(data):
    """Get results grouped by week number"""
    if not data or 'results' not in data:
        return {}
    
    weekly_results = {}
    
    for match in data['results']:
        match_date_str = match.get('date', '')
        if match_date_str:
            try:
                match_date = datetime.strptime(match_date_str, '%Y-%m-%d')
                # Get ISO week number
                week_number = match_date.isocalendar()[1]
                year = match_date.year
                week_key = f"Week {week_number} ({year})"
                
                if week_key not in weekly_results:
                    weekly_results[week_key] = []
                
                weekly_results[week_key].append(match)
            except ValueError:
                continue
    
    # Sort matches within each week by date
    for week in weekly_results:
        weekly_results[week] = sorted(weekly_results[week], key=lambda x: x.get('date', ''))
    
    return weekly_results


def get_all_matches(data):
    """Get all matches (both played and upcoming) in a single list"""
    if not data:
        return []
    
    all_matches = []
    
    # Add played matches (results)
    for match in data.get('results', []):
        match_info = match.copy()
        match_info['status'] = 'played'
        all_matches.append(match_info)
    
    # Add upcoming matches (program)
    for match in data.get('program', []):
        match_info = match.copy()
        match_info['status'] = 'upcoming'
        all_matches.append(match_info)
    
    # Sort all matches by date
    return sorted(all_matches, key=lambda x: x.get('date', ''))


def create_team_matrix(data):
    """Create a matrix of all teams vs all teams with results or match dates"""
    if not data:
        return {}
    
    # Get all teams from league table
    teams = []
    for team in data.get('leaguetable', []):
        team_name = team.get('name', team.get('team', ''))
        if team_name:
            teams.append(team_name)
    
    # Initialize matrix
    matrix = {}
    for home_team in teams:
        matrix[home_team] = {}
        for away_team in teams:
            if home_team != away_team:
                matrix[home_team][away_team] = None
    
    return _populate_team_matrix_with_matches(matrix, teams, data)

def _find_team_in_matrix(team_name, teams_list):
    """Find matching team name (case-insensitive, partial match)"""
    if not team_name:
        return None
    team_clean = team_name.strip().lower()
    # First try exact match
    for team in teams_list:
        if team.strip().lower() == team_clean:
            return team
    # Then try partial match
    for team in teams_list:
        if team_clean in team.strip().lower() or team.strip().lower() in team_clean:
            return team
    return None

def _get_score_from_match(match, field_variations):
    """Try multiple score field variations and handle None/0 correctly"""
    for field in field_variations:
        score = match.get(field)
        if score is not None and score != '':  # Accept 0 as valid score
            return str(score)
    return None

def _populate_team_matrix_with_matches(matrix, teams, data):
    """Populate matrix with match results and upcoming matches"""
    
    # Fill matrix with results
    for match in data.get('results', []):
        home_raw = _get_team_name_from_match(match, TeamFieldMappings.HOME_FIELDS)
        away_raw = _get_team_name_from_match(match, TeamFieldMappings.AWAY_FIELDS)
        
        # Find matching team names in matrix
        home = _find_team_in_matrix(home_raw, teams)
        away = _find_team_in_matrix(away_raw, teams)
        
        if not home or not away:
            continue  # Skip if teams not found
        
        home_score = _get_score_from_match(match, TeamFieldMappings.HOME_SCORE_FIELDS)
        away_score = _get_score_from_match(match, TeamFieldMappings.AWAY_SCORE_FIELDS)
        
        # Only create score if both scores are available
        if (home in matrix and away in matrix[home] and 
            home_score is not None and away_score is not None):
            matrix[home][away] = f"{home_score}-{away_score}"
    
    # Fill matrix with upcoming matches
    for match in data.get('program', []):
        home_raw = _get_team_name_from_match(match, TeamFieldMappings.HOME_FIELDS)
        away_raw = _get_team_name_from_match(match, TeamFieldMappings.AWAY_FIELDS)
        
        # Find matching team names in matrix
        home = _find_team_in_matrix(home_raw, teams)
        away = _find_team_in_matrix(away_raw, teams)
        
        if not home or not away:
            continue  # Skip if teams not found
        
        date = match.get('date', '')
        
        # Convert datetime to just date for display
        if date and ' ' in date:
            date = date.split(' ')[0]
        
        # Only add date if no result exists yet
        if home in matrix and away in matrix[home] and matrix[home][away] is None:
            matrix[home][away] = date
    
    return {'teams': teams, 'matrix': matrix}

if __name__ == "__main__":
    print("Started MAIN!")
    get_data()