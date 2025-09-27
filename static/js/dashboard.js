// Dashboard JavaScript - SPMS Liga Dashboard
// Configuration will be set by the template
var SCREEN_DURATION_SECONDS = 10; // Default, will be overwritten

// Global variables
var carouselInstance = null;
var countdownInterval = null;
var currentCountdown = SCREEN_DURATION_SECONDS;
var totalSlides = 0;
var featuredTeamName = "";
var carouselInitialized = false;
var teamShirtData = {}; // Store team shirt data from API
var logoMode = 'team'; // 'team' or 'club' - alternates each cycle
var clubLogoMapping = {
    'AGOVV': 'agovv.webp',
    'AVV Columbia': 'columbia.webp',
    'SV Epe': 'epe.webp',
    'Groen Wit \'62': 'groenwit.webp',
    'SV \'t Harde': 'tharde.webp',
    'VV Hattem': 'hattem.webp',
    'SV Hatto Heim': 'hatoheim.webp',
    'VV Heerde': 'heerde.webp',
    'OWIOS': 'owios.webp',
    'VV SEH': 'seh.webp',
    'SP Teuge': 'teuge.webp',
    'VIOS V': 'vios.webp',
    'VVOP': 'vvop.webp',
    'Zwart-Wit \'63': 'zwartwit.webp'
};

// Mobile detection function (dynamic) - improved for wide mobile screens
function isMobileDevice() {
    // Check for mobile user agents first (most reliable)
    var isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // For portrait orientation on narrow screens, definitely mobile
    if (window.innerWidth <= 768) return true;

    // For portrait orientation on wider screens (like Motorola Edge Ultra), check user agent
    if (window.matchMedia("(orientation: portrait)").matches && isMobileUA) return true;

    // For very wide screens in landscape but still mobile user agent
    if (isMobileUA && window.innerWidth <= 1200) return true;

    return false;
}

function isTabletDevice() {
    // Tablets are typically 768-1024px and NOT mobile user agents, or iPads
    var isTabletUA = /iPad/i.test(navigator.userAgent);
    return (window.innerWidth > 768 && window.innerWidth <= 1024 && !isMobileDevice()) || isTabletUA;
}

function isTVDevice() {
    // TV browsers are typically wide screens without mobile user agents
    var isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return window.innerWidth > 1024 && !isMobileUA;
}

// Current device state (will be updated dynamically)
var isMobile = isMobileDevice();
var isTablet = isTabletDevice();
var isTV = isTVDevice();

// Function to build team shirt data from API
function buildTeamShirtData(data) {
    teamShirtData = {};
    if (data && data.league_table) {
        for (var i = 0; i < data.league_table.length; i++) {
            var team = data.league_table[i];
            if (team.team && team.shirt) {
                teamShirtData[team.team] = team.shirt;
            }
        }
    }
}

// Function to get current date formatted for Dutch
function getCurrentDateFormatted() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // January is 0
    const year = today.getFullYear();
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
}

// Generic function to get team logo using API shirt data
function getTeamLogoGeneric(teamName, cssClass) {
    if (cssClass === undefined) cssClass = 'team-logo';
    if (!teamName) return '';

    // Check current logo mode (team or club)
    if (logoMode === 'club') {
        // Try to get club logo first
        var clubLogo = clubLogoMapping[teamName];
        if (clubLogo) {
            var logoUrl = '/static/images/club_logos/' + clubLogo;
            return '<img src="' + logoUrl + '" class="' + cssClass + '" alt="' + teamName + '" onerror="this.style.display=\'none\'">';
        }
    }

    // Fall back to team shirt logo
    var shirtId = teamShirtData[teamName];
    if (shirtId) {
        // Remove .png extension if present and construct local path
        var logoId = shirtId.replace('.png', '');
        var logoUrl = '/static/images/team_logos/' + logoId + '.png';
        return '<img src="' + logoUrl + '" class="' + cssClass + '" alt="' + teamName + '" onerror="this.style.display=\'none\'">';
    }

    return ''; // No logo found
}

// Function to get team logo based on team name
function getTeamLogo(teamName) {
    return getTeamLogoGeneric(teamName, 'team-logo');
}

// Function to get larger team logo for matches (1.3x bigger)
function getTeamLogoLarge(teamName) {
    return getTeamLogoGeneric(teamName, 'team-logo-large');
}

// Function to get team name with logo
function getTeamNameWithLogo(teamName, forceShorten) {
    if (forceShorten === undefined) forceShorten = false;
    var logo = getTeamLogo(teamName);
    var displayName = getShortTeamName(teamName, forceShorten);
    return logo ? logo + ' ' + displayName : displayName;
}

// Function to get team name with large logo (for matches)
function getTeamNameWithLogoLarge(teamName, forceShorten) {
    if (forceShorten === undefined) forceShorten = false;
    var logo = getTeamLogoLarge(teamName);
    var displayName = getShortTeamName(teamName, forceShorten);
    return logo ? logo + ' ' + displayName : displayName;
}

// Function to get team name with large logo after name (for away teams)
function getTeamNameWithLogoLargeAfter(teamName, forceShorten) {
    if (forceShorten === undefined) forceShorten = false;
    var logo = getTeamLogoLargeAfter(teamName);
    var displayName = getShortTeamName(teamName, forceShorten);
    return logo ? displayName + ' ' + logo : displayName;
}

// Function to get larger team logo positioned after name
function getTeamLogoLargeAfter(teamName) {
    return getTeamLogoGeneric(teamName, 'team-logo-large-after');
}

// Function to shorten team name for mobile display
function getShortTeamName(fullTeamName, forceShorten) {
    if (forceShorten === undefined) forceShorten = false;
    if (!isMobile && !forceShorten) return fullTeamName;


    // Extract the main team name (remove prefixes like AVV, SV, VV etc.)
    const parts = fullTeamName.split(' ');
    if (parts.length > 1) {
        // Remove common prefixes
        var prefixes = ['AVV', 'SV', 'VV', 'FC', 'AGOVV', 'VVV'];
        if (prefixes.indexOf(parts[0]) !== -1) {
            var mainName = parts.slice(1).join(' ');

            // Further shorten if still too long for mobile (increased from 8 to 9)
            if (mainName.length > 9) {
                // Take first word only if multiple words remain
                var mainParts = mainName.split(' ');
                var result = mainParts[0];
                return result;
            }
            return mainName;
        }
    }

    // If no prefix or single word, truncate if too long (increased from 8 to 9)
    if (fullTeamName.length > 9) {
        var result = fullTeamName.substring(0, 9);
        return result;
    }

    return fullTeamName;
}

// Apply device-specific styling
function applyDeviceStyling() {
    // Update device detection
    isMobile = isMobileDevice();
    isTablet = isTabletDevice();
    isTV = isTVDevice();

    var body = document.body;
    
    // Remove existing device classes
    body.classList.remove('mobile-mode', 'tablet-mode', 'tv-mode');
    
    // Add appropriate device class
    if (isMobile) {
        body.classList.add('mobile-mode');
    } else if (isTablet) {
        body.classList.add('tablet-mode');
    } else {
        body.classList.add('tv-mode');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Apply device-specific styling first
    applyDeviceStyling();
    
    loadData().then(function(data) {
        initializeCarousel();
        updateMatchStatistics(data);
    }).catch(function(error) {
        updateMatchStatistics(null);
    });
});

// Load data from API
function loadData() {
    return fetch('/api/data')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {

        // Build team shirt data from API
        buildTeamShirtData(data);

        // Set featured team info globally
        featuredTeamName = data.featured_team_name || "Featured Team";
        updateTeamName();

        // Check and display TEST MODE indicator
        checkTestMode(data);
        
        // Clear existing slides except intro
        var slideContainer = document.getElementById('slide-container');
        if (!slideContainer) {
            return data; // Return data but skip slideshow initialization
        }

        var introSlide = slideContainer.querySelector('.intro-screen');
        
        // Keep intro slide, remove others
        var otherSlides = slideContainer.querySelectorAll('.slide-item:not(.intro-screen)');
        for (var i = 0; i < otherSlides.length; i++) {
            otherSlides[i].remove();
        }
        
        // Add data slides  
        addStandingsSlide(data.league_table || [], data.all_matches || []);
        
        // Add individual period slides (only if matches have been played)
        if (data.raw_data && data.raw_data.period1) {
            addPeriodSlide(data.raw_data.period1, 'Periode 1', 'period1');
        }
        if (data.raw_data && data.raw_data.period2) {
            addPeriodSlide(data.raw_data.period2, 'Periode 2', 'period2');
        }
        if (data.raw_data && data.raw_data.period3) {
            addPeriodSlide(data.raw_data.period3, 'Periode 3', 'period3');
        }
        
        addLastWeekResultsSlide(data.last_week_results || []);
        addOverigeApeldoornseClubsSlide();
        addOverigeApeldoornseClubsKomendeWedstrijdenSlide();
        addNextWeekMatchesSlide(data.next_week_matches || []);
        addFeaturedMatchesSlide(data.featured_team_matches || {played: [], upcoming: []});
        
            return data;
        });
}

