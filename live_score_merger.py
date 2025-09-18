#!/usr/bin/env python3
"""
Live Score Data Merger for SPMS
Merges live scores into existing match data while preserving data integrity
Author: Claude Code
Version: 1.0.0
"""

import json
import os
import shutil
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher
import re

from live_score_config import Config

# Configure logging
logger = logging.getLogger(__name__)

class LiveScoreMerger:
    """Main class for merging live scores into existing match data"""

    def __init__(self):
        self.config = Config
        self.backup_files = []

    def load_existing_matches(self, file_path: str) -> List[Dict]:
        """Load current match data with error handling"""
        try:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                return []

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Handle different file structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # For league_data.json structure
                if 'featured_team_matches' in data and 'upcoming' in data['featured_team_matches']:
                    return data['featured_team_matches']['upcoming']
                elif 'matches' in data:
                    return data['matches']
                else:
                    logger.warning(f"Unknown file structure in {file_path}")
                    return []
            else:
                logger.error(f"Invalid JSON structure in {file_path}")
                return []

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in {file_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return []

    def calculate_team_match_score(self, name1: str, name2: str) -> float:
        """
        Calculate match confidence between two team names (0.0-1.0)

        Factors:
        - Exact match: 1.0
        - Case insensitive: 0.95
        - Normalized (no spaces/punctuation): 0.9
        - Substring match: 0.8
        - Fuzzy similarity: 0.6-0.9
        - Known aliases: 1.0
        """
        if not name1 or not name2:
            return 0.0

        # Normalize names for comparison
        norm1 = self.normalize_name_for_matching(name1)
        norm2 = self.normalize_name_for_matching(name2)

        # Exact match
        if name1 == name2:
            return 1.0

        # Case insensitive exact match
        if name1.lower() == name2.lower():
            return 0.95

        # Normalized match (no spaces, punctuation)
        if norm1 == norm2:
            return 0.9

        # Check known aliases
        aliases1 = self.config.get_team_aliases(name1)
        aliases2 = self.config.get_team_aliases(name2)

        for alias1 in aliases1:
            for alias2 in aliases2:
                if alias1.lower() == alias2.lower():
                    return 1.0

        # Substring match
        if norm1 in norm2 or norm2 in norm1:
            return 0.8

        # Fuzzy similarity using SequenceMatcher
        similarity = SequenceMatcher(None, norm1.lower(), norm2.lower()).ratio()

        # Only consider it a match if similarity is above threshold
        if similarity >= self.config.FUZZY_MATCH_THRESHOLD:
            return max(0.6, similarity)

        return 0.0

    def normalize_name_for_matching(self, name: str) -> str:
        """Normalize team name for matching purposes"""
        if not name:
            return ""

        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', name.strip())

        # Remove common prefixes/suffixes for matching
        prefixes_suffixes = ['FC', 'SV', 'VV', 'RKSV', 'AVV', 'CSV']

        for prefix in prefixes_suffixes:
            # Remove from start
            if normalized.startswith(f"{prefix} "):
                normalized = normalized[len(f"{prefix} "):]
            # Remove from end
            if normalized.endswith(f" {prefix}"):
                normalized = normalized[:-len(f" {prefix}")]

        # Remove punctuation for matching
        normalized = re.sub(r'[^\w\s]', '', normalized)

        return normalized.strip()

    def find_matching_existing_match(self, live_match: Dict, existing_matches: List[Dict]) -> Optional[Tuple[Dict, float]]:
        """
        Find the best matching existing match for a live score

        Returns:
            Tuple of (match, confidence_score) or None if no good match found
        """
        live_home = live_match.get('home', '')
        live_away = live_match.get('away', '')

        best_match = None
        best_score = 0.0

        for existing_match in existing_matches:
            existing_home = existing_match.get('home', '')
            existing_away = existing_match.get('away', '')

            # Calculate match scores for both team combinations
            # Option 1: live_home matches existing_home, live_away matches existing_away
            score1_home = self.calculate_team_match_score(live_home, existing_home)
            score1_away = self.calculate_team_match_score(live_away, existing_away)
            option1_score = min(score1_home, score1_away)  # Both teams must match well

            # Option 2: teams are swapped (home/away reversed)
            score2_home = self.calculate_team_match_score(live_home, existing_away)
            score2_away = self.calculate_team_match_score(live_away, existing_home)
            option2_score = min(score2_home, score2_away)

            # Take the better of the two options
            match_score = max(option1_score, option2_score)

            # Only consider matches above the threshold
            if match_score >= self.config.FUZZY_MATCH_THRESHOLD and match_score > best_score:
                best_match = existing_match
                best_score = match_score

                logger.debug(f"Match found: {live_home} vs {live_away} → {existing_home} vs {existing_away} (score: {match_score:.2f})")

        if best_match:
            return (best_match, best_score)
        else:
            logger.info(f"No match found for: {live_home} vs {live_away}")
            return None

    def merge_match_data(self, existing_match: Dict, live_score: Dict, confidence: float) -> Dict:
        """
        Merge live score data into existing match data

        Preserves all original data and adds/updates live fields
        """
        # Create a copy to avoid modifying original
        merged_match = existing_match.copy()

        # Update score data
        merged_match['homeGoals'] = live_score.get('homeGoals', 0)
        merged_match['awayGoals'] = live_score.get('awayGoals', 0)

        # Update status
        live_status = live_score.get('status', 'Live')
        if live_status.lower() in ['ft', 'fulltime']:
            merged_match['status'] = 'Afgelopen'
            merged_match['result'] = f"{merged_match['homeGoals']}-{merged_match['awayGoals']}"
        elif live_status.lower() in ['ht', 'halftime']:
            merged_match['status'] = 'Rust'
        else:
            merged_match['status'] = 'Live'

        # Add live-specific fields
        merged_match['minute'] = live_score.get('minute', '')
        merged_match['isLive'] = True
        merged_match['lastUpdate'] = live_score.get('lastUpdate', datetime.now().isoformat())
        merged_match['liveSource'] = live_score.get('source', 'voetbaloost_live')
        merged_match['matchConfidence'] = confidence

        # Update result field
        if merged_match['homeGoals'] > 0 or merged_match['awayGoals'] > 0:
            merged_match['result'] = f"{merged_match['homeGoals']}-{merged_match['awayGoals']}"

        logger.info(f"Merged live data: {merged_match['home']} vs {merged_match['away']} → {merged_match['result']} ({merged_match.get('minute', '')})")

        return merged_match

    def create_backup(self, file_path: str) -> str:
        """Create timestamped backup before making changes"""
        try:
            if not os.path.exists(file_path):
                logger.warning(f"Cannot backup non-existent file: {file_path}")
                return ""

            backup_path = self.config.get_backup_file_path(file_path)

            # Ensure backup directory exists
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)

            # Copy file to backup location
            shutil.copy2(file_path, backup_path)

            # Track for potential rollback
            self.backup_files.append((file_path, backup_path))

            logger.info(f"Created backup: {file_path} → {backup_path}")
            return backup_path

        except Exception as e:
            logger.error(f"Failed to create backup for {file_path}: {e}")
            return ""

    def validate_merged_data(self, merged_data: List[Dict]) -> bool:
        """Validate data integrity after merge"""
        try:
            rules = self.config.VALIDATION_RULES

            for match in merged_data:
                # Check required fields
                for field in rules['required_fields']:
                    if field not in match:
                        logger.error(f"Missing required field '{field}' in match: {match}")
                        return False

                # Sanity check for scores
                home_goals = match.get('homeGoals', 0)
                away_goals = match.get('awayGoals', 0)

                if home_goals > rules['max_goals_per_team'] or away_goals > rules['max_goals_per_team']:
                    logger.error(f"Unrealistic score: {home_goals}-{away_goals} in match {match}")
                    return False

                # Check minute field if present
                minute = match.get('minute', '')
                if minute and minute not in ['HT', 'FT']:
                    # Try to extract numeric minute
                    minute_match = re.search(r'(\d+)', minute)
                    if minute_match:
                        minute_num = int(minute_match.group(1))
                        if minute_num > rules['max_minute']:
                            logger.error(f"Invalid minute: {minute} in match {match}")
                            return False

            logger.info(f"Validation passed for {len(merged_data)} matches")
            return True

        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return False

    def save_merged_data(self, file_path: str, merged_data: List[Dict], original_structure: Dict = None) -> bool:
        """Save merged data back to file, preserving original structure"""
        try:
            # Determine how to save based on original file structure
            if original_structure is None:
                # Simple list structure (e.g., komende_wedstrijden.json)
                output_data = merged_data
            else:
                # Complex structure (e.g., league_data.json)
                output_data = original_structure.copy()

                # Update the relevant section
                if 'featured_team_matches' in output_data and 'upcoming' in output_data['featured_team_matches']:
                    output_data['featured_team_matches']['upcoming'] = merged_data
                elif 'matches' in output_data:
                    output_data['matches'] = merged_data
                else:
                    # Fallback: replace entire structure
                    output_data = merged_data

            # Add metadata
            if isinstance(output_data, dict):
                output_data['lastLiveUpdate'] = datetime.now().isoformat()
                output_data['liveUpdatesActive'] = True

            # Write to file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)

            logger.info(f"Successfully saved merged data to {file_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to save merged data to {file_path}: {e}")
            return False

    def rollback_changes(self) -> bool:
        """Rollback all changes using backups"""
        try:
            rollback_count = 0

            for original_path, backup_path in self.backup_files:
                if os.path.exists(backup_path):
                    shutil.copy2(backup_path, original_path)
                    rollback_count += 1
                    logger.info(f"Rolled back: {original_path}")

            self.backup_files.clear()
            logger.info(f"Rollback completed: {rollback_count} files restored")
            return True

        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False

    def merge_live_scores_to_file(self, file_path: str, live_scores: List[Dict]) -> bool:
        """
        Main function to merge live scores into a specific file

        Returns:
            bool: True if merge was successful, False otherwise
        """
        try:
            logger.info(f"Starting merge for {file_path} with {len(live_scores)} live scores")

            # Create backup first
            backup_path = self.create_backup(file_path)
            if not backup_path:
                logger.error(f"Failed to create backup for {file_path}")
                return False

            # Load existing data
            existing_data = self.load_existing_matches(file_path)
            if not existing_data:
                logger.warning(f"No existing data found in {file_path}")
                return False

            # Store original structure for complex files
            original_structure = None
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    original_structure = json.load(f)

            # Process each live score
            updated_matches = []
            merge_count = 0

            for existing_match in existing_data:
                match_updated = False

                # Try to find a live score for this match
                for live_score in live_scores:
                    match_result = self.find_matching_existing_match(live_score, [existing_match])

                    if match_result:
                        matched_existing, confidence = match_result

                        # Merge the live data
                        merged_match = self.merge_match_data(existing_match, live_score, confidence)
                        updated_matches.append(merged_match)
                        match_updated = True
                        merge_count += 1
                        break

                # If no live score found, keep original match
                if not match_updated:
                    updated_matches.append(existing_match)

            # Validate merged data
            if not self.validate_merged_data(updated_matches):
                logger.error("Validation failed, rolling back changes")
                self.rollback_changes()
                return False

            # Save merged data
            if not self.save_merged_data(file_path, updated_matches, original_structure):
                logger.error("Save failed, rolling back changes")
                self.rollback_changes()
                return False

            logger.info(f"Successfully merged {merge_count} live scores into {file_path}")
            return True

        except Exception as e:
            logger.error(f"Merge failed for {file_path}: {e}")
            self.rollback_changes()
            return False

