#!/usr/bin/env python3
"""
Live Score Scraper for SPMS
Scrapes live scores from voetbaloost.nl/live.html?a=3
Author: Claude Code
Version: 1.0.0
"""

import asyncio
import re
import json
import logging
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from playwright.async_api import async_playwright, Browser, Page
import os

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/live_score_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class LiveScoreConfig:
    """Configuration for live score scraper"""

    # URLs
    LIVE_URL = "https://voetbaloost.nl/live.html?a=3"

    # Timing
    SCRAPE_TIMEOUT_SECONDS = 30
    PAGE_LOAD_TIMEOUT = 15000  # 15 seconds
    COOKIE_WAIT_TIMEOUT = 5000   # 5 seconds

    # Browser settings
    BROWSER_HEADLESS = True
    BROWSER_REUSE = True

    # Team matching
    TARGET_TEAMS_FILE = "teams.config"

    # Output
    OUTPUT_FILE = "live_scores.json"

    # Error handling
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 5

class LiveScoreScraper:
    """Main live score scraper class"""

    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.target_teams = []
        self.playwright_context = None

    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()

    async def initialize(self):
        """Initialize browser and load configuration"""
        try:
            logger.info("Initializing Live Score Scraper...")

            # Load target teams
            self.target_teams = self.load_target_teams()
            logger.info(f"Loaded {len(self.target_teams)} target teams")

            # Initialize Playwright
            self.playwright_context = await async_playwright().start()

            # Launch browser
            self.browser = await self.playwright_context.chromium.launch(
                headless=LiveScoreConfig.BROWSER_HEADLESS,
                args=['--no-sandbox', '--disable-dev-shm-usage']  # Ubuntu compatibility
            )

            # Create new page
            self.page = await self.browser.new_page()

            # Set timeouts
            self.page.set_default_timeout(LiveScoreConfig.PAGE_LOAD_TIMEOUT)

            logger.info("Browser initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize scraper: {e}")
            await self.cleanup()
            raise

    async def cleanup(self):
        """Cleanup browser resources"""
        try:
            if self.page:
                await self.page.close()
                self.page = None

            if self.browser:
                await self.browser.close()
                self.browser = None

            if self.playwright_context:
                await self.playwright_context.stop()
                self.playwright_context = None

            logger.info("Browser cleanup completed")

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def load_target_teams(self) -> List[str]:
        """Load target teams from configuration file"""
        teams = []

        try:
            if os.path.exists(LiveScoreConfig.TARGET_TEAMS_FILE):
                with open(LiveScoreConfig.TARGET_TEAMS_FILE, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        # Skip empty lines and comments
                        if line and not line.startswith('#'):
                            teams.append(line)
            else:
                logger.warning(f"Teams config file not found: {LiveScoreConfig.TARGET_TEAMS_FILE}")
                # Default teams for testing
                teams = [
                    "AVV Columbia", "Apeldoorn CSV", "Apeldoornse Boys",
                    "Robur et Velocitas", "Victoria Boys", "Albatross",
                    "TKA", "WSV", "Loenermark"
                ]

        except Exception as e:
            logger.error(f"Error loading target teams: {e}")
            teams = ["AVV Columbia"]  # Minimal fallback

        return teams

    async def navigate_to_live_page(self) -> bool:
        """Navigate to the live scores page"""
        try:
            logger.info(f"Navigating to {LiveScoreConfig.LIVE_URL}")

            # Navigate to live page
            await self.page.goto(
                LiveScoreConfig.LIVE_URL,
                wait_until="networkidle",
                timeout=LiveScoreConfig.PAGE_LOAD_TIMEOUT
            )

            # Wait for page to stabilize
            await self.page.wait_for_timeout(2000)

            logger.info("Successfully navigated to live page")
            return True

        except Exception as e:
            logger.error(f"Failed to navigate to live page: {e}")
            return False

    async def handle_cookie_consent(self) -> bool:
        """Handle cookie consent dialog"""
        try:
            logger.info("Checking for cookie consent dialog...")

            # List of possible cookie consent selectors
            cookie_selectors = [
                "text=Akkoord, ik ben 24+",
                "text=Akkoord",
                ".cmpboxbtnyes",
                ".cookie-accept",
                "[data-testid='cookie-accept']",
                "button:has-text('Akkoord')",
                "button:has-text('Accept')"
            ]

            for selector in cookie_selectors:
                try:
                    element = self.page.locator(selector)
                    if await element.is_visible(timeout=LiveScoreConfig.COOKIE_WAIT_TIMEOUT):
                        await element.click()
                        await self.page.wait_for_timeout(2000)  # Wait for dialog to close
                        logger.info(f"Clicked cookie consent: {selector}")
                        return True
                except:
                    continue  # Try next selector

            logger.info("No cookie consent dialog found or already handled")
            return True

        except Exception as e:
            logger.warning(f"Cookie consent handling failed: {e}")
            return True  # Continue anyway

    def normalize_team_name(self, team_name: str) -> str:
        """Normalize team name for consistent matching"""
        if not team_name:
            return ""

        # Basic cleaning
        normalized = team_name.strip()

        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized)

        # Handle specific known variations first (exact matches)
        variations = {
            'V.Boys': 'Victoria Boys',
            'V. Boys': 'Victoria Boys',
            'CSV Apeldoorn': 'Apeldoorn CSV',
            'Columbia AVV': 'AVV Columbia',
            'Boys Apeldoornse': 'Apeldoornse Boys',
            'Robur et Velocitas': 'Robur et Velocitas',  # Keep as is
            'ZVV \'56': 'ZVV 56',
            'ZVV 56': 'ZVV 56'
        }

        for variation, canonical in variations.items():
            if normalized.lower() == variation.lower():
                normalized = canonical
                break

        # Handle common abbreviations (only if not already handled above)
        if normalized not in variations.values():
            # Remove standalone abbreviations that don't add meaning
            abbreviations_to_remove = ['FC', 'SV', 'VV', 'RKSV']

            for abbrev in abbreviations_to_remove:
                # Remove abbreviation if it's at the end
                if normalized.endswith(f' {abbrev}'):
                    normalized = normalized[:-len(f' {abbrev}')]
                # Remove abbreviation if it's at the start
                elif normalized.startswith(f'{abbrev} '):
                    normalized = normalized[len(f'{abbrev} '):]

            # Keep SP for distinction (Brummen SP, Eefde SP)
            # Don't remove SP as it's meaningful

        return normalized.strip()

    def extract_score_and_minute(self, score_text: str) -> Tuple[int, int, str]:
        """
        Extract home goals, away goals, and minute from score text

        Examples:
        "2 - 1 (67')" -> (2, 1, "67'")
        "0-0 HT" -> (0, 0, "HT")
        "3-2 FT" -> (3, 2, "FT")
        "1 - 0 (45+2')" -> (1, 0, "45+2'")
        """
        if not score_text:
            return (0, 0, "")

        try:
            # Clean the score text
            clean_score = score_text.strip()

            # Pattern for score with minute: "2 - 1 (67')" or "2-1 (67')"
            score_minute_pattern = r'(\d+)\s*-\s*(\d+)\s*\(([^)]+)\)'
            match = re.search(score_minute_pattern, clean_score)

            if match:
                home_goals = int(match.group(1))
                away_goals = int(match.group(2))
                minute = match.group(3)
                return (home_goals, away_goals, minute)

            # Pattern for score with status: "2-1 HT" or "3-2 FT"
            score_status_pattern = r'(\d+)\s*-\s*(\d+)\s+(HT|FT|LIVE)'
            match = re.search(score_status_pattern, clean_score, re.IGNORECASE)

            if match:
                home_goals = int(match.group(1))
                away_goals = int(match.group(2))
                status = match.group(3).upper()
                return (home_goals, away_goals, status)

            # Simple score pattern: "2-1" or "2 - 1"
            simple_score_pattern = r'(\d+)\s*-\s*(\d+)'
            match = re.search(simple_score_pattern, clean_score)

            if match:
                home_goals = int(match.group(1))
                away_goals = int(match.group(2))
                return (home_goals, away_goals, "LIVE")  # Assume live if no minute

        except Exception as e:
            logger.warning(f"Failed to parse score '{score_text}': {e}")

        return (0, 0, "")

    async def extract_live_matches(self) -> List[Dict]:
        """Extract live match data from the page"""
        try:
            logger.info("Extracting live matches from page...")

            # Get both inner text and HTML structure for better parsing
            content = await self.page.evaluate("document.body.innerText")
            html_content = await self.page.content()

            if not content:
                logger.warning("No content found on page")
                return []

            # Debug: Save content to file for analysis
            with open('debug_live_page_content.txt', 'w', encoding='utf-8') as f:
                f.write("=== INNER TEXT ===\n")
                f.write(content)
                f.write("\n\n=== HTML CONTENT ===\n")
                f.write(html_content)

            # Split into lines for processing
            lines = [line.strip() for line in content.split('\n') if line.strip()]

            matches = []

            # Enhanced patterns for live matches
            score_patterns = [
                r'\d+\s*-\s*\d+\s*\([0-9+\']+\)',    # "2-1 (67')" - Live with minute
                r'\d+\s*-\s*\d+\s+(?:HT|FT)',       # "2-1 HT" - Half/Full time
                r'\d+\s*-\s*\d+\s+(?:LIVE|Live)',   # "2-1 LIVE" - Explicit live
                r'\d+\s*-\s*\d+\s*$'                # Simple "2-1" at end of line
            ]

            time_patterns = [
                r'\b([01]?\d|2[0-3]):[0-5]\d\b',    # Time format "15:00"
                r'\b\d{1,2}:\d{2}\b'                # Simple time format
            ]

            # Look for patterns that indicate live matches
            for i, line in enumerate(lines):
                if not line:
                    continue

                # Check if line contains a score
                has_score = any(re.search(pattern, line, re.IGNORECASE) for pattern in score_patterns)

                if has_score:
                    logger.debug(f"Found potential match line: {line}")

                    # This line might contain a live match
                    match_data = self.parse_match_line(line, lines, i)
                    if match_data:
                        matches.append(match_data)
                        logger.debug(f"Parsed match: {match_data}")

            # Also look for team names in context with surrounding lines
            self.extract_matches_by_context(lines, matches)

            # Filter for target teams only
            target_matches = []
            for match in matches:
                if self.is_target_team_match(match):
                    target_matches.append(match)
                    logger.info(f"Found target team match: {match['home']} vs {match['away']} ({match['homeGoals']}-{match['awayGoals']})")

            logger.info(f"Extracted {len(target_matches)} target team matches from {len(matches)} total matches")

            # If no matches found, log some sample content for debugging
            if len(matches) == 0:
                logger.info("No matches found. Sample content lines:")
                for i, line in enumerate(lines[:10]):
                    logger.info(f"  {i}: {line}")

            return target_matches

        except Exception as e:
            logger.error(f"Failed to extract live matches: {e}")
            return []

    def extract_matches_by_context(self, lines: List[str], existing_matches: List[Dict]):
        """Extract matches by looking for team names in context with scores"""
        try:
            # Look for our target teams in the content
            for i, line in enumerate(lines):
                for target_team in self.target_teams:
                    if target_team.lower() in line.lower():
                        logger.debug(f"Found target team '{target_team}' in line {i}: {line}")

                        # Look in surrounding lines for score information
                        context_lines = lines[max(0, i-3):min(len(lines), i+4)]

                        for j, context_line in enumerate(context_lines):
                            if re.search(r'\d+\s*-\s*\d+', context_line):
                                logger.debug(f"Found score in context: {context_line}")
                                # Try to parse this as a match
                                match_data = self.parse_context_match(line, context_line, target_team)
                                if match_data and not self.is_duplicate_match(match_data, existing_matches):
                                    existing_matches.append(match_data)
                                    logger.debug(f"Added context match: {match_data}")

        except Exception as e:
            logger.warning(f"Error in context extraction: {e}")

    def is_duplicate_match(self, new_match: Dict, existing_matches: List[Dict]) -> bool:
        """Check if match already exists in the list"""
        for existing in existing_matches:
            if (existing.get('home', '').lower() == new_match.get('home', '').lower() and
                existing.get('away', '').lower() == new_match.get('away', '').lower()):
                return True
        return False

    def parse_context_match(self, team_line: str, score_line: str, target_team: str) -> Optional[Dict]:
        """Parse a match from team line and separate score line"""
        try:
            # Extract score from score line
            score_match = re.search(r'(\d+)\s*-\s*(\d+)', score_line)
            if not score_match:
                return None

            home_goals = int(score_match.group(1))
            away_goals = int(score_match.group(2))

            # Try to determine minute/status
            minute_match = re.search(r'\(([^)]+)\)', score_line)
            minute = minute_match.group(1) if minute_match else "LIVE"

            # Try to extract team names from team line
            # This is simplified - in real implementation would need more sophisticated parsing
            teams = re.split(r'\s+vs\s+|\s+-\s+|\s+tegen\s+', team_line, flags=re.IGNORECASE)

            if len(teams) >= 2:
                home_team = self.normalize_team_name(teams[0].strip())
                away_team = self.normalize_team_name(teams[1].strip())
            else:
                # Fallback: use target team as one team, try to find the other
                if target_team.lower() in team_line.lower():
                    # Simple heuristic - split and find non-target team
                    parts = re.split(r'\s+', team_line)
                    other_parts = [p for p in parts if target_team.lower() not in p.lower() and len(p) > 2]

                    if other_parts:
                        home_team = target_team
                        away_team = self.normalize_team_name(' '.join(other_parts))
                    else:
                        return None
                else:
                    return None

            return {
                "home": home_team,
                "away": away_team,
                "homeGoals": home_goals,
                "awayGoals": away_goals,
                "minute": minute,
                "status": "Live" if minute and minute not in ["HT", "FT"] else minute,
                "lastUpdate": datetime.now().isoformat(),
                "source": "voetbaloost_live_context"
            }

        except Exception as e:
            logger.warning(f"Failed to parse context match: {e}")
            return None

    def parse_match_line(self, line: str, all_lines: List[str], line_index: int) -> Optional[Dict]:
        """Parse a single line that contains match information"""
        try:
            # Look for team names and scores in the line
            # This is a simplified parser - will be enhanced based on actual HTML structure

            # Common patterns for match lines:
            # "Team A    Team B    2-1 (67')"
            # "Team A - Team B 2-1 HT"

            # Split by common separators and look for team names
            parts = re.split(r'\t+|\s{2,}', line)

            if len(parts) < 3:
                return None

            # Try to identify teams and score
            teams = []
            score_part = None

            for part in parts:
                part = part.strip()
                if not part:
                    continue

                # Check if this part contains a score
                if re.search(r'\d+\s*-\s*\d+', part):
                    score_part = part
                else:
                    # Potential team name
                    if len(part) > 2 and not part.isdigit():
                        teams.append(part)

            if len(teams) >= 2 and score_part:
                home_team = self.normalize_team_name(teams[0])
                away_team = self.normalize_team_name(teams[1])

                home_goals, away_goals, minute = self.extract_score_and_minute(score_part)

                return {
                    "home": home_team,
                    "away": away_team,
                    "homeGoals": home_goals,
                    "awayGoals": away_goals,
                    "minute": minute,
                    "status": "Live" if minute and minute not in ["HT", "FT"] else minute,
                    "lastUpdate": datetime.now().isoformat(),
                    "source": "voetbaloost_live"
                }

        except Exception as e:
            logger.warning(f"Failed to parse match line '{line}': {e}")

        return None

    def is_target_team_match(self, match: Dict) -> bool:
        """Check if match involves any of our target teams"""
        home_team = match.get('home', '').lower()
        away_team = match.get('away', '').lower()

        for target_team in self.target_teams:
            target_lower = target_team.lower()

            # Check for exact matches or substrings
            if (target_lower in home_team or
                target_lower in away_team or
                home_team in target_lower or
                away_team in target_lower):
                return True

        return False

    async def get_live_scores(self, target_date: Optional[str] = None) -> List[Dict]:
        """
        Main function to get live scores

        Args:
            target_date: Date string in YYYY-MM-DD format, defaults to today

        Returns:
            List of live match dictionaries
        """
        try:
            logger.info("Starting live score extraction...")

            # Navigate to live page
            if not await self.navigate_to_live_page():
                return []

            # Handle cookie consent
            await self.handle_cookie_consent()

            # Extract live matches
            matches = await self.extract_live_matches()

            # Filter by date if specified
            if target_date:
                matches = [m for m in matches if target_date in m.get('lastUpdate', '')]

            logger.info(f"Successfully extracted {len(matches)} live matches")
            return matches

        except Exception as e:
            logger.error(f"Error getting live scores: {e}")
            return []

