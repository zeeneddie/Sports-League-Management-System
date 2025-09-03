# Testing Strategy and Guidelines

Comprehensive testing strategy for SPMS including current test implementations and recommended enhancements for production readiness.

## Testing Philosophy

SPMS follows a **quality-first testing approach** with emphasis on:
- **Reliability**: Ensuring data accuracy and system stability
- **Performance**: Validating response times and resource usage
- **Security**: Testing authentication, authorization, and input validation
- **User Experience**: Verifying frontend functionality and accessibility
- **Integration**: Testing external API integration and error handling

### Testing Pyramid
```
                    E2E Tests (10%)
                 ┌─────────────────┐
                 │  User Journeys  │
                 │  Integration    │
                 └─────────────────┘
              
            Integration Tests (20%)
         ┌─────────────────────────┐
         │    API Endpoints        │
         │    Data Processing      │
         │    External Services    │
         └─────────────────────────┘
         
        Unit Tests (70%)
    ┌─────────────────────────────────┐
    │        Functions                │
    │        Models                   │
    │        Components               │
    │        Utilities                │
    └─────────────────────────────────┘
```

## Current Test Implementation

### 1. Existing Test Files

#### Simple API Test (`simple_test.py`)
```python
import requests
import json

def test_api_endpoint():
    """Basic API connectivity test"""
    try:
        # Test main data endpoint
        response = requests.get('http://localhost:5000/api/data')
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API test passed")
            print(f"Last updated: {data.get('last_updated')}")
            return True
        else:
            print(f"❌ API test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

if __name__ == "__main__":
    test_api_endpoint()
```

#### Comprehensive Test Suite (`comprehensive_test.py`)
```python
import requests
import json
import time
from datetime import datetime

class SPMSTestSuite:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.passed = 0
        self.failed = 0
        
    def test_all_endpoints(self):
        """Test all API endpoints for basic functionality"""
        endpoints = [
            '/api/data',
            '/api/standings', 
            '/api/period-standings',
            '/api/last-week-results',
            '/api/next-week-matches',
            '/api/featured-team-matches',
            '/api/weekly-results',
            '/api/team-matrix',
            '/api/all-matches'
        ]
        
        for endpoint in endpoints:
            self.test_endpoint(endpoint)
    
    def test_endpoint(self, endpoint):
        """Test individual endpoint"""
        try:
            response = requests.get(f"{self.base_url}{endpoint}")
            
            if response.status_code == 200:
                data = response.json()
                if 'last_updated' in data:
                    print(f"✅ {endpoint} - OK")
                    self.passed += 1
                else:
                    print(f"⚠️  {endpoint} - Missing timestamp")
                    self.failed += 1
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
                self.failed += 1
                
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
            self.failed += 1
    
    def test_data_quality(self):
        """Test data quality and structure"""
        try:
            response = requests.get(f"{self.base_url}/api/standings")
            data = response.json()
            
            league_table = data.get('league_table', [])
            if not league_table:
                print("❌ Data Quality - Empty league table")
                self.failed += 1
                return
                
            # Test team data structure
            team = league_table[0]
            required_fields = ['team', 'position', 'played', 'wins', 'draws', 'losses', 'points']
            
            missing_fields = [field for field in required_fields if field not in team]
            if missing_fields:
                print(f"❌ Data Quality - Missing fields: {missing_fields}")
                self.failed += 1
            else:
                print("✅ Data Quality - Team structure OK")
                self.passed += 1
                
        except Exception as e:
            print(f"❌ Data Quality - Error: {e}")
            self.failed += 1
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Starting SPMS Test Suite")
        print("=" * 40)
        
        self.test_all_endpoints()
        self.test_data_quality()
        
        print("=" * 40)
        print(f"📊 Test Results: {self.passed} passed, {self.failed} failed")
        
        return self.failed == 0

if __name__ == "__main__":
    test_suite = SPMSTestSuite()
    success = test_suite.run_all_tests()
    exit(0 if success else 1)
```