function updateTeamName() {
    var titleElement = document.getElementById('competition-main-title');
    if (titleElement && featuredTeamName) {
        titleElement.textContent = featuredTeamName.toUpperCase();
    }
}

function updateMatchStatistics(data) {
    if (!data) {
        // If no data, show loading state
        updateCompetitionMatchesStats(0, 0);
        updateColumbiaMatchesStats(0, 0);
        return;
    }
    
    // Calculate total competition matches
    var allMatches = data.all_matches || [];
    var totalMatches = allMatches.length;
    
    // Calculate played matches (matches with status 'Gespeeld' or valid scores)
    var playedMatchesCount = 0;
    for (var i = 0; i < allMatches.length; i++) {
        var match = allMatches[i];
        var status = match.status || match.matchStatus || '';
        var isPlayedStatus = status === 'played' || status === 'Gespeeld' || status === 'Uitgespeeld';

        if (status && status !== '') {
            if (isPlayedStatus) playedMatchesCount++;
        } else {
            // Fallback: check if there are valid scores
            var homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
            var awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
            if (!isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore))) {
                playedMatchesCount++;
            }
        }
    }
    
    // Calculate Columbia matches
    var columbiaMatches = data.featured_team_matches || {played: [], upcoming: []};
    var columbiaPlayed = (columbiaMatches.played || []).length;
    var columbiaUpcoming = (columbiaMatches.upcoming || []).length;


    // Update the display
    updateCompetitionMatchesStats(playedMatchesCount, totalMatches);
    updateColumbiaMatchesStats(columbiaPlayed, columbiaUpcoming);
}

function updateCompetitionMatchesStats(played, total) {
    var element = document.getElementById('competition-matches-stats');
    var remaining = total - played;
    if (element) {
        if (isMobile) {
            // Mobile: Split over three lines for better readability
            element.innerHTML = 'Wedstrijden in competitie:<br>nog te spelen / gespeeld<br>' + remaining + ' / ' + played;
        } else {
            // Desktop: Single line
            element.textContent = 'Wedstrijden in competitie: nog te spelen ' + remaining + ' / gespeeld ' + played;
        }
    } else {
    }
}

function updateColumbiaMatchesStats(played, upcoming) {
    var element = document.getElementById('columbia-matches-stats');
    if (element) {
        if (isMobile) {
            // Mobile: Split over three lines for better readability
            element.innerHTML = 'Wedstrijden Columbia:<br>nog te spelen / gespeeld<br>' + upcoming + ' / ' + played;
        } else {
            // Desktop: Single line
            element.textContent = 'Wedstrijden Columbia: nog te spelen ' + upcoming + ' / gespeeld ' + played;
        }
    } else {
    }
}

// Check if in test mode and show/hide indicator
function checkTestMode(data) {
    var indicator = document.getElementById('testModeIndicator');
    // Test mode uses 'VV Gorecht' as featured team
    if (data.featured_team_name === 'VV Gorecht') {
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// Helper function to get first valid (non-null, non-undefined) value
function getFirstValidValue() {
    for (var i = 0; i < arguments.length; i++) {
        var val = arguments[i];
        if (val !== undefined && val !== null) return val;
    }
    return null;
}

// Helper function to format numbers with space padding (under 10 = single digit with space, 10+ = normal)
function formatTwoDigits(number) {
    const num = Number(number);
    if (num < 10) {
        return ' ' + num; // Space + single digit for numbers under 10
    } else {
        return num.toString(); // Normal display for 10 and above
    }
}

// Helper function to format goal difference with proper spacing for negative values
function formatGoalDifference(goalsFor, goalsAgainst) {
    const difference = (goalsFor || 0) - (goalsAgainst || 0);
    if (difference >= 0) {
        if (difference < 10) {
            return '+ ' + difference; // + space + single digit
        } else {
            return '+' + difference; // + double digit
        }
    } else {
        const absDiff = Math.abs(difference);
        if (absDiff < 10) {
            return '- ' + absDiff; // - space + single digit
        } else {
            return '-' + absDiff; // - double digit
        }
    }
}


// Calculate form data for last 5 matches
function calculateTeamForm(teamName, allMatches) {
    if (!allMatches || !teamName) return '';
    
    // Get all matches for this team, sorted by date
    var teamMatches = [];
    for (var i = 0; i < allMatches.length; i++) {
        var match = allMatches[i];
        var home = match.home || match.hometeam || '';
        var away = match.away || match.awayteam || '';
        if (home.indexOf(teamName) !== -1 || away.indexOf(teamName) !== -1 ||
           teamName.indexOf(home) !== -1 || teamName.indexOf(away) !== -1) {
            teamMatches.push(match);
        }
    }
    // Sort by date
    teamMatches.sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
    });
    
    // EERST filteren op ALLEEN gespeelde wedstrijden, DAN laatste 5 nemen
    var playedMatches = [];
    for (var i = 0; i < teamMatches.length; i++) {
        var match = teamMatches[i];
        var status = match.status || match.matchStatus || '';

        // First check status - this is most reliable
        var isPlayedStatus = status === 'played' || status === 'Gespeeld' || status === 'Uitgespeeld';

        // Only use score validation as fallback if no status is available
        if (status && status !== '') {
            if (isPlayedStatus) {
                playedMatches.push(match);
            }
        } else {
            // Fallback: check if there are valid scores (only when no status available)
            var homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
            var awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
            var hasValidScores = !isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore));

            if (hasValidScores) {
                playedMatches.push(match);
            }
        }
    }
    
    // Get last 5 PLAYED matches
    var last5PlayedMatches = playedMatches.slice(-5);
    
    // Debug logging for team form
    
    var formHtml = '<div class="team-form">';
    
    // Add up to 5 circles, with unfilled ones on the left
    for (var i = 0; i < 5; i++) {
        if (i < 5 - last5PlayedMatches.length) {
            // Grey circle for teams with less than 5 played matches (left side)
            formHtml += '<span class="form-circle form-unplayed">●</span>';
        } else {
            var match = last5PlayedMatches[i - (5 - last5PlayedMatches.length)];
            // Check if team is playing home or away (improved matching)
            var homeTeam = match.home || match.hometeam || match.home_team || '';
            var awayTeam = match.away || match.awayteam || match.away_team || '';

            var isHome = homeTeam.toLowerCase().indexOf(teamName.toLowerCase()) !== -1 ||
                        teamName.toLowerCase().indexOf(homeTeam.toLowerCase()) !== -1;
            var isAway = awayTeam.toLowerCase().indexOf(teamName.toLowerCase()) !== -1 ||
                        teamName.toLowerCase().indexOf(awayTeam.toLowerCase()) !== -1;

            var result = 'unplayed'; // Default to unplayed (grey)
            var resultText = 'ONBEKEND';
            var colorText = 'GRIJS';
            
            // All matches in this array are already filtered to played status or valid scores
            var matchStatus = match.status || match.matchStatus || '';
            
            if (isHome || isAway) {
                // Check all possible score field variations using helper function
                var homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
                var awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);

                var homeGoals = parseInt(homeScore);
                var awayGoals = parseInt(awayScore);
                
                if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
                    if (homeGoals === awayGoals) {
                        result = 'draw'; // Blue for draws
                        resultText = 'GELIJK';
                        colorText = 'BLAUW';
                    } else if ((isHome && homeGoals > awayGoals) || (isAway && awayGoals > homeGoals)) {
                        result = 'win'; // Green for wins
                        resultText = 'GEWONNEN';
                        colorText = 'GROEN';
                    } else {
                        result = 'loss'; // Red for losses
                        resultText = 'VERLOREN';
                        colorText = 'ROOD';
                    }
                } else {
                    resultText = 'GEEN GELDIGE SCORE';
                }
            } else {
                resultText = 'TEAM MATCH FOUT';
            }
            
            var homeDisplay = isHome ? homeTeam + ' (THUIS)' : homeTeam;
            var awayDisplay = isAway ? awayTeam + ' (UIT)' : awayTeam;
            
            
            formHtml += '<span class="form-circle form-' + result + '">●</span>';
        }
    }
    
    formHtml += '</div>';
    return formHtml;
}

