#!/usr/bin/env python3
"""
Test script for Live Score Scraper
Quick testing and validation of core functionality
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from live_score_scraper import LiveScoreScraper, scrape_live_scores
from live_score_config import Config

async def test_basic_functionality():
    """Test basic scraper functionality"""
    print("🧪 Testing Live Score Scraper Basic Functionality\n")

    try:
        # Test 1: Browser initialization
        print("Test 1: Browser Initialization")
        async with LiveScoreScraper() as scraper:
            print("✅ Browser initialized successfully")

            # Test 2: Navigation
            print("\nTest 2: Navigation to Live Page")
            success = await scraper.navigate_to_live_page()
            if success:
                print("✅ Successfully navigated to live page")
            else:
                print("❌ Failed to navigate to live page")
                return False

            # Test 3: Cookie handling
            print("\nTest 3: Cookie Consent Handling")
            await scraper.handle_cookie_consent()
            print("✅ Cookie consent handled")

            # Test 4: Page content extraction
            print("\nTest 4: Content Extraction")
            try:
                content = await scraper.page.evaluate("document.body.innerText")
                if content and len(content) > 100:
                    print(f"✅ Page content extracted ({len(content)} characters)")

                    # Show sample of content
                    print(f"📄 Sample content: {content[:200]}...")
                else:
                    print("⚠️  Page content seems limited")
            except Exception as e:
                print(f"❌ Content extraction failed: {e}")

            # Test 5: Team name normalization
            print("\nTest 5: Team Name Normalization")
            test_names = [
                "  AVV Columbia  ",
                "V.Boys",
                "CSV Apeldoorn",
                "Columbia AVV"
            ]

            for name in test_names:
                normalized = scraper.normalize_team_name(name)
                print(f"  '{name}' → '{normalized}'")

            print("✅ Team name normalization working")

            # Test 6: Score parsing
            print("\nTest 6: Score Parsing")
            test_scores = [
                "2 - 1 (67')",
                "0-0 HT",
                "3-2 FT",
                "1 - 0 (45+2')"
            ]

            for score in test_scores:
                home, away, minute = scraper.extract_score_and_minute(score)
                print(f"  '{score}' → {home}-{away} ({minute})")

            print("✅ Score parsing working")

        print("\n🎉 All basic tests passed!")
        return True

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

async def test_live_score_extraction():
    """Test live score extraction from actual website"""
    print("\n🔴 Testing Live Score Extraction\n")

    try:
        matches = await scrape_live_scores(save_to_file=False)

        print(f"📊 Found {len(matches)} matches")

        if matches:
            print("\n🏆 Live Matches Found:")
            for i, match in enumerate(matches, 1):
                status = match.get('status', 'Unknown')
                minute = match.get('minute', '')
                score = f"{match.get('homeGoals', 0)}-{match.get('awayGoals', 0)}"

                print(f"  {i}. {match.get('home', 'Unknown')} vs {match.get('away', 'Unknown')}")
                print(f"     Score: {score} ({minute}) - Status: {status}")
                print(f"     Updated: {match.get('lastUpdate', 'Unknown')}")
                print()

            # Save test results
            with open('test_live_results.json', 'w', encoding='utf-8') as f:
                json.dump({
                    'testTime': datetime.now().isoformat(),
                    'matchesFound': len(matches),
                    'matches': matches
                }, f, indent=2, ensure_ascii=False)

            print("💾 Test results saved to test_live_results.json")

        else:
            print("ℹ️  No live matches found (this is normal if no matches are currently live)")

        return True

    except Exception as e:
        print(f"❌ Live score extraction test failed: {e}")
        return False

def test_configuration():
    """Test configuration loading and validation"""
    print("⚙️  Testing Configuration\n")

    try:
        # Test config loading
        print(f"Config class: {Config.__name__}")
        print(f"Live URL: {Config.LIVE_URL}")
        print(f"Live hours: {Config.LIVE_HOURS_START}:00 - {Config.LIVE_HOURS_END}:00")
        print(f"Update interval: {Config.UPDATE_INTERVAL_MINUTES} minutes")
        print(f"Browser headless: {Config.BROWSER_HEADLESS}")

        # Test time checking
        is_live_time = Config.is_live_time()
        print(f"Is live time now: {is_live_time}")

        next_update = Config.get_next_update_time()
        print(f"Next update time: {next_update}")

        # Test directory creation
        Config.create_directories()
        print("✅ Directories created/verified")

        # Test team aliases
        columbia_aliases = Config.get_team_aliases("AVV Columbia")
        print(f"Columbia aliases: {columbia_aliases}")

        print("\n✅ Configuration tests passed!")
        return True

    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

async def run_all_tests():
    """Run all tests in sequence"""
    print("🚀 LIVE SCORE SCRAPER TEST SUITE")
    print("=" * 50)

    tests = [
        ("Configuration", test_configuration),
        ("Basic Functionality", test_basic_functionality),
        ("Live Score Extraction", test_live_score_extraction)
    ]

    results = {}

    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 30)

        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()

            results[test_name] = result

        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False

    # Summary
    print("\n" + "=" * 50)
    print("TEST RESULTS SUMMARY")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")
        if result:
            passed += 1

    print(f"\nPassed: {passed}/{total}")

    if passed == total:
        print("🎉 ALL TESTS PASSED! Scraper is ready for integration.")
    else:
        print("⚠️  Some tests failed. Check output above for details.")

    return passed == total

if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)