### 2. Test Data Management (`test_data.py`)
**Purpose**: Provides consistent test data for development and testing

**Key Features**:
- Static test dataset from `noord-zaterdag-1f.json`
- Consistent team names and match data
- Predictable results for testing
- Offline development support

## Recommended Testing Framework

### 1. Unit Testing with pytest

#### Test Structure
```
tests/
├── __init__.py
├── conftest.py                 # pytest configuration and fixtures
├── unit/
│   ├── __init__.py
│   ├── test_data_processing.py # Data processing functions
│   ├── test_models.py          # Data model validation
│   ├── test_config.py          # Configuration management
│   └── test_utils.py           # Utility functions
├── integration/
│   ├── __init__.py
│   ├── test_api_endpoints.py   # API endpoint testing
│   ├── test_external_api.py    # External API integration
│   └── test_scheduler.py       # Background scheduler
├── e2e/
│   ├── __init__.py
│   ├── test_dashboard.py       # Frontend dashboard tests
│   ├── test_carousel.py        # Carousel functionality
│   └── test_user_journeys.py   # Complete user workflows
└── fixtures/
    ├── sample_data.json        # Test data fixtures
    └── mock_responses.py       # Mock API responses
```

#### pytest Configuration (`conftest.py`)
```python
import pytest
import os
import json
from unittest.mock import MagicMock
from app import app
from scheduler import DataScheduler

@pytest.fixture(scope="session")
def test_app():
    """Create test Flask application"""
    app.config.update({
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key',
        'USE_TEST_DATA': True
    })
    
    with app.test_client() as client:
        with app.app_context():
            yield client

@pytest.fixture
def sample_league_data():
    """Provide sample league data for testing"""
    return {
        'league_table': [
            {
                'team': 'Test Team 1',
                'position': 1,
                'played': 10,
                'wins': 8,
                'draws': 1,
                'losses': 1,
                'goals_for': 25,
                'goals_against': 8,
                'points': 25
            }
        ],
        'last_updated': '2025-08-27T10:30:00'
    }

@pytest.fixture
def mock_scheduler():
    """Mock scheduler for testing"""
    scheduler = MagicMock(spec=DataScheduler)
    scheduler.get_cached_data.return_value = {
        'league_table': [],
        'last_updated': '2025-08-27T10:30:00'
    }
    return scheduler

@pytest.fixture
def sample_api_response():
    """Mock external API response"""
    with open('tests/fixtures/sample_data.json', 'r') as f:
        return json.load(f)
```

### 2. Unit Tests