// Add slides functions with original styling
function addStandingsSlide(standings, allMatches = []) {
    const slide = document.createElement('div');
    slide.className = 'slide-item';

    if (isMobile) {
        // Mobile: Single column layout without form column
        slide.innerHTML = `
            <div>
                <h2 class="mobile-header" style="font-size: 1.8rem !important;">
                    Stand
                </h2>
                <div class="row">
                    <div class="col-12">
                        <table class="table table-striped standings-table" style="margin-top: -0.5cm !important;">
                        <thead>
                            <tr>
                                <th class="position-header">#</th>
                                <th>Team</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">W</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">V</th>
                                <th class="stats-header">+/-</th>
                                <th class="position-header">P</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map(team => {
                                const teamName = team.team || team.name;
                                const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                return `
                                <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                    <td class="position-cell">${team.position}</td>
                                    <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                    <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                    <td class="points-cell">${team.points}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                </div>
            </div>
        `;
    } else {
        // Desktop/TV: Two column layout with form column
        const leftStandings = standings.slice(0, 7);
        const rightStandings = standings.slice(7, 14);
        
        slide.innerHTML = `
            <h1 class="standings-header">Stand per ${getCurrentDateFormatted()}</h1>
            <div class="row">
                <!-- Left column: positions 1-7 -->
                <div class="col-md-6">
                    <table class="table table-striped standings-table">
                        <thead>
                            <tr>
                                <th class="position-header">#</th>
                                <th>Team</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">W</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">V</th>
                                <th class="stats-header">+/-</th>
                                <th class="position-header">P</th>
                                <th>Vorm</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leftStandings.map(team => {
                                const teamName = team.team || team.name;
                                const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                return `
                                <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                    <td class="position-cell">${team.position}</td>
                                    <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                    <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                    <td class="points-cell">${team.points}</td>
                                    <td>${calculateTeamForm(teamName, allMatches)}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <!-- Right column: positions 8-14 -->
                <div class="col-md-6">
                    <table class="table table-striped standings-table">
                        <thead>
                            <tr>
                                <th class="position-header">#</th>
                                <th>Team</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">W</th>
                                <th class="stats-header">G</th>
                                <th class="stats-header">V</th>
                                <th class="stats-header">+/-</th>
                                <th class="position-header">P</th>
                                <th>Vorm</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rightStandings.map(team => {
                                const teamName = team.team || team.name;
                                const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                return `
                                <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                    <td class="position-cell">${team.position}</td>
                                    <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                    <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                    <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                    <td class="points-cell">${team.points}</td>
                                    <td>${calculateTeamForm(teamName, allMatches)}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    const container = document.getElementById('slide-container');
    if (container) {
        container.appendChild(slide);
        updateTotalSlides();
    } else {
    }
}

function addPeriodSlide(periodData, periodTitle, periodKey, forceShow = false) {
    // Check if period has any data
    if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
        return;
    }
    
    // Check if any team has played matches (skip check if forced)
    if (!forceShow) {
        const hasPlayedMatches = periodData.some(team => (team.matches || team.played || 0) > 0);
        if (!hasPlayedMatches) {
            return;
        }
    } else {
    }
    
    const slide = document.createElement('div');
    slide.className = 'slide-item';
    
    if (isMobile) {
        // Mobile: Single column layout without form column
        slide.innerHTML = `
            <div>
                <h2 class="mobile-header" style="font-size: 1.8rem !important;">
                    ${periodTitle}
                </h2>
                <div class="row">
                    <div class="col-12">
                        <table class="table table-striped standings-table">
                            <thead>
                                <tr>
                                    <th class="position-header">#</th>
                                    <th>Team</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">W</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">V</th>
                                    <th class="stats-header">+/-</th>
                                    <th class="position-header">P</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${periodData.map(team => {
                                    const teamName = team.team || team.name;
                                    const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                    return `
                                    <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                        <td class="position-cell">${team.position}</td>
                                        <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                        <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                        <td class="points-cell">${team.points}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Desktop/TV: Two column layout (no form column in periods anyway)
        const leftStandings = periodData.slice(0, 7);
        const rightStandings = periodData.slice(7, 14);
        
        slide.innerHTML = `
            <div>
                <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                    ${periodTitle}
                </h2>
                <div class="row">
                    <!-- Left column: positions 1-7 -->
                    <div class="col-md-6">
                        <table class="table table-striped standings-table">
                            <thead>
                                <tr>
                                    <th class="position-header">#</th>
                                    <th>Team</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">W</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">V</th>
                                    <th class="stats-header">+/-</th>
                                    <th class="position-header">P</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leftStandings.map(team => {
                                    const teamName = team.team || team.name;
                                    const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                    return `
                                    <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                        <td class="position-cell">${team.position}</td>
                                        <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                        <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                        <td class="points-cell">${team.points}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Right column: positions 8-14 -->
                    <div class="col-md-6">
                        <table class="table table-striped standings-table">
                            <thead>
                                <tr>
                                    <th class="position-header">#</th>
                                    <th>Team</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">W</th>
                                    <th class="stats-header">G</th>
                                    <th class="stats-header">V</th>
                                    <th class="stats-header">+/-</th>
                                    <th class="position-header">P</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rightStandings.map(team => {
                                    const teamName = team.team || team.name;
                                    const isFeatured = featuredTeamName && (teamName.includes(featuredTeamName) || featuredTeamName.includes(teamName));
                                    return `
                                    <tr${isFeatured ? ' class="featured-team-row"' : ''}>
                                        <td class="position-cell">${team.position}</td>
                                        <td class="team-name-cell">${getTeamNameWithLogo(teamName)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.played || team.matches || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.wins || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.draws || team.ties || 0)}</td>
                                        <td class="stats-cell">${formatTwoDigits(team.losses || 0)}</td>
                                        <td class="stats-cell">${formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0)}</td>
                                        <td class="points-cell">${team.points}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    const container = document.getElementById('slide-container');
    if (container) {
        container.appendChild(slide);
        updateTotalSlides();
    } else {
    }
}

function addLastWeekResultsSlide(results) {
    const slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Get only the last 7 played matches
    const last7Results = results
        .filter(result => result.status === 'Gespeeld' || result.status === 'Uitgespeeld' || (result.homeGoals !== undefined && result.awayGoals !== undefined))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7);
    
    const weeklyResults = groupResultsByWeek(last7Results);
    
    const hasResults = Object.keys(weeklyResults).length > 0;
    
    if (isMobile) {
        // Mobile layout: Compact cards with smaller fonts
        slide.innerHTML = `
            <div class="mobile-matches-container">
                <h2 class="mobile-header">
                    Recente Uitslagen
                </h2>
                <div>
                    ${hasResults ? Object.entries(weeklyResults)
                        .sort(([weekA], [weekB]) => weekB.localeCompare(weekA)) // Most recent week first
                        .map(([weekLabel, weekResults]) => `
                        <div style="margin-bottom: 15px;">
                            <h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 8px; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 4px; text-align: center;">
                                ${weekLabel}
                            </h3>
                            ${weekResults.map(result => {
                                const isFeaturedMatch = isFeaturedTeamMatch(result);
                                const homeGoals = result.homeGoals || result.homescore || 0;
                                const awayGoals = result.awayGoals || result.awayscore || 0;
                                const home = result.home || result.hometeam || 'Team A';
                                const away = result.away || result.awayteam || 'Team B';
                                const matchDate = new Date(result.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                                
                                return `
                                <div class="mobile-match-item played ${isFeaturedMatch ? 'featured' : ''}" style="${isFeaturedMatch ? 'border-left-color: #ffd700 !important; background-color: rgba(255, 215, 0, 0.2) !important;' : ''}">
                                    <div class="mobile-match-teams">
                                        <div class="mobile-team home ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                        <div class="mobile-score">${homeGoals} - ${awayGoals}</div>
                                        <div class="mobile-team away ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(away)}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        `).join('') : `
                        <div class="col-12 text-center">
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px;">
                                <h3 style="color: #666; font-size: 1.2rem;">Geen wedstrijduitslagen</h3>
                                <p style="color: #888; font-size: 1.0rem;">Er zijn nog geen wedstrijden gespeeld</p>
                            </div>
                        </div>`}
                </div>
            </div>
        `;
    } else {
        // Desktop layout: Original large format
        slide.innerHTML = `
            <div>
                <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                    Recente Wedstrijduitslagen
                </h2>
                <div class="row">
                    ${hasResults ? Object.entries(weeklyResults)
                        .sort(([weekA], [weekB]) => weekB.localeCompare(weekA)) // Most recent week first
                        .map(([weekLabel, weekResults]) => `
                        <div class="col-12 mb-4">
                            <h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 0.5rem; text-align: center;">
                                ${weekLabel}
                            </h3>
                            <div class="row">
                                ${weekResults.map(result => {
                                    const isFeaturedMatch = isFeaturedTeamMatch(result);
                                    const homeGoals = result.homeGoals || result.homescore || 0;
                                    const awayGoals = result.awayGoals || result.awayscore || 0;
                                    const home = result.home || result.hometeam || 'Team A';
                                    const away = result.away || result.awayteam || 'Team B';
                                    return `
                                    <div class="col-12">
                                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                            <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 0.5fr 2fr 0.5fr; align-items: center;">
                                                <div></div>
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                                <div style="text-align: center; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${homeGoals} - ${awayGoals}</div>
                                                <div></div>
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(away)}</div>
                                                <div></div>
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('') : `
                    <div class="col-12 text-center">
                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">
                            <h3 style="color: #666; font-size: 1.8rem;">Geen wedstrijduitslagen beschikbaar</h3>
                            <p style="color: #888; font-size: 1.2rem;">Data wordt geladen of er zijn nog geen wedstrijden gespeeld dit seizoen</p>
                        </div>
                    </div>`}
                </div>
            </div>
        `;
    }
    
    const container = document.getElementById('slide-container');
    if (container) {
        container.appendChild(slide);
        updateTotalSlides();
    } else {
    }
}

function addOverigeApeldoornseClubsSlide() {
    var slide = document.createElement('div');
    slide.className = 'slide-item';

    // Load data from the API endpoint
    fetch('/api/overige-apeldoornse-clubs')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            var results = data.results || [];

            // Filter results based on current day of week
            var today = new Date();
            var dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
            var startDate = new Date();

            if (dayOfWeek === 0) { // Sunday: show Sunday to Saturday
                startDate.setDate(today.getDate() - 1); // Yesterday (Saturday)
            } else if (dayOfWeek === 6) { // Saturday: show Saturday to Sunday
                startDate.setDate(today.getDate() - 6); // Sunday of previous week
            } else { // Monday-Friday: show Saturday to today
                var daysToSaturday = dayOfWeek + 1; // Days back to last Saturday
                startDate.setDate(today.getDate() - daysToSaturday);
            }

            // Reset startDate to beginning of day (00:00:00)
            startDate.setHours(0, 0, 0, 0);

            var filteredResults = results.filter(function(result) {
                if (!result.date) return false;
                var matchDate = new Date(result.date);
                var endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999); // Include all of today
                return matchDate >= startDate && matchDate <= endDate;
            });

            // Group filtered results by week
            var weeklyResults = groupOverigeResultsByWeek(filteredResults);
            var hasResults = Object.keys(weeklyResults).length > 0;

            // Group results by date for two-column layout
            var resultsByDate = {};

            if (hasResults) {
                filteredResults.forEach(function(result) {
                    var matchDate = new Date(result.date);
                    var dateLabel = matchDate.toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit'
                    });

                    if (!resultsByDate[dateLabel]) {
                        resultsByDate[dateLabel] = {
                            date: matchDate,
                            matches: []
                        };
                    }
                    resultsByDate[dateLabel].matches.push(result);
                });
            }

            if (isMobile) {
                // Mobile layout: Single column (like Columbia mobile)
                slide.innerHTML =
                    '<div class="mobile-matches-container">' +
                        '<h2 class="mobile-header">' +
                            'Apeldoornse Clubs' +
                        '</h2>' +
                        '<div>' +
                            (hasResults ? Object.entries(resultsByDate)
                                .sort(function(a, b) { return b[1].date - a[1].date; }) // Most recent first
                                .map(function(dateEntry) {
                                    var dateLabel = dateEntry[0];
                                    var dateMatches = dateEntry[1].matches;
                                    return dateMatches.map(function(result) {
                                        var homeGoals = result.homeGoals || result.homescore || 0;
                                        var awayGoals = result.awayGoals || result.awayscore || 0;
                                        var home = result.home || result.hometeam || 'Team A';
                                        var away = result.away || result.awayteam || 'Team B';

                                        return '<div class="mobile-match-item played">' +
                                            '<div class="mobile-match-teams">' +
                                                '<div class="mobile-team home">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                '<div class="mobile-score">' + homeGoals + ' - ' + awayGoals + '</div>' +
                                                '<div class="mobile-team away">' + getOverigeTeamNameWithLogo(away) + '</div>' +
                                            '</div>' +
                                        '</div>';
                                    }).join('');
                                }).join('') :
                                '<div class="col-12 text-center">' +
                                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px;">' +
                                        '<h3 style="color: #666; font-size: 1.2rem;">Geen uitslagen beschikbaar</h3>' +
                                        '<p style="color: #888; font-size: 1.0rem;">Er zijn nog geen wedstrijden gespeeld</p>' +
                                    '</div>' +
                                '</div>') +
                        '</div>' +
                    '</div>';
            } else {
                // Desktop layout: Two columns (Left: Zaterdag + andere dagen, Right: Zondag)
                var saturdayAndOtherMatches = [];
                var sundayMatches = [];

                Object.entries(resultsByDate).forEach(function(dateEntry) {
                    var dateLabel = dateEntry[0];
                    var dateData = dateEntry[1];
                    var dateMatches = dateData.matches;
                    var dayOfWeek = dateData.date.getDay(); // 0 = Sunday, 6 = Saturday

                    if (dayOfWeek === 0) { // Sunday
                        sundayMatches.push({ label: dateLabel, matches: dateMatches });
                    } else { // Saturday and all other days
                        saturdayAndOtherMatches.push({ label: dateLabel, matches: dateMatches });
                    }
                });

                // Sort both columns by date (most recent first)
                saturdayAndOtherMatches.sort(function(a, b) {
                    return new Date(b.label.split(' ')[1] + '/' + b.label.split(' ')[2]) -
                           new Date(a.label.split(' ')[1] + '/' + a.label.split(' ')[2]);
                });
                sundayMatches.sort(function(a, b) {
                    return new Date(b.label.split(' ')[1] + '/' + b.label.split(' ')[2]) -
                           new Date(a.label.split(' ')[1] + '/' + a.label.split(' ')[2]);
                });

                slide.innerHTML =
                    '<div style="height: calc(100vh - 120px); overflow-y: auto; overflow-x: hidden;">' +
                        '<h2 style="font-size: 3.25rem; font-weight: bold; margin-bottom: 1rem; color: #333; text-align: center;">' +
                            'Apeldoornse Clubs Uitslagen' +
                        '</h2>' +
                        '<div class="row">' +
                            '<div class="col-md-6">' +
                                '<h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">ZATERDAG + OVERIGE</h3>' +
                                (saturdayAndOtherMatches.length > 0 ?
                                    saturdayAndOtherMatches.map(function(dateGroup) {
                                        return dateGroup.matches.map(function(result) {
                                            var homeGoals = result.homeGoals || result.homescore || 0;
                                            var awayGoals = result.awayGoals || result.awayscore || 0;
                                            var home = result.home || result.hometeam || 'Team A';
                                            var away = result.away || result.awayteam || 'Team B';

                                            return '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-left: 3px solid #0066cc;">' +
                                                '<div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">' +
                                                    '<div style="flex: 4; text-align: left;">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                    '<div style="flex: 1; text-align: center; color: #0066cc;">' + homeGoals + ' - ' + awayGoals + '</div>' +
                                                    '<div style="flex: 4; text-align: right;">' + getOverigeTeamNameWithLogoAfter(away) + '</div>' +
                                                '</div>' +
                                            '</div>';
                                        }).join('');
                                    }).join('') :
                                    '<div style="text-align: center; color: #666; font-size: 1.2rem; margin-top: 20px;">Geen uitslagen</div>') +
                            '</div>' +
                            '<div class="col-md-6">' +
                                '<h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">ZONDAG</h3>' +
                                (sundayMatches.length > 0 ?
                                    sundayMatches.map(function(dateGroup) {
                                        return dateGroup.matches.map(function(result) {
                                            var homeGoals = result.homeGoals || result.homescore || 0;
                                            var awayGoals = result.awayGoals || result.awayscore || 0;
                                            var home = result.home || result.hometeam || 'Team A';
                                            var away = result.away || result.awayteam || 'Team B';

                                            return '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-right: 3px solid #0066cc;">' +
                                                '<div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">' +
                                                    '<div style="flex: 4; text-align: left;">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                    '<div style="flex: 1; text-align: center; color: #0066cc;">' + homeGoals + ' - ' + awayGoals + '</div>' +
                                                    '<div style="flex: 4; text-align: right;">' + getOverigeTeamNameWithLogoAfter(away) + '</div>' +
                                                '</div>' +
                                            '</div>';
                                        }).join('');
                                    }).join('') :
                                    '<div style="text-align: center; color: #666; font-size: 1.2rem; margin-top: 20px;">Geen uitslagen</div>') +
                            '</div>' +
                        '</div>' +
                    '</div>';
            }

            var container = document.getElementById('slide-container');
            if (container) {
                container.appendChild(slide);
            updateTotalSlides();
        updateTotalSlides();
            }
        })
        .catch(function(error) {
            console.error('Error loading Apeldoornse clubs upcoming data:', error);

            // Show error slide
            slide.innerHTML =
                '<div class="col-12 text-center">' +
                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">' +
                        '<h3 style="color: #666; font-size: 1.8rem;">Fout bij laden data</h3>' +
                        '<p style="color: #888; font-size: 1.2rem;">Kon de gegevens niet laden</p>' +
                    '</div>' +
                '</div>';

            var container = document.getElementById('slide-container');
            if (container) {
                container.appendChild(slide);
            updateTotalSlides();
        updateTotalSlides();
            }
        });
}

function groupOverigeResultsByWeek(results) {
    var weeklyResults = {};

    results.forEach(function(result) {
        if (!result.date) {
            return;
        }

        var matchDate = new Date(result.date);
        var year = matchDate.getFullYear();
        var weekNumber = getWeekNumber(matchDate);
        var weekLabel = 'Week ' + weekNumber + ' (' + year + ')';

        if (!weeklyResults[weekLabel]) {
            weeklyResults[weekLabel] = [];
        }

        weeklyResults[weekLabel].push(result);
    });

    // Sort matches within each week by date (most recent first)
    Object.keys(weeklyResults).forEach(function(week) {
        weeklyResults[week].sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        });
    });

    return weeklyResults;
}

function getOverigeTeamNameWithLogo(teamName) {
    if (!teamName) return '';

    // Mapping van clubnamen naar logo bestanden
    var logoMapping = {
        'Albatross': 'albatross.gif',
        'TKA': 'tka.gif',
        'WSV': 'wsv.gif',
        'Victoria Boys': 'victoriaboys.gif',
        'Loenermark': 'loenermark.gif',
        'Robur et Velocitas': 'roburetvelocitas.gif',
        'Brummen SP': 'brummensp.gif',
        'Apeldoornse Boys': 'apeldoorncsv.gif',
        'Apeldoorn CSV': 'apeldoorncsv.gif',
        'Voorst': 'voorst.gif',
        'CCW 16': 'ccw16.gif',
        'WWNA': 'wwna.gif',
        'Orderbos': 'orderbos.gif',
        'Oeken': 'oeken.gif',
        'Alexandria': 'Alexandria.gif',
        'VIOS/V': 'viosv.gif',
        'ZVV \'56': 'zvv56.gif'
    };

    var logoFile = logoMapping[teamName];
    var logoUrl;

    if (logoFile) {
        logoUrl = '/static/images/overige/' + logoFile;
    } else {
        // Fallback naar default_team.png als er geen specifiek logo is
        logoUrl = '/static/images/team_logos/default_team.png';
    }

    return '<img src="' + logoUrl + '" class="team-logo" alt="' + teamName + '" onerror="this.src=\'/static/images/team_logos/default_team.png\'">' + ' ' + teamName;
}

function getOverigeTeamNameWithLogoAfter(teamName) {
    if (!teamName) return '';

    // Mapping van clubnamen naar logo bestanden
    var logoMapping = {
        'Albatross': 'albatross.gif',
        'TKA': 'tka.gif',
        'WSV': 'wsv.gif',
        'Victoria Boys': 'victoriaboys.gif',
        'Loenermark': 'loenermark.gif',
        'Robur et Velocitas': 'roburetvelocitas.gif',
        'Brummen SP': 'brummensp.gif',
        'Apeldoornse Boys': 'apeldoorncsv.gif',
        'Apeldoorn CSV': 'apeldoorncsv.gif',
        'Voorst': 'voorst.gif',
        'CCW 16': 'ccw16.gif',
        'WWNA': 'wwna.gif',
        'Orderbos': 'orderbos.gif',
        'Oeken': 'oeken.gif',
        'Alexandria': 'Alexandria.gif',
        'VIOS/V': 'viosv.gif',
        'ZVV \'56': 'zvv56.gif'
    };

    var logoFile = logoMapping[teamName];
    var logoUrl;

    if (logoFile) {
        logoUrl = '/static/images/overige/' + logoFile;
    } else {
        // Fallback naar default_team.png als er geen specifiek logo is
        logoUrl = '/static/images/team_logos/default_team.png';
    }

    return teamName + ' ' + '<img src="' + logoUrl + '" class="team-logo" alt="' + teamName + '" onerror="this.src=\'/static/images/team_logos/default_team.png\'">';
}

function addOverigeApeldoornseClubsKomendeWedstrijdenSlide() {
    var slide = document.createElement('div');
    slide.className = 'slide-item';

    // Load data from main API endpoint and extract working_scraper data
    fetch('/api/data')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            // Extract the working_scraper upcoming matches data
            var matches = data.apeldoornse_clubs_upcoming || [];

            // Filter matches: vandaag (nog niet afgelopen) t/m 6 dagen vooruit
            var now = new Date();
            var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 6 dagen vooruit vanaf vandaag
            var sixDaysFromNow = new Date(todayStart);
            sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
            sixDaysFromNow.setHours(23, 59, 59, 999); // End of day

            var filteredMatches = matches.filter(function(match) {
                if (!match.date) return false;

                var matchDate = new Date(match.date);
                var matchTime = match.time || '';

                // Voor wedstrijden van vandaag, check of ze nog niet afgelopen zijn (wedstrijdtijd + 2 uur)
                if (matchDate.toDateString() === todayStart.toDateString()) {
                    if (matchTime) {
                        var timeParts = matchTime.split(':');
                        var matchDateTime = new Date(matchDate);
                        matchDateTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));

                        // Add 2 hours to match start time
                        var matchEndTime = new Date(matchDateTime.getTime() + (2 * 60 * 60 * 1000));

                        // Only show if match hasn't ended yet
                        if (now >= matchEndTime) {
                            return false;
                        }
                    }
                }

                // Show matches from today through 6 days from now
                return matchDate >= todayStart && matchDate <= sixDaysFromNow;
            });

            // Group filtered matches by date
            var matchesByDate = {};
            filteredMatches.forEach(function(match) {
                if (!match.date) return;

                var matchDate = new Date(match.date);
                var dateKey = matchDate.toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                });

                if (!matchesByDate[dateKey]) {
                    matchesByDate[dateKey] = [];
                }
                matchesByDate[dateKey].push(match);
            });

            var hasMatches = Object.keys(matchesByDate).length > 0;

            if (isMobile) {
                // Mobile layout
                slide.innerHTML =
                    '<div class="mobile-matches-container">' +
                        '<h2 class="mobile-header">' +
                            'Apeldoornse Clubs' +
                        '</h2>' +
                        '<div>' +
                            (hasMatches ? Object.entries(matchesByDate)
                                .sort(function(a, b) {
                                    var dateA = new Date(a[1][0].date);
                                    var dateB = new Date(b[1][0].date);
                                    return dateA - dateB;
                                })
                                .map(function(dateEntry) {
                                    var dateLabel = dateEntry[0];
                                    var dateMatches = dateEntry[1];
                                    return '<div style="margin-bottom: 15px;">' +
                                        '<h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 8px; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 4px; text-align: center;">' +
                                            dateLabel +
                                        '</h3>' +
                                        dateMatches.map(function(match) {
                                            var home = match.home || 'Team A';
                                            var away = match.away || 'Team B';
                                            var time = match.time || '';

                                            return '<div class="mobile-match-item upcoming">' +
                                                '<div class="mobile-match-teams">' +
                                                    '<div class="mobile-team home">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                    '<div class="mobile-vs">vs</div>' +
                                                    '<div class="mobile-team away">' + getOverigeTeamNameWithLogo(away) + '</div>' +
                                                '</div>' +
                                            '</div>';
                                        }).join('') +
                                    '</div>';
                                }).join('') :
                                '<div class="col-12 text-center">' +
                                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px;">' +
                                        '<h3 style="color: #666; font-size: 1.2rem;">Geen komende wedstrijden beschikbaar</h3>' +
                                        '<p style="color: #888; font-size: 1.0rem;">Er zijn geen geplande wedstrijden gevonden</p>' +
                                    '</div>' +
                                '</div>') +
                        '</div>' +
                    '</div>';
            } else {
                // Desktop layout: Two columns (Left: Zaterdag + andere dagen, Right: Zondag)

                // Separate matches by day of week
                var saturdayAndOtherMatches = [];
                var sundayMatches = [];

                Object.entries(matchesByDate).forEach(function(dateEntry) {
                    var dateLabel = dateEntry[0];
                    var dateMatches = dateEntry[1];
                    var firstMatchDate = new Date(dateMatches[0].date);
                    var dayOfWeek = firstMatchDate.getDay(); // 0 = Sunday, 6 = Saturday

                    if (dayOfWeek === 0) { // Sunday
                        sundayMatches.push({ label: dateLabel, matches: dateMatches });
                    } else { // Saturday and all other days
                        saturdayAndOtherMatches.push({ label: dateLabel, matches: dateMatches });
                    }
                });

                // Sort by date within each column
                saturdayAndOtherMatches.sort(function(a, b) {
                    return new Date(a.matches[0].date) - new Date(b.matches[0].date);
                });
                sundayMatches.sort(function(a, b) {
                    return new Date(a.matches[0].date) - new Date(b.matches[0].date);
                });

                slide.innerHTML =
                    '<div>' +
                        '<h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">' +
                            'Apeldoornse Clubs - Komende Wedstrijden' +
                        '</h2>' +
                        '<div class="row">' +
                            // Left column: Saturday and other days
                            '<div class="col-md-6">' +
                                '<h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">ZATERDAG & ANDERE DAGEN</h3>' +
                                (saturdayAndOtherMatches.length > 0 ?
                                    saturdayAndOtherMatches.map(function(dayGroup) {
                                        return '<div style="margin-bottom: 1.5rem;">' +
                                            '<h4 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 0.8rem; color: #0066cc; text-align: center; border-bottom: 1px solid #0066cc; padding-bottom: 0.3rem;">' +
                                                dayGroup.label +
                                            '</h4>' +
                                            dayGroup.matches.map(function(match) {
                                                var home = match.home || 'Team A';
                                                var away = match.away || 'Team B';
                                                var time = match.time || '';
                                                return '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px;">' +
                                                    '<div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">' +
                                                        '<div style="flex: 4; text-align: left;">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                        '<div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">' + time + '</div>' +
                                                        '<div style="flex: 4; text-align: right;">' + getOverigeTeamNameWithLogoAfter(away) + '</div>' +
                                                    '</div>' +
                                                '</div>';
                                            }).join('') +
                                        '</div>';
                                    }).join('') :
                                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px; text-align: center;">' +
                                        '<p style="color: #666; font-size: 1.2rem;">Geen wedstrijden</p>' +
                                    '</div>'
                                ) +
                            '</div>' +

                            // Right column: Sunday
                            '<div class="col-md-6">' +
                                '<h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">ZONDAG</h3>' +
                                (sundayMatches.length > 0 ?
                                    sundayMatches.map(function(dayGroup) {
                                        return '<div style="margin-bottom: 1.5rem;">' +
                                            '<h4 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 0.8rem; color: #0066cc; text-align: center; border-bottom: 1px solid #0066cc; padding-bottom: 0.3rem;">' +
                                                dayGroup.label +
                                            '</h4>' +
                                            dayGroup.matches.map(function(match) {
                                                var home = match.home || 'Team A';
                                                var away = match.away || 'Team B';
                                                var time = match.time || '';
                                                return '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px;">' +
                                                    '<div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">' +
                                                        '<div style="flex: 4; text-align: left;">' + getOverigeTeamNameWithLogo(home) + '</div>' +
                                                        '<div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">' + time + '</div>' +
                                                        '<div style="flex: 4; text-align: right;">' + getOverigeTeamNameWithLogoAfter(away) + '</div>' +
                                                    '</div>' +
                                                '</div>';
                                            }).join('') +
                                        '</div>';
                                    }).join('') :
                                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px; text-align: center;">' +
                                        '<p style="color: #666; font-size: 1.2rem;">Geen wedstrijden</p>' +
                                    '</div>'
                                ) +
                            '</div>' +
                        '</div>' +
                    '</div>';
            }

            var container = document.getElementById('slide-container');
            if (container) {
                container.appendChild(slide);
            updateTotalSlides();
        updateTotalSlides();
            }
        })
        .catch(function(error) {
            console.error('Error loading komende wedstrijden data:', error);

            // Show error slide
            slide.innerHTML =
                '<div class="col-12 text-center">' +
                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">' +
                        '<h3 style="color: #d9534f; font-size: 1.8rem;">Fout bij laden van komende wedstrijden</h3>' +
                        '<p style="color: #888; font-size: 1.2rem;">Probeer later opnieuw</p>' +
                    '</div>' +
                '</div>';

            var container = document.getElementById('slide-container');
            if (container) {
                container.appendChild(slide);
            updateTotalSlides();
        updateTotalSlides();
            }
        });
}

