import requests
import json

def test_all_endpoints():
    """Test all API endpoints to verify functionality"""
    base_url = 'http://localhost:5000'
    
    endpoints = [
        '/api/data',
        '/api/standings',
        '/api/period-standings', 
        '/api/last-week-results',
        '/api/next-week-matches',
        '/api/featured-team-matches',
        '/api/team-matrix',
        '/api/all-matches',
        '/api/weekly-results'
    ]
    
    print("=== COMPREHENSIVE API TEST ===")
    
    for endpoint in endpoints:
        try:
            response = requests.get(f'{base_url}{endpoint}', timeout=5)
            print(f'{endpoint}: Status {response.status_code}')
            
            if response.status_code == 200:
                data = response.json()
                
                # Endpoint-specific validation
                if endpoint == '/api/next-week-matches':
                    matches = data.get('matches', [])
                    print(f'  → {len(matches)} komende wedstrijden')
                    if matches:
                        print(f'  → Eerste wedstrijd: {matches[0].get("home", "?")} vs {matches[0].get("away", "?")}')
                
                elif endpoint == '/api/team-matrix':
                    matrix = data.get('team_matrix', {})
                    teams = matrix.get('teams', [])
                    matrix_data = matrix.get('matrix', {})
                    filled_cells = sum(1 for h in matrix_data.values() for a in h.values() if a is not None)
                    print(f'  → {len(teams)} teams, {filled_cells} gevulde cellen')
                
                elif endpoint == '/api/last-week-results':
                    results = data.get('results', [])
                    print(f'  → {len(results)} resultaten vorige week')
                
                elif endpoint == '/api/featured-team-matches':
                    featured = data.get('featured_team_matches', {})
                    played = len(featured.get('played', []))
                    upcoming = len(featured.get('upcoming', []))
                    team_name = data.get('featured_team_name', 'Unknown')
                    print(f'  → {team_name}: {played} gespeeld, {upcoming} komend')
            else:
                print(f'  → ERROR: {response.text[:100]}')
                
        except Exception as e:
            print(f'{endpoint}: ERROR - {e}')
    
    print("\n=== TEST COMPLETE ===")

if __name__ == '__main__':
    test_all_endpoints()