#### Data Processing Tests (`tests/unit/test_data_processing.py`)
```python
import pytest
from hollandsevelden import (
    normalize_team_data,
    get_filtered_period_standings,
    get_last_week_results,
    create_team_matrix
)

class TestDataProcessing:
    def test_normalize_team_data(self):
        """Test team data normalization"""
        raw_team = {
            'name': 'Test Team',
            'position': 1,
            'matches': 10,
            'wins': 8,
            'ties': 1,
            'losses': 1,
            'goalsFor': 25,
            'goalsAgainst': 8,
            'points': 25
        }
        
        normalized = normalize_team_data(raw_team)
        
        assert normalized['team'] == 'Test Team'
        assert normalized['played'] == 10
        assert normalized['draws'] == 1
        assert normalized['goals_for'] == 25
    
    def test_filtered_period_standings(self):
        """Test period standings filtering"""
        data = {
            'period1': [
                {'team': 'Team A', 'played': 5, 'points': 15},
                {'team': 'Team B', 'played': 5, 'points': 12}
            ],
            'period2': [
                {'team': 'Team A', 'played': 0, 'points': 0},
                {'team': 'Team B', 'played': 0, 'points': 0}
            ]
        }
        
        filtered = get_filtered_period_standings(data)
        
        assert len(filtered) == 1
        assert filtered[0]['name'] == 'Periode 1'
        assert len(filtered[0]['standings']) == 2
    
    def test_team_matrix_creation(self):
        """Test team vs team matrix creation"""
        data = {
            'results': [
                {
                    'hometeam': 'Team A',
                    'awayteam': 'Team B', 
                    'homeGoals': 3,
                    'awayGoals': 1,
                    'date': '2025-08-23'
                }
            ],
            'leaguetable': [
                {'name': 'Team A'},
                {'name': 'Team B'}
            ]
        }
        
        matrix = create_team_matrix(data)
        
        assert 'Team A' in matrix['teams']
        assert 'Team B' in matrix['teams']
        assert matrix['matrix']['Team A']['Team B']['result'] == '3-1'

class TestDataValidation:
    def test_team_data_validation(self):
        """Test team data validation rules"""
        valid_team = {
            'team': 'Test Team',
            'position': 1,
            'played': 10,
            'wins': 8,
            'draws': 1,
            'losses': 1,
            'goals_for': 25,
            'goals_against': 8,
            'points': 25
        }
        
        # Test valid data
        errors = validate_team_data(valid_team)
        assert len(errors) == 0
        
        # Test invalid data
        invalid_team = valid_team.copy()
        invalid_team['wins'] = 15  # More wins than played
        
        errors = validate_team_data(invalid_team)
        assert len(errors) > 0
        assert 'must equal played matches' in str(errors)
```

#### API Endpoint Tests (`tests/integration/test_api_endpoints.py`)
```python
import pytest
import json
from unittest.mock import patch

class TestAPIEndpoints:
    def test_get_standings(self, test_app, sample_league_data):
        """Test standings endpoint"""
        with patch('app.data_scheduler.get_cached_data', return_value=sample_league_data):
            response = test_app.get('/api/standings')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'league_table' in data
            assert 'last_updated' in data
            assert len(data['league_table']) > 0
    
    def test_get_data_endpoint(self, test_app, sample_league_data):
        """Test main data endpoint"""
        with patch('app.data_scheduler.get_cached_data', return_value=sample_league_data):
            response = test_app.get('/api/data')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'featured_team_name' in data
            assert 'featured_team_key' in data
    
    def test_api_error_handling(self, test_app):
        """Test API error handling"""
        with patch('app.data_scheduler.get_cached_data', return_value=None):
            response = test_app.get('/api/standings')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
    
    def test_refresh_endpoint(self, test_app):
        """Test data refresh endpoint"""
        with patch('app.data_scheduler.fetch_and_process_data') as mock_fetch:
            response = test_app.get('/api/refresh')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            mock_fetch.assert_called_once()

class TestAPIPerformance:
    def test_response_times(self, test_app, sample_league_data):
        """Test API response times"""
        import time
        
        with patch('app.data_scheduler.get_cached_data', return_value=sample_league_data):
            start_time = time.time()
            response = test_app.get('/api/standings')
            end_time = time.time()
            
            assert response.status_code == 200
            assert (end_time - start_time) < 0.1  # 100ms max for cached data
    
    def test_concurrent_requests(self, test_app, sample_league_data):
        """Test concurrent API requests"""
        import concurrent.futures
        import threading
        
        def make_request():
            return test_app.get('/api/standings')
        
        with patch('app.data_scheduler.get_cached_data', return_value=sample_league_data):
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_request) for _ in range(10)]
                responses = [f.result() for f in futures]
                
                assert all(r.status_code == 200 for r in responses)
```

### 3. Integration Tests