function groupResultsByWeek(results) {
    const weeklyResults = {};
    
    
    results.forEach((result, index) => {
        
        if (!result.date) {
            return;
        }
        
        const matchDate = new Date(result.date);
        
        const year = matchDate.getFullYear();
        const weekNumber = getWeekNumber(matchDate);
        const weekLabel = `Week ${weekNumber} (${year})`;
        
        if (!weeklyResults[weekLabel]) {
            weeklyResults[weekLabel] = [];
        }
        
        weeklyResults[weekLabel].push(result);
    });
    
    // Sort matches within each week: featured team matches first, then by date
    Object.keys(weeklyResults).forEach(week => {
        weeklyResults[week].sort((a, b) => {
            const aIsFeatured = isFeaturedTeamMatch(a);
            const bIsFeatured = isFeaturedTeamMatch(b);
            
            // Featured matches first
            if (aIsFeatured && !bIsFeatured) return -1;
            if (!aIsFeatured && bIsFeatured) return 1;
            
            // Then by date (most recent first)
            return new Date(b.date) - new Date(a.date);
        });
    });
    
    return weeklyResults;
}

function isFeaturedTeamMatch(match) {
    if (!featuredTeamName) return false;
    
    const home = match.home || match.hometeam || '';
    const away = match.away || match.awayteam || '';
    
    return home.includes(featuredTeamName) || away.includes(featuredTeamName) || 
           featuredTeamName.includes(home) || featuredTeamName.includes(away);
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function groupUpcomingMatchesByWeek(matches) {
    const weeklyMatches = {};
    
    
    if (!matches || matches.length === 0) {
        return weeklyMatches;
    }
    
    matches.forEach((match, index) => {
        
        if (!match.date) {
            return;
        }
        
        const matchDate = new Date(match.date);
        
        const year = matchDate.getFullYear();
        const weekNumber = getWeekNumber(matchDate);
        const weekLabel = `Week ${weekNumber} (${year})`;
        
        if (!weeklyMatches[weekLabel]) {
            weeklyMatches[weekLabel] = [];
        }
        
        weeklyMatches[weekLabel].push(match);
    });
    
    // Sort matches within each week: featured team matches first, then by date
    Object.keys(weeklyMatches).forEach(week => {
        weeklyMatches[week].sort((a, b) => {
            const aIsFeatured = isFeaturedTeamMatch(a);
            const bIsFeatured = isFeaturedTeamMatch(b);
            
            // Featured matches first
            if (aIsFeatured && !bIsFeatured) return -1;
            if (!aIsFeatured && bIsFeatured) return 1;
            
            // Then by date (earliest first for upcoming matches)
            return new Date(a.date) - new Date(b.date);
        });
    });
    
    return weeklyMatches;
}

function addNextWeekMatchesSlide(matches) {
    const slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Group matches by week (similar to results)
    const weeklyMatches = groupUpcomingMatchesByWeek(matches);
    
    const hasMatches = Object.keys(weeklyMatches).length > 0;
    
    if (isMobile) {
        // Mobile layout: Compact cards with smaller fonts
        slide.innerHTML = `
            <div class="mobile-matches-container">
                <h2 class="mobile-header">
                    Wedstrijden
                </h2>
                <div>
                    ${hasMatches ? Object.entries(weeklyMatches)
                        .sort(([weekA], [weekB]) => weekA.localeCompare(weekB)) // Earliest week first
                        .map(([weekLabel, weekMatches]) => `
                        <div style="margin-bottom: 15px;">
                            <h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 8px; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 4px; text-align: center;">
                                ${weekLabel}
                            </h3>
                            ${weekMatches.map(match => {
                                const isFeaturedMatch = isFeaturedTeamMatch(match);
                                const home = match.home || match.hometeam || 'Team A';
                                const away = match.away || match.awayteam || 'Team B';
                                
                                // Format date as DD-MM and extract time
                                const matchDateTime = new Date(match.date);
                                const matchDate = matchDateTime.toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                                const matchTime = matchDateTime.toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
                                
                                return `
                                <div class="mobile-match-item upcoming ${isFeaturedMatch ? 'featured' : ''}" style="${isFeaturedMatch ? 'border-left-color: #ffd700 !important; background-color: rgba(255, 215, 0, 0.2) !important;' : ''}">
                                    <div class="mobile-match-teams">
                                        <div class="mobile-team home ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                        <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<br>${matchTime}</div>
                                        <div class="mobile-team away ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(away)}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        `).join('') : `
                        <div class="col-12 text-center">
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin: 15px;">
                                <h3 style="color: #666; font-size: 1.2rem;">Geen komende wedstrijden</h3>
                                <p style="color: #888; font-size: 1.0rem;">Programma wordt nog bekendgemaakt</p>
                            </div>
                        </div>`}
                </div>
            </div>
        `;
    } else {
        // Desktop layout: Original large format
        slide.innerHTML = `
            <div>
                <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                    Komende Wedstrijden
                </h2>
                <div class="row">
                    ${hasMatches ? Object.entries(weeklyMatches)
                        .sort(([weekA], [weekB]) => weekA.localeCompare(weekB)) // Earliest week first
                        .map(([weekLabel, weekMatches]) => `
                        <div class="col-12 mb-4">
                            <h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 0.5rem; text-align: center;">
                                ${weekLabel}
                            </h3>
                            <div class="row">
                                ${weekMatches.map(match => {
                                    const isFeaturedMatch = isFeaturedTeamMatch(match);
                                    const home = match.home || match.hometeam || 'Team A';
                                    const away = match.away || match.awayteam || 'Team B';
                                    
                                    // Format date as DD-MM and extract time
                                    const matchDateTime = new Date(match.date);
                                    const matchDate = matchDateTime.toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                                    const matchTime = matchDateTime.toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
                                    
                                    return `
                                    <div class="col-12">
                                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                            <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 0.5fr 2fr 0.5fr; align-items: center;">
                                                <div></div>
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                                <div style="text-align: center;">
                                                    <div style="font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}; line-height: 1;">${matchDate}</div>
                                                    <div style="font-size: 1.4rem; font-weight: 600; color: ${isFeaturedMatch ? '#333' : '#666'}; line-height: 1;">${matchTime}</div>
                                                </div>
                                                <div></div>
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(away)}</div>
                                                <div></div>
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('') : `
                    <div class="col-12 text-center">
                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">
                            <h3 style="color: #666; font-size: 1.8rem;">Geen komende wedstrijden beschikbaar</h3>
                            <p style="color: #888; font-size: 1.2rem;">Programma wordt nog bekendgemaakt</p>
                        </div>
                    </div>`}
                </div>
            </div>
        `;
    }
    
    const container = document.getElementById('slide-container');
    if (container) {
        container.appendChild(slide);
        updateTotalSlides();
    } else {
    }
}

function addFeaturedMatchesSlide(matches) {
    const slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Combine all matches and separate into played and upcoming
    const allMatches = [
        ...(matches.played || []),
        ...(matches.upcoming || [])
    ];
    
    // Separate played and upcoming matches using detailed status check
    const playedMatches = allMatches.filter(match => {
        const matchStatus = match.status || match.matchStatus || '';
        return matchStatus === 'Gespeeld' ||
               matchStatus === 'Uitgespeeld' ||
               matchStatus === 'played' ||
               matchStatus === 'Afgelopen' ||
               matchStatus === 'Finished' ||
               matchStatus === 'Final' ||
               (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest played first
    
    const upcomingMatches = allMatches.filter(match => {
        const matchStatus = match.status || match.matchStatus || '';
        return !(matchStatus === 'Gespeeld' ||
                matchStatus === 'Uitgespeeld' ||
                matchStatus === 'played' ||
                matchStatus === 'Afgelopen' ||
                matchStatus === 'Finished' ||
                matchStatus === 'Final' ||
                (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                 !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals))));
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Earliest upcoming first
    
    // Combine: played first, then upcoming
    const sortedMatches = [...playedMatches, ...upcomingMatches];
    
    if (isMobile) {
        // Mobile layout: Single column with compact match items
        slide.innerHTML = `
            <div class="mobile-matches-container">
                <h2 class="mobile-header">
                    ${getTeamNameWithLogo(featuredTeamName)}
                </h2>
                <div>
                    ${sortedMatches.map(match => {
                        const home = match.home || match.hometeam || '';
                        const away = match.away || match.awayteam || '';
                        const isHomeMatch = home.includes(featuredTeamName) || featuredTeamName.includes(home);
                        const opponent = isHomeMatch ? away : home;
                        const matchStatus = match.status || match.matchStatus || '';
                        
                        // Check if match is played
                        const isPlayed = matchStatus === 'Gespeeld' ||
                                       matchStatus === 'Uitgespeeld' ||
                                       matchStatus === 'played' ||
                                       matchStatus === 'Afgelopen' ||
                                       matchStatus === 'Finished' ||
                                       matchStatus === 'Final' ||
                                       (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                                        !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
                        
                        if (isPlayed) {
                            const homeGoals = match.homeGoals || match.homescore || 0;
                            const awayGoals = match.awayGoals || match.awayscore || 0;
                            const ourScore = isHomeMatch ? homeGoals : awayGoals;
                            const opponentScore = isHomeMatch ? awayGoals : homeGoals;
                            
                            return `
                            <div class="mobile-match-item played">
                                <div class="mobile-match-teams">
                                    ${isHomeMatch ?
                                        `<div class="mobile-team home featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                         <div class="mobile-score">${ourScore} - ${opponentScore}</div>
                                         <div class="mobile-team away">${getTeamNameWithLogoLarge(opponent)}</div>` :
                                        `<div class="mobile-team home">${getTeamNameWithLogoLarge(opponent)}</div>
                                         <div class="mobile-score">${opponentScore} - ${ourScore}</div>
                                         <div class="mobile-team away featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>`
                                    }
                                </div>
                            </div>`;
                        } else {
                            const matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                            const matchTime = new Date(match.date).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
                            
                            return `
                            <div class="mobile-match-item upcoming">
                                <div class="mobile-match-teams">
                                    ${isHomeMatch ?
                                        `<div class="mobile-team home featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                         <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<span style="margin-left: 3px;">${matchTime}</span></div>
                                         <div class="mobile-team away">${getTeamNameWithLogoLarge(opponent)}</div>` :
                                        `<div class="mobile-team home">${getTeamNameWithLogoLarge(opponent)}</div>
                                         <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<span style="margin-left: 3px;">${matchTime}</span></div>
                                         <div class="mobile-team away featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>`
                                    }
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        // Desktop layout: Two columns (existing code)
        slide.innerHTML = `
            <div style="height: calc(100vh - 120px); overflow-y: auto; overflow-x: hidden;">
                <h2 style="font-size: 3.25rem; font-weight: bold; margin-bottom: 1rem; color: #333; text-align: center;">
                    ${featuredTeamName} Wedstrijden
                </h2>
                <div class="row">
                    <div class="col-md-6">
                    <h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">THUIS</h3>
                    ${sortedMatches.filter(match => {
                        const home = match.home || match.hometeam || '';
                        return home.includes(featuredTeamName) || featuredTeamName.includes(home);
                    }).map(match => {
                        const away = match.away || match.awayteam || 'Team';
                        const matchStatus = match.status || match.matchStatus || '';
                        
                        // Check if match is played based on status field
                        const isPlayed = matchStatus === 'Gespeeld' ||
                                       matchStatus === 'Uitgespeeld' ||
                                       matchStatus === 'played' ||
                                       matchStatus === 'Afgelopen' ||
                                       matchStatus === 'Finished' ||
                                       matchStatus === 'Final' ||
                                       (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                                        !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
                        
                        
                        if (isPlayed) {
                            const homeGoals = match.homeGoals || match.homescore || 0;
                            const awayGoals = match.awayGoals || match.awayscore || 0;
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-left: 3px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc;">${homeGoals} - ${awayGoals}</div>
                                    <div style="flex: 4; text-align: right;">${getTeamNameWithLogoLargeAfter(away)}</div>
                                </div>
                            </div>`;
                        } else {
                            const matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-left: 3px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">${matchDate}</div>
                                    <div style="flex: 4; text-align: right;">${getTeamNameWithLogoLargeAfter(away)}</div>
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
                <div class="col-md-6">
                    <h3 style="font-size: 2.6rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">UIT</h3>
                    ${sortedMatches.filter(match => {
                        const away = match.away || match.awayteam || '';
                        return away.includes(featuredTeamName) || featuredTeamName.includes(away);
                    }).map(match => {
                        const home = match.home || match.hometeam || 'Team';
                        const matchStatus = match.status || match.matchStatus || '';
                        
                        // Check if match is played based on status field
                        const isPlayed = matchStatus === 'Gespeeld' ||
                                       matchStatus === 'Uitgespeeld' ||
                                       matchStatus === 'played' ||
                                       matchStatus === 'Afgelopen' ||
                                       matchStatus === 'Finished' ||
                                       matchStatus === 'Final' ||
                                       (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                                        !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
                        
                        
                        if (isPlayed) {
                            const homeGoals = match.homeGoals || match.homescore || 0;
                            const awayGoals = match.awayGoals || match.awayscore || 0;
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-right: 3px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${getTeamNameWithLogoLarge(home)}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc;">${homeGoals} - ${awayGoals}</div>
                                    <div style="flex: 4; text-align: right;">${getTeamNameWithLogoLargeAfter(featuredTeamName)}</div>
                                </div>
                            </div>`;
                        } else {
                            const matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 3px 10px; margin-bottom: 2px; border-right: 3px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.56rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${getTeamNameWithLogoLarge(home)}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">${matchDate}</div>
                                    <div style="flex: 4; text-align: right;">${getTeamNameWithLogoLargeAfter(featuredTeamName)}</div>
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
            </div>
        </div>
        `;
    }
    
    const container = document.getElementById('slide-container');
    if (container) {
        container.appendChild(slide);
        updateTotalSlides();
    } else {
    }
}


// Initialize slideshow
function initializeCarousel() {
    var slideContainer = document.getElementById('slide-container');
    if (!slideContainer) {
        return;
    }

    var slides = slideContainer.querySelectorAll('.slide-item');
    totalSlides = slides.length;
    
    
    // Set first slide as active
    if (slides.length > 0) {
        for (var i = 0; i < slides.length; i++) {
            slides[i].classList.remove('active');
        }
        slides[0].classList.add('active');
    }
    
    carouselInitialized = true;
    currentSlideIndex = 0;
    slidesInCurrentCycle = 0;
    logoMode = 'team'; // Start with team logos

    updateScreenNumber();
    startCountdown();

    // Initialize first CLUB1919 animation on page load
    if (!isMobile) {
        setTimeout(updateClub1919Animation, 1000);
    } else {
    }
}

// Add simple slideshow navigation
var currentSlideIndex = 0;
var club1919AnimationIndex = 0; // Track which animation to show next
var fullCycleCount = 0; // Track number of complete cycles
var slidesInCurrentCycle = 0; // Track slides in current cycle for logo alternation

function nextSlide() {
    var slideContainer = document.getElementById('slide-container');
    var slides = slideContainer.querySelectorAll('.slide-item');

    if (slides.length === 0) return;

    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');

    // Move to next slide (wrap around)
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    slidesInCurrentCycle++;

    // Check if we completed a full cycle (back to intro screen)
    if (currentSlideIndex === 0) {
        fullCycleCount++;
        slidesInCurrentCycle = 0;

        // Alternate logo mode after each complete cycle
        logoMode = (logoMode === 'team') ? 'club' : 'team';

        updateClub1919Animation();

        // Refresh slides with new logo mode
        loadData().then(function(data) {
            updateMatchStatistics(data);
        }).catch(function(error) {
            updateMatchStatistics(null);
        });
    }

    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');

    updateScreenNumber();
    startCountdown();
}

function previousSlide() {
    var slideContainer = document.getElementById('slide-container');
    var slides = slideContainer.querySelectorAll('.slide-item');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');
    
    // Move to previous slide (wrap around)
    currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    
    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');
    
    updateScreenNumber();
    startCountdown();
}

// Countdown functions
function startCountdown() {
    // Force clear any existing intervals and reset to null
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    currentCountdown = SCREEN_DURATION_SECONDS;
    updateCountdownDisplay();
    
    countdownInterval = setInterval(function() {
        currentCountdown--;
        updateCountdownDisplay();

        if (currentCountdown <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            nextSlide();
        }
    }, 1000);
}

function updateCountdownDisplay() {
    var element = document.getElementById('countdown-display');
    if (element) {
        // Format as xx/xx (current/total)
        var currentFormatted = currentCountdown < 10 ? '0' + currentCountdown : currentCountdown;
        var totalFormatted = SCREEN_DURATION_SECONDS < 10 ? '0' + SCREEN_DURATION_SECONDS : SCREEN_DURATION_SECONDS;
        element.textContent = currentFormatted + '/' + totalFormatted;
    } else {
    }
}

function updateTotalSlides() {
    var slideContainer = document.getElementById('slide-container');
    if (slideContainer) {
        var slides = slideContainer.querySelectorAll('.slide-item');
        totalSlides = slides.length;
        updateScreenNumber();
    }
}

function updateScreenNumber() {
    var element = document.getElementById('screen-number-display');
    if (element) {
        element.textContent = (currentSlideIndex + 1) + '/' + totalSlides;
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousSlide();
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextSlide();
    }
});

// Handle window resize to update device detection
window.addEventListener('resize', function() {
    var oldIsMobile = isMobile;
    
    // Update device detection
    applyDeviceStyling();
    
    // If device type changed, refresh statistics
    if (oldIsMobile !== isMobile) {
        
        // Refresh statistics with current data
        loadData().then(function(data) {
            updateMatchStatistics(data);
        }).catch(function(error) {
            updateMatchStatistics(null);
        });
    }
});

// Auto-refresh system - check for new data every 5 minutes
var lastDataUpdate = null;

function checkForUpdates() {
    fetch('/api/data')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            var currentUpdate = data.last_updated;

            if (lastDataUpdate && currentUpdate && currentUpdate !== lastDataUpdate) {
                console.log('New data detected, refreshing page...');
                // Reload the entire page to get fresh data and rebuild carousel
                window.location.reload();
            } else {
                // Just update statistics for first load or no changes
                updateMatchStatistics(data);
                if (!lastDataUpdate) {
                    lastDataUpdate = currentUpdate;
                }
            }
        })
        .catch(function(error) {
            console.log('Error checking for updates:', error);
            updateMatchStatistics(null);
        });
}

// Check for updates every 5 minutes
setInterval(checkForUpdates, 5 * 60 * 1000);

// Also check for updates every 30 seconds on Saturday between 15:30-19:00
function checkIfSaturdayGameTime() {
    var now = new Date();
    var day = now.getDay(); // 0 = Sunday, 6 = Saturday
    var hour = now.getHours();
    var minute = now.getMinutes();

    // Saturday (6) between 15:30-19:00
    if (day === 6 && ((hour === 15 && minute >= 30) || (hour >= 16 && hour < 19))) {
        return true;
    }
    return false;
}

// Frequent updates during Saturday game time
setInterval(function() {
    if (checkIfSaturdayGameTime()) {
        checkForUpdates();
    }
}, 30 * 1000); // Every 30 seconds during game time

// CLUB1919 Animation System
function updateClub1919Animation() {

    // Only run on TV/desktop (not mobile)
    if (isMobile) {
        return;
    }

    var animationContainer = document.getElementById('club1919-animation');
    var club1919Text = document.getElementById('club1919-text');


    if (!animationContainer || !club1919Text) {
        return;
    }

    // Define animation classes
    var animations = ['typewriter', 'slide-glow', 'cinema', 'dynamic', 'spotlight'];

    // Remove all previous animation classes
    for (var i = 0; i < animations.length; i++) {
        animationContainer.classList.remove(animations[i]);
    }

    // Get current animation based on cycle count
    var currentAnimation = animations[club1919AnimationIndex];

    // Special handling for dynamic animation (falling letters)
    if (currentAnimation === 'dynamic') {
        // Split CLUB1919 into individual letter spans
        club1919Text.innerHTML = '<span>C</span><span>L</span><span>U</span><span>B</span><span>1</span><span>9</span><span>1</span><span>9</span>';
    } else {
        // Reset to normal text
        club1919Text.innerHTML = 'CLUB1919';
    }

    // Apply the animation class
    animationContainer.classList.add(currentAnimation);

    // Move to next animation (cycle through all 5)
    club1919AnimationIndex = (club1919AnimationIndex + 1) % 5;
}

// Function to set configuration from template
function setConfiguration(screenDuration) {
    SCREEN_DURATION_SECONDS = screenDuration;
    currentCountdown = screenDuration;
}