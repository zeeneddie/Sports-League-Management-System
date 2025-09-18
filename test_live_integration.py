#!/usr/bin/env python3
"""
Comprehensive Integration Tests for Live Score System
Tests end-to-end workflow: scraper → merger → scheduler
"""

import asyncio
import json
import os
import shutil
import sys
import tempfile
import unittest
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from live_score_scraper import LiveScoreScraper, scrape_live_scores
from live_score_merger import LiveScoreMerger, merge_live_scores
from live_score_config import Config as LiveConfig
from scheduler import DataScheduler

class TestLiveScoreIntegration(unittest.TestCase):
    """Integration tests for the complete live score system"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        # Create test data files
        self.create_test_data_files()

    def tearDown(self):
        """Clean up test environment"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir)

    def create_test_data_files(self):
        """Create mock data files for testing"""

        # Test teams configuration
        teams_config = """# Test teams configuration
AVV Columbia
Apeldoorn CSV
Victoria Boys
Albatross
TKA
"""
        with open('teams.config', 'w', encoding='utf-8') as f:
            f.write(teams_config)

        # Mock komende_wedstrijden.json
        upcoming_matches = [
            {
                "status": "Nog te spelen",
                "date": "2025-09-20",
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 0,
                "awayGoals": 0,
                "result": "",
                "time": "15:00"
            },
            {
                "status": "Nog te spelen",
                "date": "2025-09-20",
                "home": "Apeldoorn CSV",
                "away": "TKA",
                "homeGoals": 0,
                "awayGoals": 0,
                "result": "",
                "time": "14:30"
            },
            {
                "status": "Nog te spelen",
                "date": "2025-09-20",
                "home": "Victoria Boys",
                "away": "Albatross",
                "homeGoals": 0,
                "awayGoals": 0,
                "result": "",
                "time": "16:00"
            }
        ]

        with open('komende_wedstrijden.json', 'w', encoding='utf-8') as f:
            json.dump(upcoming_matches, f, indent=2, ensure_ascii=False)

        # Mock league_data.json structure
        league_data = {
            "raw_data": {
                "leaguetable": [
                    {"team": "AVV Columbia", "position": 1, "played": 5, "points": 12},
                    {"team": "VV SEH", "position": 2, "played": 5, "points": 10}
                ]
            },
            "featured_team_matches": {
                "upcoming": [
                    {
                        "status": "Nog te spelen",
                        "date": "2025-09-20",
                        "home": "AVV Columbia",
                        "away": "VV SEH",
                        "homeGoals": 0,
                        "awayGoals": 0,
                        "result": "",
                        "time": "15:00"
                    }
                ]
            },
            "last_updated": datetime.now().isoformat()
        }

        with open('league_data.json', 'w', encoding='utf-8') as f:
            json.dump(league_data, f, indent=2, ensure_ascii=False)

    def test_team_name_normalization(self):
        """Test team name normalization and matching"""
        merger = LiveScoreMerger()

        test_cases = [
            ("AVV Columbia", "Columbia", True),
            ("Columbia AVV", "AVV Columbia", True),
            ("CSV Apeldoorn", "Apeldoorn CSV", True),
            ("V.Boys", "Victoria Boys", True),
            ("Random Team", "Other Team", False)
        ]

        for name1, name2, should_match in test_cases:
            score = merger.calculate_team_match_score(name1, name2)

            if should_match:
                self.assertGreaterEqual(score, LiveConfig.FUZZY_MATCH_THRESHOLD,
                                      f"'{name1}' should match '{name2}' (score: {score})")
            else:
                self.assertLess(score, LiveConfig.FUZZY_MATCH_THRESHOLD,
                               f"'{name1}' should not match '{name2}' (score: {score})")

    def test_live_score_merger_basic(self):
        """Test basic live score merging functionality"""
        merger = LiveScoreMerger()

        # Mock live scores
        live_scores = [
            {
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 2,
                "awayGoals": 1,
                "minute": "67'",
                "status": "Live",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test"
            }
        ]

        # Test merge
        success = merger.merge_live_scores_to_file('komende_wedstrijden.json', live_scores)
        self.assertTrue(success, "Live score merge should succeed")

        # Verify results
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            updated_matches = json.load(f)

        # Find the updated match
        columbia_match = None
        for match in updated_matches:
            if match['home'] == 'AVV Columbia' and match['away'] == 'VV SEH':
                columbia_match = match
                break

        self.assertIsNotNone(columbia_match, "Columbia match should be found")
        self.assertEqual(columbia_match['homeGoals'], 2, "Home goals should be updated")
        self.assertEqual(columbia_match['awayGoals'], 1, "Away goals should be updated")
        self.assertEqual(columbia_match['status'], 'Live', "Status should be Live")
        self.assertEqual(columbia_match['minute'], "67'", "Minute should be updated")
        self.assertTrue(columbia_match.get('isLive', False), "isLive flag should be set")

    def test_data_backup_and_rollback(self):
        """Test backup creation and rollback functionality"""
        merger = LiveScoreMerger()

        # Get original file content
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Create backup
        backup_path = merger.create_backup('komende_wedstrijden.json')
        self.assertTrue(backup_path, "Backup should be created")
        self.assertTrue(os.path.exists(backup_path), "Backup file should exist")

        # Modify original file
        with open('komende_wedstrijden.json', 'w', encoding='utf-8') as f:
            f.write('{"modified": true}')

        # Test rollback
        success = merger.rollback_changes()
        self.assertTrue(success, "Rollback should succeed")

        # Verify rollback
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            restored_content = f.read()

        self.assertEqual(original_content, restored_content, "Content should be restored")

    def test_data_validation(self):
        """Test data validation rules"""
        merger = LiveScoreMerger()

        # Valid data
        valid_matches = [
            {
                "home": "Team A",
                "away": "Team B",
                "homeGoals": 2,
                "awayGoals": 1,
                "minute": "45'"
            }
        ]

        self.assertTrue(merger.validate_merged_data(valid_matches),
                       "Valid data should pass validation")

        # Invalid data - missing required field
        invalid_matches1 = [
            {
                "home": "Team A",
                # Missing 'away' field
                "homeGoals": 2,
                "awayGoals": 1
            }
        ]

        self.assertFalse(merger.validate_merged_data(invalid_matches1),
                        "Invalid data (missing field) should fail validation")

        # Invalid data - unrealistic score
        invalid_matches2 = [
            {
                "home": "Team A",
                "away": "Team B",
                "homeGoals": 50,  # Unrealistic
                "awayGoals": 1
            }
        ]

        self.assertFalse(merger.validate_merged_data(invalid_matches2),
                        "Invalid data (unrealistic score) should fail validation")

    def test_complex_structure_merge(self):
        """Test merging with complex file structure (league_data.json)"""
        merger = LiveScoreMerger()

        live_scores = [
            {
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 1,
                "awayGoals": 0,
                "minute": "30'",
                "status": "Live",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test"
            }
        ]

        # Test merge with complex structure
        success = merger.merge_live_scores_to_file('league_data.json', live_scores)
        self.assertTrue(success, "Complex structure merge should succeed")

        # Verify structure preservation
        with open('league_data.json', 'r', encoding='utf-8') as f:
            updated_data = json.load(f)

        self.assertIn('raw_data', updated_data, "Raw data should be preserved")
        self.assertIn('featured_team_matches', updated_data, "Featured team matches should be preserved")
        self.assertIn('upcoming', updated_data['featured_team_matches'], "Upcoming matches should be preserved")

        # Verify live score update
        columbia_match = updated_data['featured_team_matches']['upcoming'][0]
        self.assertEqual(columbia_match['homeGoals'], 1, "Home goals should be updated in complex structure")
        self.assertEqual(columbia_match['status'], 'Live', "Status should be updated in complex structure")

    def test_multiple_matches_merge(self):
        """Test merging multiple live scores at once"""
        live_scores = [
            {
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 2,
                "awayGoals": 1,
                "minute": "75'",
                "status": "Live",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test"
            },
            {
                "home": "Apeldoorn CSV",
                "away": "TKA",
                "homeGoals": 0,
                "awayGoals": 3,
                "minute": "HT",
                "status": "halftime",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test"
            }
        ]

        # Test bulk merge
        results = merge_live_scores(live_scores, ['komende_wedstrijden.json'])
        self.assertTrue(results['komende_wedstrijden.json'], "Bulk merge should succeed")

        # Verify both matches updated
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            matches = json.load(f)

        columbia_updated = False
        csv_updated = False

        for match in matches:
            if match['home'] == 'AVV Columbia' and match['homeGoals'] == 2:
                columbia_updated = True
            elif match['home'] == 'Apeldoorn CSV' and match['awayGoals'] == 3:
                csv_updated = True

        self.assertTrue(columbia_updated, "Columbia match should be updated")
        self.assertTrue(csv_updated, "CSV match should be updated")

    def test_fuzzy_team_matching(self):
        """Test fuzzy team name matching edge cases"""
        merger = LiveScoreMerger()

        # Create test data with variations
        existing_matches = [
            {"home": "V. Boys", "away": "CSV Apeldoorn", "homeGoals": 0, "awayGoals": 0}
        ]

        live_score = {
            "home": "Victoria Boys",  # Should match "V. Boys"
            "away": "Apeldoorn CSV",  # Should match "CSV Apeldoorn"
            "homeGoals": 1,
            "awayGoals": 2,
            "minute": "85'",
            "status": "Live"
        }

        # Test fuzzy matching
        match_result = merger.find_matching_existing_match(live_score, existing_matches)
        self.assertIsNotNone(match_result, "Fuzzy matching should find the match")

        matched_existing, confidence = match_result
        self.assertGreaterEqual(confidence, LiveConfig.FUZZY_MATCH_THRESHOLD,
                               f"Match confidence should be above threshold (got {confidence})")

    @patch('live_score_config.Config.is_live_time')
    def test_scheduler_integration(self, mock_is_live_time):
        """Test scheduler integration with live scores"""
        mock_is_live_time.return_value = True

        scheduler = DataScheduler()

        # Mock the scrape_live_scores function to return test data
        test_live_scores = [
            {
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 1,
                "awayGoals": 1,
                "minute": "90'",
                "status": "Live",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test"
            }
        ]

        with patch('scheduler.scrape_live_scores') as mock_scraper:
            mock_scraper.return_value = test_live_scores

            # Run live score update
            scheduler.run_live_score_update()

            # Verify scraper was called
            mock_scraper.assert_called_once_with(save_to_file=True)

            # Verify tracking variables updated
            self.assertTrue(scheduler.live_scores_active, "Live scores should be marked as active")
            self.assertIsNotNone(scheduler.last_live_update, "Last live update should be recorded")

    def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        print("\n🔄 Testing End-to-End Live Score Workflow")

        # Step 1: Mock live scores (simulating scraper output)
        mock_live_scores = [
            {
                "home": "AVV Columbia",
                "away": "VV SEH",
                "homeGoals": 3,
                "awayGoals": 2,
                "minute": "FT",
                "status": "fulltime",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test_e2e"
            },
            {
                "home": "Victoria Boys",
                "away": "Albatross",
                "homeGoals": 1,
                "awayGoals": 0,
                "minute": "67'",
                "status": "Live",
                "lastUpdate": datetime.now().isoformat(),
                "source": "test_e2e"
            }
        ]

        print(f"📥 Processing {len(mock_live_scores)} live scores")

        # Step 2: Merge into all target files
        target_files = ['komende_wedstrijden.json', 'league_data.json']
        results = merge_live_scores(mock_live_scores, target_files)

        # Step 3: Verify all merges succeeded
        for file_path, success in results.items():
            self.assertTrue(success, f"Merge should succeed for {file_path}")
            print(f"✅ {file_path} updated successfully")

        # Step 4: Verify final state in both files
        # Check komende_wedstrijden.json
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            upcoming_matches = json.load(f)

        columbia_found = False
        victoria_found = False

        for match in upcoming_matches:
            if match['home'] == 'AVV Columbia':
                self.assertEqual(match['status'], 'Afgelopen', "Columbia match should be finished")
                self.assertEqual(match['result'], '3-2', "Columbia result should be 3-2")
                columbia_found = True
            elif match['home'] == 'Victoria Boys':
                self.assertEqual(match['status'], 'Live', "Victoria match should be live")
                self.assertEqual(match['minute'], "67'", "Victoria minute should be 67'")
                victoria_found = True

        self.assertTrue(columbia_found, "Columbia match should be found and updated")
        self.assertTrue(victoria_found, "Victoria match should be found and updated")

        # Check league_data.json
        with open('league_data.json', 'r', encoding='utf-8') as f:
            league_data = json.load(f)

        featured_match = league_data['featured_team_matches']['upcoming'][0]
        self.assertEqual(featured_match['homeGoals'], 3, "Featured match should show final score")
        self.assertEqual(featured_match['status'], 'Afgelopen', "Featured match should be finished")

        print("🎉 End-to-end workflow completed successfully!")

