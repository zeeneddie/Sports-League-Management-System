from flask import Flask, render_template, jsonify, send_from_directory, request, redirect, url_for
from flask_wtf.csrf import CSRFProtect
from config import Config
from scheduler import data_scheduler
from overige_scraper import filter_apeldoornse_clubs
import os
import json

app = Flask(__name__) 
app.secret_key = Config.SECRET_KEY

# CSRF Protection
csrf = CSRFProtect(app)

# Exempt API endpoints from CSRF (they're read-only)
csrf.exempt('api')

# HTTPS redirect middleware
@app.before_request
def force_https():
    """Redirect HTTP to HTTPS if SSL is enabled"""
    if Config.USE_SSL and not request.is_secure:
        # Skip redirect for localhost during development
        if request.host.startswith('127.0.0.1') or request.host.startswith('localhost'):
            return None
        
        # Redirect to HTTPS
        return redirect(request.url.replace('http://', 'https://'), code=301)

# Security headers
@app.after_request
def set_security_headers(response):
    # Prevent XSS attacks
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # HTTPS enforcement (in production and when SSL is enabled)
    if Config.USE_SSL and not app.debug:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # Content Security Policy - restrictive but allows Bootstrap CDN and inline scripts for dashboard
    # Update CSP to allow HTTPS resources when SSL is enabled
    protocol = 'https' if Config.USE_SSL else 'http'
    csp = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
        "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' https://cdn.jsdelivr.net; "
        "connect-src 'self' https://cdn.jsdelivr.net;"
    )
    response.headers['Content-Security-Policy'] = csp

    return response

# Favicon route
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static', 'images'),
                               'favicon.png', mimetype='image/png')

@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

@app.route('/')
def landing():
    return render_template('dashboard.html', 
                         screen_duration_seconds=Config.SCREEN_DURATION_SECONDS)

# API endpoint mappings
API_DATA_MAPPINGS = {
    'data': {'key': None, 'wrapper': None},  # Return all data
    'standings': {'key': 'league_table', 'wrapper': 'league_table'},
    'period-standings': {'key': 'period_standings', 'wrapper': 'period_standings'},
    'last-week-results': {'key': 'last_week_results', 'wrapper': 'results'},
    'next-week-matches': {'key': 'next_week_matches', 'wrapper': 'matches'},
    'weekly-results': {'key': 'weekly_results', 'wrapper': 'weekly_results'},
    'all-matches': {'key': 'all_matches', 'wrapper': 'matches'},
}

def _get_cached_data_with_error_handling():
    """Get cached data with consistent error handling"""
    data = data_scheduler.get_cached_data()
    if not data:
        return None, (jsonify({'error': 'No data available'}), 500)
    return data, None

def _format_api_response(data, data_key, wrapper_key):
    """Format API response with consistent structure"""
    if data_key is None:
        return jsonify(data)
    
    response = {
        wrapper_key: data.get(data_key, [] if wrapper_key != 'weekly_results' else {}),
        'last_updated': data.get('last_updated')
    }
    return jsonify(response)

@app.route('/api/data')
def get_data():
    """API endpoint to get all dashboard data"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error

    # Check and integrate local files if they have been modified
    if data_scheduler.check_local_files_modified():
        print("Local files modified - integrating updates...")
        data = data_scheduler.integrate_local_files(data)
        # Update the cached data with integrated local files
        data_scheduler.cached_data = data

    # Add featured team info to the main data endpoint
    if data:
        data['featured_team_name'] = Config.FEATURED_TEAM
        data['featured_team_key'] = Config.FEATURED_TEAM_KEY

    return _format_api_response(data, None, None)

@app.route('/api/standings')
def get_standings():
    """Get league table standings"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'league_table', 'league_table')

@app.route('/api/period-standings')
def get_period_standings():
    """Get period standings where matches have been played"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'period_standings', 'period_standings')

@app.route('/api/last-week-results')
def get_last_week_results():
    """Get results from the last week"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'last_week_results', 'results')

