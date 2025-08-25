# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a simplified Sports League Management System (SPMS) built with Flask. The system displays league data in a carousel dashboard format. It integrates with real-time data from the hollandsevelden.nl API and automatically fetches data daily and on Saturday afternoons (16:00-19:00) every 30 minutes.

**Key Features:**
- Carousel dashboard with 6 screens
- Main league standings
- Period standings (where matches have been played)
- Last week results and next week matches
- Columbia team specific matches (played and upcoming)
- Team vs team matrix showing results/dates

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies (choose one method)
pip install -r requirements.txt
# OR using Poetry
poetry install
```

### Running the Application
```bash
# Development server (starts scheduler automatically)
python app.py

# Production server
gunicorn app:app

# Install new dependency for scheduling
pip install schedule==1.2.0
```

### Code Quality
```bash
# Linting with ruff
ruff check .

# Type checking with pyright
pyright

# Format code with ruff
ruff format .
```

### Database Operations
```bash
# Initialize database with schema
psql -d your_database < schema.sql

# Connect to PostgreSQL (requires DATABASE_URL in .env)
psql $DATABASE_URL
```

## Architecture Overview

### Core Application Structure
- **`app.py`** - Main Flask application with dashboard route and API endpoints
- **`config.py`** - Configuration management using environment variables
- **`scheduler.py`** - Background data fetching scheduler
- **`hollandsevelden.py`** - External API integration and data processing

### API Endpoints
- **`/`** - Main dashboard with carousel
- **`/api/data`** - Get all cached dashboard data
- **`/api/standings`** - Get main league table
- **`/api/period-standings`** - Get period standings with played matches
- **`/api/last-week-results`** - Get results from last 7 days
- **`/api/next-week-matches`** - Get matches for next 7 days
- **`/api/columbia-matches`** - Get all Columbia team matches
- **`/api/team-matrix`** - Get team vs team results/schedule matrix

### Data Integration & Scheduling
- **`hollandsevelden.py`** - External API integration for Dutch league data
  - API endpoint: https://api.hollandsevelden.nl/competities/2025-2026/oost/za/3n/
  - Fetches league tables, periods, results, and programs
  - Contains data processing functions for all dashboard views
- **`scheduler.py`** - Automated data fetching
  - Runs daily at 10:00 AM
  - Saturday updates every 30 minutes from 16:00-19:00
  - Caches data in `league_data.json`
  - Background thread with schedule library

## Environment Configuration
Required environment variables in `.env`:
```
SECRET_KEY=your_secret_key
```

Note: Database and authentication features have been removed in this simplified version.

## Frontend Structure
- **Templates**: Single dashboard template (`templates/dashboard.html`)
- **UI Framework**: Bootstrap 5 with carousel component
- **JavaScript**: Vanilla JS with fetch API for loading data
- **Responsive Design**: Auto-refreshing carousel with 6 screens

## Dashboard Screens
1. **Main Standings** - Current league table
2. **Period Standings** - Period tables with played matches only
3. **Last Week Results** - Match results from past 7 days
4. **Next Week Matches** - Upcoming matches in next 7 days
5. **Columbia Matches** - All Columbia team matches (played and upcoming)
6. **Team Matrix** - Grid showing all teams vs teams with results/dates

## Data Files
- **`league_data.json`** - Cached API data (auto-generated)
- **`requirements.txt`** - Updated with `schedule==1.2.0` dependency

## Development Notes
- Simplified from full sports management system to dashboard-only
- No database or authentication required
- Real-time data integration with automated scheduling
- Carousel auto-advances every 10 seconds
- Data refreshes every 30 minutes in browser
- Error handling for API failures with cached fallbacks

## Testing
To test the application:
1. Run `python app.py`
2. Visit `http://localhost:5000`
3. Verify carousel displays 6 screens
4. Check API endpoints at `/api/*` routes
5. Verify data updates according to schedule
- git gebruik voor feature-wise development. elke feature moet gepushed worden. help me herinneren en geef voorbeelden hoe het kan
- accoord voor commit moet je altijd vragen nadat ik heb kunnen testen.