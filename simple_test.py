import requests
import json

def test_key_endpoints():
    """Test key endpoints that were problematic"""
    base_url = 'http://localhost:5000'
    
    print("=== TESTING KEY ENDPOINTS ===")
    
    # Test next week matches
    try:
        r = requests.get(f'{base_url}/api/next-week-matches')
        print(f'Next week matches: Status {r.status_code}')
        if r.status_code == 200:
            data = r.json()
            matches = data.get('matches', [])
            print(f'  Found {len(matches)} komende wedstrijden')
            if matches:
                first = matches[0]
                print(f'  Eerste: {first.get("home", "?")} vs {first.get("away", "?")} op {first.get("date", "?")}')
    except Exception as e:
        print(f'Next week ERROR: {e}')
    
    # Test team matrix  
    try:
        r = requests.get(f'{base_url}/api/team-matrix')
        print(f'Team matrix: Status {r.status_code}')
        if r.status_code == 200:
            data = r.json()
            matrix = data.get('team_matrix', {})
            teams = matrix.get('teams', [])
            matrix_data = matrix.get('matrix', {})
            
            # Count filled cells properly
            filled_results = 0
            filled_dates = 0
            
            for home_team, opponents in matrix_data.items():
                for away_team, value in opponents.items():
                    if value is not None:
                        if '-' in str(value):  # Score format like "2-1"
                            filled_results += 1
                        else:  # Date format
                            filled_dates += 1
            
            print(f'  Teams: {len(teams)}')
            print(f'  Resultaten: {filled_results}')
            print(f'  Geplande wedstrijden: {filled_dates}')
            print(f'  Totaal gevulde cellen: {filled_results + filled_dates}')
    except Exception as e:
        print(f'Matrix ERROR: {e}')

if __name__ == '__main__':
    test_key_endpoints()