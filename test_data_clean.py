from datetime import datetime, timedelta

def get_test_data():
    """Generate test data that mimics the hollandsevelden API structure"""
    
    # Real teams from Zaterdag 3e klasse N (2025-2026)
    teams = [
        "Columbia", "AGOVV", "SV Epe", "Groen Wit '62", "SV 't Harde", "VV Hattem",
        "SV Hatto Heim", "VV Heerde", "OWIOS", "VV SEH", "SP Teuge", "VIOS V", "VVOP", "Zwart-Wit '63"
    ]
    
    import random
    random.seed(42)  # For consistent test data
    
    current_date = datetime.now()
    
    # Track matches played by each team
    team_matches = {team: [] for team in teams}
    
    # Generate exactly 56 matches (8 per team * 14 teams / 2)
    selected_matches = []
    team_count = {team: 0 for team in teams}
    
    # Create all possible match combinations (each pair only once)
    all_fixtures = []
    for i in range(len(teams)):
        for j in range(i + 1, len(teams)):
            all_fixtures.append((teams[i], teams[j]))
    
    # Shuffle for randomness
    random.shuffle(all_fixtures)
    
    # Select matches ensuring balanced schedule (exactly 8 per team)
    for home_team, away_team in all_fixtures:
        if team_count[home_team] < 8 and team_count[away_team] < 8:
            # Randomly decide home/away
            if random.random() < 0.5:
                home_team, away_team = away_team, home_team
            
            selected_matches.append((home_team, away_team))
            team_count[home_team] += 1
            team_count[away_team] += 1
            
            # Check if all teams have 8 matches
            if all(count >= 8 for count in team_count.values()):
                break
    
    # Generate results for played matches
    results = []
    for match_idx, (home_team, away_team) in enumerate(selected_matches):
        # Distribute matches over past 8 weeks
        week_num = match_idx // 7  # ~7 matches per week
        days_ago = week_num * 7 + (match_idx % 7)
        match_date = current_date - timedelta(days=days_ago)
        
        # Ensure it's a Saturday
        if match_date.weekday() != 5:  # 5 = Saturday
            match_date = match_date - timedelta(days=match_date.weekday() + 2)
        
        # Generate realistic scores
        home_score = random.choices([0,1,2,3,4,5], weights=[5,15,25,30,20,5])[0]
        away_score = random.choices([0,1,2,3,4,5], weights=[10,20,30,25,10,5])[0]
        
        # Random time between 14:00 and 17:00
        match_time = random.choice(['14:00', '15:00', '16:00', '17:00'])
        
        match_data = {
            'date': match_date.strftime('%Y-%m-%d'),
            'hometeam': home_team,
            'awayteam': away_team,
            'homescore': home_score,
            'awayscore': away_score,
            'time': match_time
        }
        results.append(match_data)
        team_matches[home_team].append(match_data)
        team_matches[away_team].append(match_data)
    
    # Calculate league table from actual results
    league_table = []
    for team in teams:
        played = len(team_matches[team])
        wins = draws = losses = 0
        goals_for = goals_against = 0
        
        for match in team_matches[team]:
            if match['hometeam'] == team:
                goals_for += match['homescore']
                goals_against += match['awayscore']
                if match['homescore'] > match['awayscore']:
                    wins += 1
                elif match['homescore'] == match['awayscore']:
                    draws += 1
                else:
                    losses += 1
            else:
                goals_for += match['awayscore']
                goals_against += match['homescore']
                if match['awayscore'] > match['homescore']:
                    wins += 1
                elif match['awayscore'] == match['homescore']:
                    draws += 1
                else:
                    losses += 1
        
        points = wins * 3 + draws
        
        league_table.append({
            'team': team,
            'played': played,
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'goals_for': goals_for,
            'goals_against': goals_against,
            'points': points,
            'position': 0  # Will be set after sorting
        })
    
    # Sort by points (descending), then by goal difference
    league_table.sort(key=lambda x: (x['points'], x['goals_for'] - x['goals_against']), reverse=True)
    for i, team_data in enumerate(league_table):
        team_data['position'] = i + 1
    
    # Generate period standings based on actual match results
    period1 = []  # First 3 matches per team
    period2 = []  # Next 3 matches per team
    period3 = []  # Remaining 2 matches per team
    
    for team in teams:
        team_results = team_matches[team]
        
        # Period 1 - first 3 matches
        period1_matches = team_results[:3]
        if period1_matches:
            played = len(period1_matches)
            wins = draws = losses = goals_for = goals_against = 0
            
            for match in period1_matches:
                if match['hometeam'] == team:
                    goals_for += match['homescore']
                    goals_against += match['awayscore']
                    if match['homescore'] > match['awayscore']:
                        wins += 1
                    elif match['homescore'] == match['awayscore']:
                        draws += 1
                    else:
                        losses += 1
                else:
                    goals_for += match['awayscore']
                    goals_against += match['homescore']
                    if match['awayscore'] > match['homescore']:
                        wins += 1
                    elif match['awayscore'] == match['homescore']:
                        draws += 1
                    else:
                        losses += 1
            
            period1.append({
                'team': team,
                'played': played,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'points': wins * 3 + draws
            })
        
        # Period 2 - matches 4-6
        period2_matches = team_results[3:6]
        if period2_matches:
            played = len(period2_matches)
            wins = draws = losses = goals_for = goals_against = 0
            
            for match in period2_matches:
                if match['hometeam'] == team:
                    goals_for += match['homescore']
                    goals_against += match['awayscore']
                    if match['homescore'] > match['awayscore']:
                        wins += 1
                    elif match['homescore'] == match['awayscore']:
                        draws += 1
                    else:
                        losses += 1
                else:
                    goals_for += match['awayscore']
                    goals_against += match['homescore']
                    if match['awayscore'] > match['homescore']:
                        wins += 1
                    elif match['awayscore'] == match['homescore']:
                        draws += 1
                    else:
                        losses += 1
            
            period2.append({
                'team': team,
                'played': played,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'points': wins * 3 + draws
            })
        
        # Period 3 - matches 7-8
        period3_matches = team_results[6:8]
        if period3_matches:
            played = len(period3_matches)
            wins = draws = losses = goals_for = goals_against = 0
            
            for match in period3_matches:
                if match['hometeam'] == team:
                    goals_for += match['homescore']
                    goals_against += match['awayscore']
                    if match['homescore'] > match['awayscore']:
                        wins += 1
                    elif match['homescore'] == match['awayscore']:
                        draws += 1
                    else:
                        losses += 1
                else:
                    goals_for += match['awayscore']
                    goals_against += match['homescore']
                    if match['awayscore'] > match['homescore']:
                        wins += 1
                    elif match['awayscore'] == match['homescore']:
                        draws += 1
                    else:
                        losses += 1
            
            period3.append({
                'team': team,
                'played': played,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'points': wins * 3 + draws
            })
    
    # Sort periods by points
    period1.sort(key=lambda x: (x['points'], x['goals_for'] - x['goals_against']), reverse=True)
    period2.sort(key=lambda x: (x['points'], x['goals_for'] - x['goals_against']), reverse=True)
    period3.sort(key=lambda x: (x['points'], x['goals_for'] - x['goals_against']), reverse=True)
    
    # Generate upcoming matches for the next 12 weeks
    program = []
    
    # Generate more future fixtures to continue the season
    remaining_fixtures = []
    for i in range(len(teams)):
        for j in range(i + 1, len(teams)):
            home_team, away_team = teams[i], teams[j]
            # Check if this fixture was already played (either direction)
            already_played = any(
                (match['hometeam'] == home_team and match['awayteam'] == away_team) or
                (match['hometeam'] == away_team and match['awayteam'] == home_team)
                for match in results
            )
            if not already_played:
                # Add both directions for variety
                remaining_fixtures.append((home_team, away_team))
                remaining_fixtures.append((away_team, home_team))
    
    # Shuffle for variety
    random.shuffle(remaining_fixtures)
    
    # Generate future matches over next 12 weeks
    matches_scheduled = 0
    for week_num in range(12):
        # Find next Saturday
        future_date = current_date + timedelta(days=1)
        while future_date.weekday() != 5:  # Saturday
            future_date += timedelta(days=1)
        future_date += timedelta(weeks=week_num)
        
        # Schedule 6-8 matches per week
        matches_this_week = min(8, len(remaining_fixtures) - matches_scheduled)
        
        for match_num in range(matches_this_week):
            if matches_scheduled < len(remaining_fixtures):
                home_team, away_team = remaining_fixtures[matches_scheduled]
                
                # Random time between 14:00 and 17:00
                match_time = random.choice(['14:00', '15:00', '16:00', '17:00'])
                
                program.append({
                    'date': future_date.strftime('%Y-%m-%d'),
                    'hometeam': home_team,
                    'awayteam': away_team,
                    'time': match_time
                })
                
                matches_scheduled += 1
        
        if matches_scheduled >= len(remaining_fixtures):
            break
    
    return {
        'leaguetable': league_table,
        'period1': period1,
        'period2': period2,
        'period3': period3,
        'results': results,
        'program': program
    }