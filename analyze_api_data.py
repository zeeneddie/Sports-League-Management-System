#!/usr/bin/env python3
"""
Script om de volledige API data van hollandsevelden.nl te analyseren
en te zien welke uitslagen beschikbaar zijn die we mogelijk missen
"""

import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fetch_raw_api_data():
    """Haal de volledige ruwe API data op"""
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0"
    x_api_key = os.getenv('HOLLANDSE_VELDEN_API_KEY', 'b73ibxfaivpaa7a68pbapckgpt0q947y')
    apiUrl = 'https://api.hollandsevelden.nl/competities/2025-2026/oost/za/3n/'

    try:
        print(f"Fetching data from: {apiUrl}")
        response = requests.get(apiUrl, headers={"User-Agent": user_agent, "x-api-key": x_api_key})

        if response.status_code != 200:
            print(f"API request failed with status: {response.status_code}")
            return None

        try:
            data = json.loads(response.text)
            print(f"Successfully fetched API data")
            return data
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            return None

    except Exception as e:
        print(f"Error fetching API data: {e}")
        return None

def analyze_api_structure(data):
    """Analyseer de structuur van de API data"""
    print("\n=== API DATA STRUCTURE ANALYSIS ===")

    if not data:
        print("No data to analyze")
        return

    print(f"Top level keys: {list(data.keys())}")

    for period_key, period_data in data.items():
        print(f"\n--- Period: {period_key} ---")
        if isinstance(period_data, dict):
            print(f"  Keys: {list(period_data.keys())}")

            # Analyze results
            if 'results' in period_data:
                results = period_data['results']
                print(f"  Results count: {len(results)}")
                if results:
                    print(f"  First result: {results[0]}")

                    # Count played vs upcoming
                    played_count = 0
                    upcoming_count = 0
                    for result in results:
                        status = result.get('status', '').lower()
                        if 'uitgespeeld' in status or 'gespeeld' in status:
                            played_count += 1
                        else:
                            upcoming_count += 1

                    print(f"  Played matches: {played_count}")
                    print(f"  Upcoming matches: {upcoming_count}")

            # Analyze program
            if 'program' in period_data:
                program = period_data['program']
                print(f"  Program count: {len(program)}")
                if program:
                    print(f"  First program: {program[0]}")

def find_recent_results(data, days_back=7):
    """Vind alle recente uitslagen in de API data"""
    print(f"\n=== RECENT RESULTS (last {days_back} days) ===")

    if not data:
        return []

    cutoff_date = datetime.now() - timedelta(days=days_back)
    recent_results = []

    for period_key, period_data in data.items():
        if isinstance(period_data, dict) and 'results' in period_data:
            results = period_data['results']

            for result in results:
                status = result.get('status', '').lower()
                if 'uitgespeeld' in status or 'gespeeld' in status:
                    # Parse date
                    date_str = result.get('date', '')
                    try:
                        # Try different date formats
                        for date_format in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
                            try:
                                result_date = datetime.strptime(date_str, date_format)
                                break
                            except ValueError:
                                continue
                        else:
                            print(f"Could not parse date: {date_str}")
                            continue

                        if result_date >= cutoff_date:
                            recent_results.append({
                                'period': period_key,
                                'date': date_str,
                                'home': result.get('home', ''),
                                'away': result.get('away', ''),
                                'result': result.get('result', ''),
                                'status': result.get('status', '')
                            })
                    except Exception as e:
                        print(f"Error parsing date {date_str}: {e}")

    print(f"Found {len(recent_results)} recent results:")
    for result in recent_results:
        print(f"  {result['date']}: {result['home']} vs {result['away']} = {result['result']} (Period: {result['period']})")

    return recent_results

def compare_with_current_data():
    """Vergelijk met de huidige league_data.json"""
    print(f"\n=== COMPARISON WITH CURRENT DATA ===")

    try:
        with open('league_data.json', 'r', encoding='utf-8') as f:
            current_data = json.load(f)

        current_results = current_data.get('last_week_results', [])
        print(f"Current last_week_results count: {len(current_results)}")

        if current_results:
            print("Current results:")
            for result in current_results:
                print(f"  {result.get('date', '')}: {result.get('home', '')} vs {result.get('away', '')} = {result.get('result', '')}")
        else:
            print("No current results found!")

    except FileNotFoundError:
        print("league_data.json not found")
    except Exception as e:
        print(f"Error reading current data: {e}")

def main():
    print("=== HOLLANDSE VELDEN API DATA ANALYSIS ===")

    # Fetch raw API data
    raw_data = fetch_raw_api_data()

    if raw_data:
        # Save raw data for inspection
        with open('raw_api_data.json', 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print("Raw API data saved to 'raw_api_data.json'")

        # Analyze structure
        analyze_api_structure(raw_data)

        # Find recent results
        recent_results = find_recent_results(raw_data, days_back=7)

        # Compare with current data
        compare_with_current_data()

        print(f"\n=== SUMMARY ===")
        print(f"Total recent results found in API: {len(recent_results)}")
        print("Check 'raw_api_data.json' for full API response")
    else:
        print("Failed to fetch API data")

if __name__ == '__main__':
    main()