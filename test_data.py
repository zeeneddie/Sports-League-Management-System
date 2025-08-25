from datetime import datetime, timedelta
import json
import os

def get_test_data():
    """Load test data from noord-zaterdag-1f.json file"""
    
    print("=== LOADING TEST DATA FROM JSON FILE ===")
    # Try to load the JSON file
    json_file_path = os.path.join(os.path.dirname(__file__), 'noord-zaterdag-1f.json')
    print(f"[FILE] Reading test data from: {json_file_path}")
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        print("[SUCCESS] JSON file loaded successfully")
        
        # Extract the competition data
        competition_data = json_data.get('competition', {})
        print(f"[COMP] Competition: {competition_data.get('meta', {}).get('title', 'Unknown')}")
        print(f"[COMP] District: {competition_data.get('meta', {}).get('district', 'Unknown')}")
        print(f"[COMP] Season: {competition_data.get('meta', {}).get('season', 'Unknown')}")
        
        # Convert the JSON structure to match our expected format
        leaguetable = competition_data.get('leaguetable', [])
        print(f"[TABLE] Found {len(leaguetable)} teams in league table")
        
        # Convert leaguetable format to match our expected structure
        converted_leaguetable = []
        print("=== CLUBS IN LEAGUE TABLE ===")
        for i, team in enumerate(leaguetable, 1):
            team_name = team.get('name', '')
            points = team.get('points', 0)
            matches = team.get('matches', 0)
            print(f"  {i:2d}. {team_name:<25} - {points:2d} pts, {matches:2d} wedstrijden")
            
            converted_team = {
                'team': team_name,
                'played': matches,
                'wins': team.get('wins', 0),
                'draws': team.get('ties', 0),  # 'ties' in JSON becomes 'draws'
                'losses': team.get('losses', 0),
                'goals_for': team.get('goalsFor', 0),
                'goals_against': team.get('goalsAgainst', 0),
                'points': points,
                'position': team.get('position', 0)
            }
            converted_leaguetable.append(converted_team)
        
        # Get periods data or create empty arrays
        period1 = competition_data.get('period1', [])
        period2 = competition_data.get('period2', [])
        period3 = competition_data.get('period3', [])
        
        print(f"[PERIODS] Period standings: P1={len(period1)} P2={len(period2)} P3={len(period3)}")
        
        # Get results and program data or create empty arrays
        results = competition_data.get('results', [])
        program = competition_data.get('program', [])
        
        print("=== WEDSTRIJDEN OVERVIEW ===")
        print(f"  [RESULTS] Gespeelde wedstrijden: {len(results)}")
        print(f"  [PROGRAM] Programma wedstrijden: {len(program)}")
        
        # Show some recent results
        if results:
            print("=== LAATSTE UITSLAGEN ===")
            for i, match in enumerate(results[-3:]):  # Last 3 results
                home = match.get('home', match.get('hometeam', ''))
                away = match.get('away', match.get('awayteam', ''))
                home_score = match.get('homeGoals', match.get('homescore', ''))
                away_score = match.get('awayGoals', match.get('awayscore', ''))
                date = match.get('date', '')
                print(f"  {date} | {home:<20} {home_score}-{away_score} {away}")
        
        # Show upcoming matches
        if program:
            print("=== KOMENDE WEDSTRIJDEN ===")
            for i, match in enumerate(program[:3]):  # Next 3 matches
                home = match.get('home', match.get('hometeam', ''))
                away = match.get('away', match.get('awayteam', ''))
                date = match.get('date', '')
                time = match.get('time', '')
                print(f"  {date} {time} | {home:<20} vs {away}")
        
        print("=== TEST DATA SUCCESSFULLY LOADED ===")
        
        return {
            'leaguetable': converted_leaguetable,
            'period1': period1,
            'period2': period2,
            'period3': period3,
            'results': results,
            'program': program
        }
        
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"[ERROR] Error loading JSON file: {e}")
        print("[FALLBACK] Falling back to generated test data")
        return get_generated_test_data()

def get_generated_test_data():
    """Generate minimal fallback test data structure (original function)"""
    
    # Return minimal empty data structure since no teams are available
    print("No teams available for test data generation - returning empty structure")
    
    return {
        'leaguetable': [],
        'period1': [],
        'period2': [],
        'period3': [],
        'results': [],
        'program': []
    }