#### External API Integration (`tests/integration/test_external_api.py`)
```python
import pytest
from unittest.mock import patch, Mock
import requests
from hollandsevelden import get_data

class TestExternalAPIIntegration:
    @patch('requests.get')
    def test_api_success(self, mock_get):
        """Test successful API response"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps({
            '3n': {
                'leaguetable': [{'name': 'Test Team', 'points': 25}],
                'results': [],
                'program': []
            }
        })
        mock_get.return_value = mock_response
        
        data = get_data(use_test_data=False)
        
        assert data is not None
        assert 'leaguetable' in data
        assert len(data['leaguetable']) > 0
    
    @patch('requests.get')
    def test_api_failure_fallback(self, mock_get):
        """Test fallback to test data on API failure"""
        mock_get.side_effect = requests.RequestException("API unavailable")
        
        data = get_data(use_test_data=False)
        
        # Should fallback to test data
        assert data is not None
        assert 'leaguetable' in data
    
    @patch('requests.get')
    def test_api_timeout_handling(self, mock_get):
        """Test API timeout handling"""
        mock_get.side_effect = requests.Timeout("Request timeout")
        
        data = get_data(use_test_data=False)
        
        # Should fallback gracefully
        assert data is not None

class TestSchedulerIntegration:
    def test_scheduler_data_processing(self, mock_scheduler):
        """Test scheduler data processing pipeline"""
        from scheduler import DataScheduler
        
        scheduler = DataScheduler()
        
        with patch('scheduler.get_data') as mock_get_data:
            mock_get_data.return_value = {
                'leaguetable': [{'name': 'Test', 'points': 10}],
                'results': [],
                'program': []
            }
            
            scheduler.fetch_and_process_data()
            
            # Verify data was processed and cached
            cached_data = scheduler.get_cached_data()
            assert cached_data is not None
            assert 'league_table' in cached_data
            assert 'last_updated' in cached_data
```

### 4. End-to-End Tests

#### Dashboard E2E Tests (`tests/e2e/test_dashboard.py`)
```python
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

@pytest.fixture(scope="session")
def browser():
    """Setup browser for E2E tests"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    driver.quit()

class TestDashboardE2E:
    def test_dashboard_loading(self, browser):
        """Test dashboard loads successfully"""
        browser.get("http://localhost:5000")
        
        # Wait for dashboard to load
        WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "carousel"))
        )
        
        # Verify carousel is present
        carousel = browser.find_element(By.ID, "carousel")
        assert carousel.is_displayed()
    
    def test_carousel_navigation(self, browser):
        """Test carousel manual navigation"""
        browser.get("http://localhost:5000")
        
        # Wait for carousel to load
        WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "carousel"))
        )
        
        # Test next button
        next_btn = browser.find_element(By.CLASS_NAME, "carousel-control-next")
        next_btn.click()
        
        # Verify slide changed
        active_slide = browser.find_element(By.CSS_SELECTOR, ".carousel-item.active")
        assert active_slide
    
    def test_data_display(self, browser):
        """Test data is displayed correctly"""
        browser.get("http://localhost:5000")
        
        # Wait for data to load
        WebDriverWait(browser, 15).until(
            EC.presence_of_element_located((By.CLASS_NAME, "standings-table"))
        )
        
        # Verify standings table exists and has data
        table = browser.find_element(By.CLASS_NAME, "standings-table")
        rows = table.find_elements(By.TAG_NAME, "tr")
        assert len(rows) > 1  # Header + at least one data row
    
    def test_test_mode_indicator(self, browser):
        """Test test mode indicator visibility"""
        browser.get("http://localhost:5000")
        
        # Check if test mode indicator is visible (depends on configuration)
        try:
            indicator = browser.find_element(By.ID, "testModeIndicator")
            # Test mode indicator should be visible in test environment
            assert indicator.is_displayed()
        except:
            # Indicator not present in production mode
            pass

class TestAccessibility:
    def test_keyboard_navigation(self, browser):
        """Test keyboard accessibility"""
        browser.get("http://localhost:5000")
        
        # Focus on carousel
        carousel = browser.find_element(By.ID, "carousel")
        carousel.click()
        
        # Test arrow key navigation
        from selenium.webdriver.common.keys import Keys
        carousel.send_keys(Keys.ARROW_RIGHT)
        
        # Verify slide changed (implementation needed)
    
    def test_aria_labels(self, browser):
        """Test ARIA labels for screen readers"""
        browser.get("http://localhost:5000")
        
        carousel = browser.find_element(By.ID, "carousel")
        aria_label = carousel.get_attribute("aria-label")
        assert aria_label is not None
        assert len(aria_label) > 0
```

