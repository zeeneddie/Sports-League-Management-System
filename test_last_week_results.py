#!/usr/bin/env python3
"""
Test script om get_last_week_results functie te debuggen
"""

from hollandsevelden import get_data, get_last_week_results
from datetime import datetime, timedelta
import json

def test_last_week_results():
    print("=== Testing get_last_week_results function ===")

    # Get fresh data
    print("Fetching data...")
    data = get_data(use_test_data=False)

    if not data:
        print("No data received")
        return

    print(f"Data keys: {list(data.keys())}")
    print(f"Results count: {len(data.get('results', []))}")

    # Show all results with dates
    print("\nAll results in data:")
    for i, result in enumerate(data.get('results', [])):
        print(f"  {i+1}. {result.get('date', 'NO DATE')}: {result.get('home', '')} vs {result.get('away', '')} = {result.get('result', '')} (Status: {result.get('status', '')})")

    # Test date parsing
    print("\nTesting date parsing:")
    today = datetime.now()
    week_ago = today - timedelta(days=7)
    print(f"Today: {today}")
    print(f"Week ago: {week_ago}")

    from hollandsevelden import _parse_match_date

    for result in data.get('results', []):
        date_str = result.get('date', '')
        parsed_date = _parse_match_date(date_str)
        in_range = parsed_date and week_ago <= parsed_date <= today if parsed_date else False
        print(f"  Date: '{date_str}' -> {parsed_date} -> In range: {in_range}")

    # Test the function
    print("\nTesting get_last_week_results:")
    last_week = get_last_week_results(data)
    print(f"Last week results count: {len(last_week)}")

    for result in last_week:
        print(f"  {result.get('date', '')}: {result.get('home', '')} vs {result.get('away', '')} = {result.get('result', '')}")

if __name__ == '__main__':
    test_last_week_results()