def merge_live_scores(live_scores: List[Dict], target_files: List[str] = None) -> Dict[str, bool]:
    """
    Merge live scores into all configured target files

    Args:
        live_scores: List of live score dictionaries
        target_files: Optional list of specific files to update

    Returns:
        Dict mapping file names to success status
    """
    if not live_scores:
        logger.info("No live scores to merge")
        return {}

    # Use configured files if none specified
    if target_files is None:
        target_files = [file for file, config in Config.MERGE_TARGET_FILES.items()
                       if config.get('enabled', True)]

    merger = LiveScoreMerger()
    results = {}

    for file_path in target_files:
        logger.info(f"Processing file: {file_path}")

        if not os.path.exists(file_path):
            logger.warning(f"Target file not found: {file_path}")
            results[file_path] = False
            continue

        success = merger.merge_live_scores_to_file(file_path, live_scores)
        results[file_path] = success

        if success:
            logger.info(f"✅ Successfully updated {file_path}")
        else:
            logger.error(f"❌ Failed to update {file_path}")

    return results

# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Live Score Data Merger for SPMS")
    parser.add_argument("--live-scores", required=True, help="Path to live scores JSON file")
    parser.add_argument("--target-files", nargs="+", help="Specific files to update")
    parser.add_argument("--dry-run", action="store_true", help="Validate without making changes")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Load live scores
    try:
        with open(args.live_scores, 'r', encoding='utf-8') as f:
            live_data = json.load(f)

        if isinstance(live_data, dict) and 'matches' in live_data:
            live_scores = live_data['matches']
        else:
            live_scores = live_data

        logger.info(f"Loaded {len(live_scores)} live scores from {args.live_scores}")

    except Exception as e:
        logger.error(f"Failed to load live scores: {e}")
        exit(1)

    if args.dry_run:
        logger.info("DRY RUN: Validating live scores without making changes")

        merger = LiveScoreMerger()
        valid = merger.validate_merged_data(live_scores)

        if valid:
            print("✅ Live scores are valid")
        else:
            print("❌ Live scores validation failed")

        exit(0 if valid else 1)
    else:
        # Perform actual merge
        results = merge_live_scores(live_scores, args.target_files)

        success_count = sum(1 for success in results.values() if success)
        total_count = len(results)

        print(f"\nMerge Results: {success_count}/{total_count} files updated successfully")

        for file_path, success in results.items():
            status = "✅" if success else "❌"
            print(f"  {status} {file_path}")

        exit(0 if success_count == total_count else 1)