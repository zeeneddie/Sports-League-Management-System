#!/usr/bin/env python3
"""
Debug script voor Flask app cache probleem
"""

from app import data_scheduler, _get_cached_data_with_error_handling, _format_api_response

def debug_flask_cache():
    print("=== Debugging Flask Cache ===")

    # Test direct scheduler access
    print("\n1. Direct scheduler access:")
    scheduler_data = data_scheduler.get_cached_data()
    if scheduler_data:
        print(f"   Scheduler data keys: {list(scheduler_data.keys())}")
        print(f"   last_week_results count: {len(scheduler_data.get('last_week_results', []))}")
    else:
        print("   No scheduler data")

    # Test Flask wrapper function
    print("\n2. Flask wrapper function:")
    flask_data, error = _get_cached_data_with_error_handling()
    if error:
        print(f"   Flask wrapper error: {error}")
    elif flask_data:
        print(f"   Flask data keys: {list(flask_data.keys())}")
        print(f"   last_week_results count: {len(flask_data.get('last_week_results', []))}")
    else:
        print("   No Flask data")

    # Test API formatting
    print("\n3. API response formatting:")
    if flask_data:
        response = _format_api_response(flask_data, 'last_week_results', 'results')
        print(f"   Response type: {type(response)}")
        # Try to get data from response
        try:
            response_data = response.get_json()
            print(f"   Response keys: {list(response_data.keys())}")
            print(f"   Response results count: {len(response_data.get('results', []))}")
        except Exception as e:
            print(f"   Error getting response data: {e}")

    # Test scheduler memory vs file
    print("\n4. Scheduler memory vs file comparison:")
    print(f"   Scheduler cached_data exists: {data_scheduler.cached_data is not None}")
    if data_scheduler.cached_data:
        print(f"   Memory last_week_results: {len(data_scheduler.cached_data.get('last_week_results', []))}")

    # Load file directly
    import json
    try:
        with open('league_data.json', 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        print(f"   File last_week_results: {len(file_data.get('last_week_results', []))}")
    except Exception as e:
        print(f"   Error loading file: {e}")

if __name__ == '__main__':
    debug_flask_cache()