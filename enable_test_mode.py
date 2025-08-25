#!/usr/bin/env python3
"""
Script to enable test mode with noord-zaterdag-1f.json data and Gorecht as featured team
"""

import os

def enable_test_mode():
    """Enable test mode by setting USE_TEST_DATA environment variable"""
    print("=== ENABLING TEST MODE ===")
    print()
    
    # Set environment variable for current process
    os.environ['USE_TEST_DATA'] = 'true'
    
    # Check if .env file exists
    env_file_path = '.env'
    
    print("* Setting USE_TEST_DATA=true in environment")
    print("* Featured team will be: VV Gorecht")
    print("* Data source will be: noord-zaterdag-1f.json")
    print()
    
    # Update or create .env file
    env_lines = []
    use_test_data_found = False
    
    if os.path.exists(env_file_path):
        print(f"✓ Reading existing {env_file_path}")
        with open(env_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('USE_TEST_DATA='):
                    env_lines.append('USE_TEST_DATA=true')
                    use_test_data_found = True
                    print(f"✓ Updated USE_TEST_DATA=true in {env_file_path}")
                else:
                    env_lines.append(line)
    
    # Add USE_TEST_DATA if not found
    if not use_test_data_found:
        env_lines.append('USE_TEST_DATA=true')
        print(f"✓ Added USE_TEST_DATA=true to {env_file_path}")
    
    # Write back to .env file
    with open(env_file_path, 'w') as f:
        for line in env_lines:
            if line:  # Skip empty lines
                f.write(line + '\n')
    
    print()
    print("=== TEST MODE ENABLED ===")
    print()
    print("Now you can run:")
    print("  python app.py")
    print()
    print("The dashboard will show:")
    print("  - League data from noord-zaterdag-1f.json")  
    print("  - Featured team: VV Gorecht")
    print("  - Gorecht's position: 9th place with 22 points")
    print("  - All Gorecht matches in the featured team screen")
    print()

def disable_test_mode():
    """Disable test mode by setting USE_TEST_DATA to false"""
    print("=== DISABLING TEST MODE ===")
    print()
    
    # Set environment variable for current process
    os.environ['USE_TEST_DATA'] = 'false'
    
    # Update .env file
    env_file_path = '.env'
    env_lines = []
    
    if os.path.exists(env_file_path):
        print(f"✓ Reading existing {env_file_path}")
        with open(env_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('USE_TEST_DATA='):
                    env_lines.append('USE_TEST_DATA=false')
                    print(f"✓ Updated USE_TEST_DATA=false in {env_file_path}")
                else:
                    env_lines.append(line)
    
    # Write back to .env file
    with open(env_file_path, 'w') as f:
        for line in env_lines:
            if line:  # Skip empty lines
                f.write(line + '\n')
    
    print()
    print("=== TEST MODE DISABLED ===")
    print()
    print("Now the system will:")
    print("  - Use live API data from hollandsevelden.nl")  
    print("  - Featured team: AVV Columbia")
    print()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'disable':
        disable_test_mode()
    else:
        enable_test_mode()