@app.route('/api/next-week-matches')
def get_next_week_matches():
    """Get matches for the next week"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'next_week_matches', 'matches')

@app.route('/api/featured-team-matches')
def get_featured_team_matches_api():
    """Get all featured team matches (dynamic based on USE_TEST_DATA)"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    
    featured_data = data.get('featured_team_matches', {})
    
    return jsonify({
        'featured_team_matches': featured_data,
        'featured_team_name': Config.FEATURED_TEAM,
        'featured_team_key': Config.FEATURED_TEAM_KEY,
        'last_updated': data.get('last_updated')
    })

@app.route('/api/weekly-results')
def get_weekly_results():
    """Get results grouped by week number"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'weekly_results', 'weekly_results')


@app.route('/api/all-matches')
def get_all_matches():
    """Get all matches (both played and upcoming)"""
    data, error = _get_cached_data_with_error_handling()
    if error:
        return error
    return _format_api_response(data, 'all_matches', 'matches')

@app.route('/api/overige-apeldoornse-clubs')
def get_overige_apeldoornse_clubs():
    """Get filtered results for Overige Apeldoornse clubs"""
    try:
        # Lees uitslagen.json bestand
        with open('uitslagen.json', 'r', encoding='utf-8') as f:
            all_results = json.load(f)

        # Filter voor Apeldoornse clubs
        filtered_results = filter_apeldoornse_clubs(all_results)

        return jsonify({
            'results': filtered_results,
            'last_updated': None  # Voeg timestamp toe als gewenst
        })
    except FileNotFoundError:
        return jsonify({'error': 'Uitslagen file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/apeldoornse-clubs-upcoming')
def get_apeldoornse_clubs_upcoming():
    """Get upcoming matches for Apeldoornse clubs (working_scraper data)"""
    try:
        data = data_scheduler.get_cached_data()
        if not data:
            return jsonify({'error': 'No data available'}), 404

        # Get the separated working_scraper data
        apeldoornse_clubs_upcoming = data.get('apeldoornse_clubs_upcoming', [])

        return jsonify(apeldoornse_clubs_upcoming)
    except Exception as e:
        app.logger.error(f"Error getting apeldoornse clubs upcoming data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-endpoint')
def test_endpoint():
    """Simple test endpoint"""
    return jsonify({'status': 'working', 'message': 'Test endpoint is functional'})

@app.route('/komende_wedstrijden.json')
def komende_wedstrijden():
    """Serve komende wedstrijden JSON data"""
    try:
        with open('komende_wedstrijden.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify([]), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/refresh')
def refresh_data():
    """Force refresh of data"""
    try:
        data_scheduler.fetch_and_process_data()
        return jsonify({'success': True, 'message': 'Data refreshed successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Start the data scheduler (also works with gunicorn)
data_scheduler.start_scheduler()

if __name__ == '__main__':
    
    # Only enable debug mode in development
    debug_mode = os.getenv('FLASK_ENV', 'production') == 'development'
    
    # SSL Configuration
    if Config.USE_SSL:
        # Check if SSL certificate files exist
        if os.path.exists(Config.SSL_CERT_PATH) and os.path.exists(Config.SSL_KEY_PATH):
            print(f"Starting HTTPS server on https://127.0.0.1:{Config.SSL_PORT}")
            ssl_context = (Config.SSL_CERT_PATH, Config.SSL_KEY_PATH)
            app.run(
                debug=debug_mode, 
                host='127.0.0.1', 
                port=Config.SSL_PORT,
                ssl_context=ssl_context
            )
        else:
            print("SSL certificates not found!")
            print(f"Expected certificate: {Config.SSL_CERT_PATH}")
            print(f"Expected key: {Config.SSL_KEY_PATH}")
            print("Run 'python generate_ssl_cert.py' to generate certificates")
            print("Falling back to HTTP...")
            app.run(debug=debug_mode, host='127.0.0.1', port=Config.HTTP_PORT)
    else:
        print(f"Starting HTTP server on http://127.0.0.1:{Config.HTTP_PORT}")
        app.run(debug=debug_mode, host='127.0.0.1', port=Config.HTTP_PORT)