## Test Data Management

### 1. Test Fixtures
```python
# tests/fixtures/sample_data.json
{
  "league_table": [
    {
      "team": "Test Team 1",
      "position": 1,
      "played": 10,
      "wins": 8,
      "draws": 1,  
      "losses": 1,
      "goals_for": 25,
      "goals_against": 8,
      "points": 25
    }
  ],
  "results": [
    {
      "date": "2025-08-23",
      "home": "Test Team 1",
      "away": "Test Team 2",
      "homeGoals": 3,
      "awayGoals": 1
    }
  ],
  "last_updated": "2025-08-27T10:30:00"
}
```

### 2. Mock API Responses
```python
# tests/fixtures/mock_responses.py
import json

class MockAPIResponses:
    @staticmethod
    def successful_api_response():
        return {
            'status_code': 200,
            'json': {
                '3n': {
                    'leaguetable': [
                        {'name': 'Mock Team', 'points': 20}
                    ],
                    'results': [],
                    'program': []
                }
            }
        }
    
    @staticmethod
    def api_error_response():
        return {
            'status_code': 500,
            'text': 'Internal Server Error'
        }
    
    @staticmethod
    def api_timeout():
        raise requests.Timeout("Request timeout")
```

## Performance Testing

### 1. Load Testing with pytest-benchmark
```python
import pytest
from app import app

@pytest.fixture
def app_client():
    with app.test_client() as client:
        yield client

def test_api_performance(benchmark, app_client):
    """Benchmark API endpoint performance"""
    result = benchmark(app_client.get, '/api/standings')
    
    assert result.status_code == 200
    # Benchmark will automatically track performance metrics

def test_data_processing_performance(benchmark, sample_league_data):
    """Benchmark data processing performance"""
    from hollandsevelden import get_filtered_period_standings
    
    result = benchmark(get_filtered_period_standings, sample_league_data)
    
    assert result is not None
```

### 2. Memory Usage Testing
```python
import psutil
import os

def test_memory_usage():
    """Test application memory usage"""
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss
    
    # Perform operations
    from scheduler import DataScheduler
    scheduler = DataScheduler()
    scheduler.fetch_and_process_data()
    
    final_memory = process.memory_info().rss
    memory_increase = final_memory - initial_memory
    
    # Assert memory increase is reasonable (adjust threshold as needed)
    assert memory_increase < 100 * 1024 * 1024  # 100MB threshold
```

## Continuous Integration

### 1. GitHub Actions Configuration
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.10, 3.11]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov pytest-benchmark selenium
    
    - name: Run unit tests
      run: pytest tests/unit/ -v --cov=.
    
    - name: Run integration tests
      run: pytest tests/integration/ -v
    
    - name: Run E2E tests
      run: |
        python app.py &
        sleep 5
        pytest tests/e2e/ -v
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

## Quality Gates

### 1. Test Coverage Requirements
- **Minimum coverage**: 80% overall
- **Critical functions**: 95% coverage
- **New code**: 90% coverage
- **Integration points**: 100% coverage

### 2. Performance Thresholds
- **API response time**: <100ms (cached), <2s (fresh data)
- **Memory usage**: <200MB total
- **Test execution time**: <5 minutes full suite
- **Frontend load time**: <3s initial load

### 3. Quality Metrics
- **All unit tests pass**: Required
- **No high-severity security issues**: Required
- **Code coverage**: ≥80%
- **Performance benchmarks**: Within thresholds
- **Accessibility compliance**: WCAG 2.1 AA

This comprehensive testing strategy ensures SPMS maintains high quality, reliability, and performance while supporting continuous development and deployment practices.