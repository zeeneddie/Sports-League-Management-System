#!/usr/bin/env python3
"""
Test script om de local file integration te testen
"""

from scheduler import data_scheduler
import os
import time

def test_local_file_integration():
    print("=== Testing Local File Integration ===")

    # Clear cache en reset local file tracking
    data_scheduler.clear_cache()
    data_scheduler.local_files = {
        'uitslagen.json': None,
        'komende_wedstrijden.json': None
    }

    # Get initial data
    print("\n1. Getting initial data...")
    initial_data = data_scheduler.get_cached_data()
    if initial_data:
        initial_count = len(initial_data.get('last_week_results', []))
        print(f"   Initial last_week_results count: {initial_count}")
    else:
        print("   No initial data")
        return

    # Check local file modification tracking
    print("\n2. Testing local file modification tracking...")
    files_modified = data_scheduler.check_local_files_modified()
    print(f"   Files modified on first check: {files_modified}")
    print(f"   Local file mtimes: {data_scheduler.local_files}")

    # Simulate local file modification by touching uitslagen.json
    print("\n3. Simulating local file modification...")
    if os.path.exists('uitslagen.json'):
        # Touch the file to update modification time
        current_time = time.time()
        os.utime('uitslagen.json', (current_time, current_time))
        print("   Touched uitslagen.json")

        # Check if modification is detected
        files_modified = data_scheduler.check_local_files_modified()
        print(f"   Files modified after touch: {files_modified}")

    # Test data refresh after file modification
    print("\n4. Testing data refresh after file modification...")
    refreshed_data = data_scheduler.get_cached_data()
    if refreshed_data:
        refreshed_count = len(refreshed_data.get('last_week_results', []))
        print(f"   Refreshed last_week_results count: {refreshed_count}")

        if refreshed_count > initial_count:
            print("   SUCCESS: Local file data was integrated!")
        elif refreshed_count == initial_count:
            print("   INFO: Same count, check if local data was already present")
        else:
            print("   WARNING: Count decreased unexpectedly")
    else:
        print("   ERROR: No refreshed data")

    # Show some results for verification
    print("\n5. Recent results preview:")
    if refreshed_data and 'last_week_results' in refreshed_data:
        for i, result in enumerate(refreshed_data['last_week_results'][:3]):
            print(f"   {i+1}. {result.get('date', '')}: {result.get('home', '')} vs {result.get('away', '')} = {result.get('result', '')}")

if __name__ == '__main__':
    test_local_file_integration()