class TestLiveScoreEdgeCases(unittest.TestCase):
    """Test edge cases and error scenarios"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

    def tearDown(self):
        """Clean up test environment"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir)

    def test_missing_target_file(self):
        """Test handling of missing target files"""
        live_scores = [{"home": "Team A", "away": "Team B", "homeGoals": 1, "awayGoals": 0}]

        results = merge_live_scores(live_scores, ['nonexistent_file.json'])
        self.assertFalse(results['nonexistent_file.json'], "Missing file should fail gracefully")

    def test_empty_live_scores(self):
        """Test handling of empty live scores"""
        results = merge_live_scores([], ['test_file.json'])
        self.assertEqual(len(results), 0, "Empty live scores should return empty results")

    def test_corrupted_json_file(self):
        """Test handling of corrupted JSON files"""
        # Create corrupted JSON file
        with open('corrupted.json', 'w') as f:
            f.write('{"incomplete": json data')

        merger = LiveScoreMerger()
        matches = merger.load_existing_matches('corrupted.json')
        self.assertEqual(len(matches), 0, "Corrupted file should return empty list")

def run_integration_tests():
    """Run all integration tests"""
    print("🧪 Running Live Score Integration Tests")
    print("=" * 60)

    # Create test suite
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTest(unittest.makeSuite(TestLiveScoreIntegration))
    suite.addTest(unittest.makeSuite(TestLiveScoreEdgeCases))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Summary
    print("\n" + "=" * 60)
    print("INTEGRATION TEST RESULTS")
    print("=" * 60)

    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    passed = total_tests - failures - errors

    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed}")
    print(f"Failed: {failures}")
    print(f"Errors: {errors}")

    if failures > 0:
        print("\nFAILURES:")
        for test, traceback in result.failures:
            print(f"  ❌ {test}: {traceback.splitlines()[-1]}")

    if errors > 0:
        print("\nERRORS:")
        for test, traceback in result.errors:
            print(f"  💥 {test}: {traceback.splitlines()[-1]}")

    success = failures == 0 and errors == 0

    if success:
        print("\n🎉 ALL INTEGRATION TESTS PASSED!")
        print("✅ Live score system is ready for deployment")
    else:
        print("\n⚠️  Some integration tests failed")
        print("❌ Review failures before deployment")

    return success

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)