# Standalone functions for CLI usage
async def scrape_live_scores(target_date: Optional[str] = None, save_to_file: bool = True) -> List[Dict]:
    """Scrape live scores and optionally save to file"""

    async with LiveScoreScraper() as scraper:
        matches = await scraper.get_live_scores(target_date)

        if save_to_file and matches:
            # Save to JSON file
            output_data = {
                "lastUpdate": datetime.now().isoformat(),
                "matchCount": len(matches),
                "matches": matches
            }

            with open(LiveScoreConfig.OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)

            logger.info(f"Saved {len(matches)} matches to {LiveScoreConfig.OUTPUT_FILE}")

        return matches

# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Live Score Scraper for SPMS")
    parser.add_argument("--date", help="Target date (YYYY-MM-DD), defaults to today")
    parser.add_argument("--no-save", action="store_true", help="Don't save to file")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")
    parser.add_argument("--test", action="store_true", help="Test mode (dry run)")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)

    async def main():
        if args.test:
            logger.info("Running in test mode...")
            async with LiveScoreScraper() as scraper:
                success = await scraper.navigate_to_live_page()
                if success:
                    await scraper.handle_cookie_consent()
                    logger.info("Test completed successfully")
                else:
                    logger.error("Test failed")
        else:
            matches = await scrape_live_scores(
                target_date=args.date,
                save_to_file=not args.no_save
            )

            if matches:
                print(f"\nFound {len(matches)} live matches:")
                for match in matches:
                    print(f"  {match['home']} vs {match['away']}: {match['homeGoals']}-{match['awayGoals']} ({match['minute']})")
            else:
                print("No live matches found for target teams")

    asyncio.run(main())