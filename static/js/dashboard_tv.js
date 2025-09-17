// TV-Simple Dashboard JavaScript - SPMS Liga Dashboard
// Optimized for TV browsers with minimal dependencies

// Global variables
var SCREEN_DURATION_SECONDS = 10;
var currentSlideIndex = 0;
var totalSlides = 0;
var currentCountdown = SCREEN_DURATION_SECONDS;
var countdownInterval = null;
var featuredTeamName = "";
var allSlides = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    
    // Set longer timeout for TV browsers  
    setTimeout(function() {
        loadData();
    }, 1000);
});

// Load data from API with TV browser optimizations
function loadData() {
    
    // Create XMLHttpRequest for better TV browser support
    var xhr = new XMLHttpRequest();
    xhr.timeout = 20000; // 20 second timeout for TV browsers
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    processData(data);
                } catch (e) {
                    startSlideshow(); // Start with just intro screen
                }
            } else {
                startSlideshow(); // Start with just intro screen
            }
        }
    };
    
    xhr.ontimeout = function() {
        startSlideshow(); // Start with just intro screen
    };
    
    xhr.onerror = function() {
        startSlideshow(); // Start with just intro screen
    };
    
    xhr.open('GET', '/api/data', true);
    xhr.send();
}

// Process loaded data and create slides
function processData(data) {
    try {
        // Set featured team info globally
        featuredTeamName = data.featured_team_name || "Featured Team";
        updateTeamName();
        
        // Check and display TEST MODE indicator
        checkTestMode(data);
        
        // Clear existing slides except intro
        var slideContainer = document.getElementById('slide-container');
        var existingSlides = slideContainer.querySelectorAll('.slide-item:not(.intro-screen)');
        for (var i = 0; i < existingSlides.length; i++) {
            slideContainer.removeChild(existingSlides[i]);
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
        addNextWeekMatchesSlide(data.next_week_matches || []);
        addFeaturedMatchesSlide(data.featured_team_matches || {played: [], upcoming: []});
        addTeamMatrixSlide(data.team_matrix || {teams: [], matrix: {}});
        
        updateMatchStatistics(data);
        startSlideshow();
        
    } catch (error) {
        startSlideshow(); // Start with just intro screen
    }
}

// Start the slideshow
function startSlideshow() {
    // Get all slide elements
    allSlides = document.querySelectorAll('.slide-item');
    totalSlides = allSlides.length;
    currentSlideIndex = 0;
    
    
    // Ensure first slide is active
    showSlide(0);
    
    // Update screen number and start countdown
    updateScreenNumber();
    startCountdown();
    
    // Set up keyboard navigation
    setupKeyboardNavigation();
}

// Show specific slide
function showSlide(index) {
    // Hide all slides
    for (var i = 0; i < allSlides.length; i++) {
        allSlides[i].classList.remove('active');
    }
    
    // Show target slide
    if (allSlides[index]) {
        allSlides[index].classList.add('active');
        currentSlideIndex = index;
    }
    
}

// Go to next slide
function nextSlide() {
    var nextIndex = (currentSlideIndex + 1) % totalSlides;
    showSlide(nextIndex);
    updateScreenNumber();
    startCountdown();
}

// Go to previous slide  
function prevSlide() {
    var prevIndex = currentSlideIndex - 1;
    if (prevIndex < 0) prevIndex = totalSlides - 1;
    showSlide(prevIndex);
    updateScreenNumber();
    startCountdown();
}

// Start countdown timer
function startCountdown() {
    // Clear any existing countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Skip countdown if only one slide
    if (totalSlides <= 1) {
        updateCountdownDisplay();
        return;
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

// Update countdown display (disabled for TV)
function updateCountdownDisplay() {
    // Countdown display removed for TV version - no action needed
}

// Update screen number display
function updateScreenNumber() {
    var element = document.getElementById('screen-number-display');
    if (element) {
        element.textContent = (currentSlideIndex + 1) + '/' + totalSlides;
    }
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            prevSlide();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            nextSlide();
        }
    });
}

// Update team name in intro screen
function updateTeamName() {
    var titleElement = document.getElementById('competition-main-title');
    if (titleElement && featuredTeamName) {
        titleElement.textContent = featuredTeamName.toUpperCase();
    }
}

// Update match statistics
function updateMatchStatistics(data) {
    if (!data) {
        updateCompetitionMatchesStats(0, 0);
        updateColumbiaMatchesStats(0, 0);
        return;
    }
    
    // Calculate total competition matches
    var allMatches = data.all_matches || [];
    var totalMatches = allMatches.length;
    
    // Calculate played matches
    var playedMatches = 0;
    for (var i = 0; i < allMatches.length; i++) {
        var match = allMatches[i];
        var status = match.status || match.matchStatus || '';
        var isPlayedStatus = status === 'played' || status === 'Gespeeld';
        
        if (status && status !== '') {
            if (isPlayedStatus) playedMatches++;
        } else {
            // Fallback: check if there are valid scores
            var homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
            var awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
            if (!isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore))) {
                playedMatches++;
            }
        }
    }
    
    // Calculate Columbia matches
    var columbiaMatches = data.featured_team_matches || {played: [], upcoming: []};
    var columbiaPlayed = (columbiaMatches.played || []).length;
    var columbiaUpcoming = (columbiaMatches.upcoming || []).length;
    
    // Update the display
    updateCompetitionMatchesStats(playedMatches, totalMatches);
    updateColumbiaMatchesStats(columbiaPlayed, columbiaUpcoming);
}

function updateCompetitionMatchesStats(played, total) {
    var element = document.getElementById('competition-matches-stats');
    var remaining = total - played;
    if (element) {
        element.textContent = 'Wedstrijden in competitie: nog te spelen ' + remaining + ' / gespeeld ' + played;
    }
}

function updateColumbiaMatchesStats(played, upcoming) {
    var element = document.getElementById('columbia-matches-stats');
    if (element) {
        element.textContent = 'Wedstrijden Columbia: nog te spelen ' + upcoming + ' / gespeeld ' + played;
    }
}

// Check if in test mode and show/hide indicator
function checkTestMode(data) {
    var indicator = document.getElementById('testModeIndicator');
    if (indicator) {
        if (data.featured_team_name === 'VV Gorecht') {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }
}

// Helper function to get first valid value
function getFirstValidValue() {
    for (var i = 0; i < arguments.length; i++) {
        var val = arguments[i];
        if (val !== undefined && val !== null) return val;
    }
    return null;
}

// Helper function to format numbers with space padding
function formatTwoDigits(number) {
    var num = Number(number);
    if (num < 10) {
        return ' ' + num;
    } else {
        return '' + num;
    }
}

// Helper function to format goal difference
function formatGoalDifference(goalsFor, goalsAgainst) {
    var difference = (goalsFor || 0) - (goalsAgainst || 0);
    if (difference >= 0) {
        if (difference < 10) {
            return '+ ' + difference;
        } else {
            return '+' + difference;
        }
    } else {
        var absDiff = Math.abs(difference);
        if (absDiff < 10) {
            return '- ' + absDiff;
        } else {
            return '-' + absDiff;
        }
    }
}

// Add standings slide (simplified for TV)
function addStandingsSlide(standings, allMatches) {
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Split standings into two halves: 1-7 left, 8-14 right
    var leftStandings = standings.slice(0, 7);
    var rightStandings = standings.slice(7, 14);
    
    var leftTableHTML = buildStandingsTable(leftStandings, allMatches, true);
    var rightTableHTML = buildStandingsTable(rightStandings, allMatches, true);
    
    slide.innerHTML = '<div class="row">' +
        '<div class="col-md-6">' + leftTableHTML + '</div>' +
        '<div class="col-md-6">' + rightTableHTML + '</div>' +
        '</div>';
    
    document.getElementById('slide-container').appendChild(slide);
}

// Build standings table HTML (simplified for TV)
function buildStandingsTable(standings, allMatches, includeForm) {
    var tableHTML = '<table class="table table-striped standings-table">' +
        '<thead><tr>' +
        '<th class="position-header">#</th>' +
        '<th>Team</th>' +
        '<th class="stats-header">G</th>' +
        '<th class="stats-header">W</th>' +
        '<th class="stats-header">G</th>' +
        '<th class="stats-header">V</th>' +
        '<th class="stats-header">+/-</th>' +
        '<th class="position-header">P</th>';
    
    if (includeForm) {
        tableHTML += '<th>Vorm</th>';
    }
    
    tableHTML += '</tr></thead><tbody>';
    
    for (var i = 0; i < standings.length; i++) {
        var team = standings[i];
        var teamName = team.team || team.name;
        var isFeatured = featuredTeamName && (teamName.indexOf(featuredTeamName) !== -1 || featuredTeamName.indexOf(teamName) !== -1);
        
        tableHTML += '<tr' + (isFeatured ? ' class="featured-team-row"' : '') + '>' +
            '<td class="position-cell">' + team.position + '</td>' +
            '<td class="team-name-cell">' + teamName + '</td>' +
            '<td class="stats-cell">' + formatTwoDigits(team.played || team.matches || 0) + '</td>' +
            '<td class="stats-cell">' + formatTwoDigits(team.wins || 0) + '</td>' +
            '<td class="stats-cell">' + formatTwoDigits(team.draws || team.ties || 0) + '</td>' +
            '<td class="stats-cell">' + formatTwoDigits(team.losses || 0) + '</td>' +
            '<td class="stats-cell">' + formatGoalDifference(team.goals_for || team.goalsFor || 0, team.goals_against || team.goalsAgainst || 0) + '</td>' +
            '<td class="points-cell">' + team.points + '</td>';
        
        if (includeForm) {
            tableHTML += '<td><div class="team-form">●●●●●</div></td>'; // Simplified form
        }
        
        tableHTML += '</tr>';
    }
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

// Add period slide (simplified for TV)
function addPeriodSlide(periodData, periodTitle, periodKey) {
    if (!periodData || periodData.length === 0) return;
    
    // Check if any team has played matches
    var hasPlayedMatches = false;
    for (var i = 0; i < periodData.length; i++) {
        if ((periodData[i].matches || periodData[i].played || 0) > 0) {
            hasPlayedMatches = true;
            break;
        }
    }
    
    if (!hasPlayedMatches) return;
    
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    var leftStandings = periodData.slice(0, 7);
    var rightStandings = periodData.slice(7, 14);
    
    var leftTableHTML = buildStandingsTable(leftStandings, [], false);
    var rightTableHTML = buildStandingsTable(rightStandings, [], false);
    
    slide.innerHTML = '<div>' +
        '<h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">' +
        periodTitle + '</h2>' +
        '<div class="row">' +
        '<div class="col-md-6">' + leftTableHTML + '</div>' +
        '<div class="col-md-6">' + rightTableHTML + '</div>' +
        '</div></div>';
    
    document.getElementById('slide-container').appendChild(slide);
}

// Helper functions for TV compatibility
function isFeaturedTeamMatch(match) {
    if (!featuredTeamName) return false;
    
    var home = match.home || match.hometeam || '';
    var away = match.away || match.awayteam || '';
    
    return home.indexOf(featuredTeamName) !== -1 || away.indexOf(featuredTeamName) !== -1 || 
           featuredTeamName.indexOf(home) !== -1 || featuredTeamName.indexOf(away) !== -1;
}

function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function groupResultsByWeek(results) {
    var weeklyResults = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        
        if (!result.date) continue;
        
        var matchDate = new Date(result.date);
        var year = matchDate.getFullYear();
        var weekNumber = getWeekNumber(matchDate);
        var weekLabel = 'Week ' + weekNumber + ' (' + year + ')';
        
        if (!weeklyResults[weekLabel]) {
            weeklyResults[weekLabel] = [];
        }
        
        weeklyResults[weekLabel].push(result);
    }
    
    // Sort matches within each week: featured team matches first, then by date
    var weeks = Object.keys(weeklyResults);
    for (var w = 0; w < weeks.length; w++) {
        var week = weeks[w];
        weeklyResults[week].sort(function(a, b) {
            var aIsFeatured = isFeaturedTeamMatch(a);
            var bIsFeatured = isFeaturedTeamMatch(b);
            
            // Featured matches first
            if (aIsFeatured && !bIsFeatured) return -1;
            if (!aIsFeatured && bIsFeatured) return 1;
            
            // Then by date (most recent first)
            return new Date(b.date) - new Date(a.date);
        });
    }
    
    return weeklyResults;
}

// Add last week results slide (full functionality for TV)
function addLastWeekResultsSlide(results) {
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Get only the last 7 played matches
    var last7Results = [];
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.status === 'Gespeeld' || (result.homeGoals !== undefined && result.awayGoals !== undefined)) {
            last7Results.push(result);
        }
    }
    
    // Sort by date (newest first) and take only 7
    last7Results.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    last7Results = last7Results.slice(0, 7);
    
    var weeklyResults = groupResultsByWeek(last7Results);
    var hasResults = Object.keys(weeklyResults).length > 0;
    
    var innerHTML = '<div>' +
        '<h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">Recente Wedstrijduitslagen</h2>' +
        '<div class="row">';
    
    if (hasResults) {
        var weeks = Object.keys(weeklyResults);
        weeks.sort(function(a, b) { return b.localeCompare(a); }); // Most recent week first
        
        for (var w = 0; w < weeks.length; w++) {
            var weekLabel = weeks[w];
            var weekResults = weeklyResults[weekLabel];
            
            innerHTML += '<div class="col-12 mb-4">' +
                '<h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 0.5rem; text-align: center;">' +
                weekLabel + '</h3>' +
                '<div class="row">';
            
            for (var r = 0; r < weekResults.length; r++) {
                var result = weekResults[r];
                var isFeaturedMatch = isFeaturedTeamMatch(result);
                var homeGoals = result.homeGoals || result.homescore || 0;
                var awayGoals = result.awayGoals || result.awayscore || 0;
                var home = result.home || result.hometeam || 'Team A';
                var away = result.away || result.awayteam || 'Team B';
                
                var matchStyle = isFeaturedMatch ? 
                    'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : 
                    '';
                var textColor = isFeaturedMatch ? '#000' : '#333';
                var scoreColor = isFeaturedMatch ? '#000' : '#0066cc';
                var fontWeight = isFeaturedMatch ? 'font-weight: 900;' : '';
                
                innerHTML += '<div class="col-6 offset-3">' +
                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ' + matchStyle + '">' +
                    '<div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 15px;">' +
                    '<div style="text-align: left; font-size: 2rem; font-weight: bold; color: ' + textColor + '; ' + fontWeight + '">' + home + '</div>' +
                    '<div style="text-align: center; font-size: 2rem; font-weight: bold; color: ' + scoreColor + '; ' + fontWeight + '">' + homeGoals + ' - ' + awayGoals + '</div>' +
                    '<div style="text-align: left; font-size: 2rem; font-weight: bold; color: ' + textColor + '; ' + fontWeight + '">' + away + '</div>' +
                    '</div></div></div>';
            }
            
            innerHTML += '</div></div>';
        }
    } else {
        innerHTML += '<div class="col-12 text-center">' +
            '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">' +
            '<h3 style="color: #666; font-size: 1.8rem;">Geen wedstrijduitslagen beschikbaar</h3>' +
            '<p style="color: #888; font-size: 1.2rem;">Data wordt geladen of er zijn nog geen wedstrijden gespeeld dit seizoen</p>' +
            '</div></div>';
    }
    
    innerHTML += '</div></div>';
    slide.innerHTML = innerHTML;
    
    document.getElementById('slide-container').appendChild(slide);
}

function groupUpcomingMatchesByWeek(matches) {
    var weeklyMatches = {};
    
    if (!matches || matches.length === 0) {
        return weeklyMatches;
    }
    
    for (var i = 0; i < matches.length; i++) {
        var match = matches[i];
        
        if (!match.date) continue;
        
        var matchDate = new Date(match.date);
        var year = matchDate.getFullYear();
        var weekNumber = getWeekNumber(matchDate);
        var weekLabel = 'Week ' + weekNumber + ' (' + year + ')';
        
        if (!weeklyMatches[weekLabel]) {
            weeklyMatches[weekLabel] = [];
        }
        
        weeklyMatches[weekLabel].push(match);
    }
    
    // Sort matches within each week: featured team matches first, then by date
    var weeks = Object.keys(weeklyMatches);
    for (var w = 0; w < weeks.length; w++) {
        var week = weeks[w];
        weeklyMatches[week].sort(function(a, b) {
            var aIsFeatured = isFeaturedTeamMatch(a);
            var bIsFeatured = isFeaturedTeamMatch(b);
            
            // Featured matches first
            if (aIsFeatured && !bIsFeatured) return -1;
            if (!aIsFeatured && bIsFeatured) return 1;
            
            // Then by date (earliest first for upcoming matches)
            return new Date(a.date) - new Date(b.date);
        });
    }
    
    return weeklyMatches;
}

function addNextWeekMatchesSlide(matches) {
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Group matches by week
    var weeklyMatches = groupUpcomingMatchesByWeek(matches);
    var hasMatches = Object.keys(weeklyMatches).length > 0;
    
    var innerHTML = '<div>' +
        '<h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">Komende Wedstrijden</h2>' +
        '<div class="row">';
    
    if (hasMatches) {
        var weeks = Object.keys(weeklyMatches);
        weeks.sort(function(a, b) { return a.localeCompare(b); }); // Earliest week first
        
        for (var w = 0; w < weeks.length; w++) {
            var weekLabel = weeks[w];
            var weekMatches = weeklyMatches[weekLabel];
            
            innerHTML += '<div class="col-12 mb-4">' +
                '<h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 0.5rem; text-align: center;">' +
                weekLabel + '</h3>' +
                '<div class="row">';
            
            for (var m = 0; m < weekMatches.length; m++) {
                var match = weekMatches[m];
                var isFeaturedMatch = isFeaturedTeamMatch(match);
                var home = match.home || match.hometeam || 'Team A';
                var away = match.away || match.awayteam || 'Team B';
                
                // Format date as DD-MM and extract time
                var matchDateTime = new Date(match.date);
                var matchDate = matchDateTime.toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                var matchTime = matchDateTime.toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
                
                var matchStyle = isFeaturedMatch ? 
                    'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : 
                    '';
                var textColor = isFeaturedMatch ? '#000' : '#333';
                var timeColor = isFeaturedMatch ? '#000' : '#0066cc';
                var fontWeight = isFeaturedMatch ? 'font-weight: 900;' : '';
                
                innerHTML += '<div class="col-6 offset-3">' +
                    '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ' + matchStyle + '">' +
                    '<div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 15px;">' +
                    '<div style="text-align: left; font-size: 2rem; font-weight: bold; color: ' + textColor + '; ' + fontWeight + '">' + home + '</div>' +
                    '<div style="text-align: center;">' +
                    '<div style="font-size: 2rem; font-weight: bold; color: ' + timeColor + '; ' + fontWeight + '; line-height: 1;">' + matchDate + '</div>' +
                    '<div style="font-size: 1.4rem; font-weight: 600; color: ' + (isFeaturedMatch ? '#333' : '#666') + '; line-height: 1;">' + matchTime + '</div>' +
                    '</div>' +
                    '<div style="text-align: right; font-size: 2rem; font-weight: bold; color: ' + textColor + '; ' + fontWeight + '">' + away + '</div>' +
                    '</div></div></div>';
            }
            
            innerHTML += '</div></div>';
        }
    } else {
        innerHTML += '<div class="col-12 text-center">' +
            '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 30px; margin: 20px;">' +
            '<h3 style="color: #666; font-size: 1.8rem;">Geen komende wedstrijden beschikbaar</h3>' +
            '<p style="color: #888; font-size: 1.2rem;">Programma wordt nog bekendgemaakt</p>' +
            '</div></div>';
    }
    
    innerHTML += '</div></div>';
    slide.innerHTML = innerHTML;
    
    document.getElementById('slide-container').appendChild(slide);
}

function addFeaturedMatchesSlide(matches) {
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Combine all matches and separate into played and upcoming
    var allMatches = [];
    if (matches.played) {
        for (var i = 0; i < matches.played.length; i++) {
            allMatches.push(matches.played[i]);
        }
    }
    if (matches.upcoming) {
        for (var i = 0; i < matches.upcoming.length; i++) {
            allMatches.push(matches.upcoming[i]);
        }
    }
    
    // Separate played and upcoming matches
    var playedMatches = [];
    var upcomingMatches = [];
    
    for (var i = 0; i < allMatches.length; i++) {
        var match = allMatches[i];
        var matchStatus = match.status || match.matchStatus || '';
        var isPlayed = matchStatus === 'Gespeeld' || 
                      matchStatus === 'played' || 
                      matchStatus === 'Afgelopen' ||
                      matchStatus === 'Finished' ||
                      matchStatus === 'Final' ||
                      (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                       !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
        
        if (isPlayed) {
            playedMatches.push(match);
        } else {
            upcomingMatches.push(match);
        }
    }
    
    // Sort played matches (newest first) and upcoming matches (earliest first)
    playedMatches.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    upcomingMatches.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    
    // Combine: played first, then upcoming
    var sortedMatches = playedMatches.concat(upcomingMatches);
    
    var innerHTML = '<div style="height: calc(100vh - 120px); overflow-y: auto;">' +
        '<h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: #333; text-align: center;">' +
        featuredTeamName + ' Wedstrijden</h2>' +
        '<div class="row">' +
        '<div class="col-md-6">' +
        '<h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">THUIS</h3>';
    
    // Home matches
    for (var i = 0; i < sortedMatches.length; i++) {
        var match = sortedMatches[i];
        var home = match.home || match.hometeam || '';
        
        if (home.indexOf(featuredTeamName) !== -1 || featuredTeamName.indexOf(home) !== -1) {
            var away = match.away || match.awayteam || 'Team';
            var matchStatus = match.status || match.matchStatus || '';
            
            var isPlayed = matchStatus === 'Gespeeld' || 
                          matchStatus === 'played' || 
                          matchStatus === 'Afgelopen' ||
                          matchStatus === 'Finished' ||
                          matchStatus === 'Final' ||
                          (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                           !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
            
            if (isPlayed) {
                var homeGoals = match.homeGoals || match.homescore || 0;
                var awayGoals = match.awayGoals || match.awayscore || 0;
                innerHTML += '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 2px 8px; margin-bottom: 1px; border-left: 3px solid #ffd700;">' +
                    '<div style="display: flex; align-items: center; font-size: 1.8rem; font-weight: bold; color: #333;">' +
                    '<div style="flex: 4; text-align: left;">' + featuredTeamName + '</div>' +
                    '<div style="flex: 1; text-align: center; color: #0066cc;">' + homeGoals + ' - ' + awayGoals + '</div>' +
                    '<div style="flex: 4; text-align: right;">' + away + '</div>' +
                    '</div></div>';
            } else {
                var matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                innerHTML += '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 2px 8px; margin-bottom: 1px; border-left: 3px solid #ffd700;">' +
                    '<div style="display: flex; align-items: center; font-size: 1.8rem; font-weight: bold; color: #333;">' +
                    '<div style="flex: 4; text-align: left;">' + featuredTeamName + '</div>' +
                    '<div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">' + matchDate + '</div>' +
                    '<div style="flex: 4; text-align: right;">' + away + '</div>' +
                    '</div></div>';
            }
        }
    }
    
    innerHTML += '</div>' +
        '<div class="col-md-6">' +
        '<h3 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">UIT</h3>';
    
    // Away matches
    for (var i = 0; i < sortedMatches.length; i++) {
        var match = sortedMatches[i];
        var away = match.away || match.awayteam || '';
        
        if (away.indexOf(featuredTeamName) !== -1 || featuredTeamName.indexOf(away) !== -1) {
            var home = match.home || match.hometeam || 'Team';
            var matchStatus = match.status || match.matchStatus || '';
            
            var isPlayed = matchStatus === 'Gespeeld' || 
                          matchStatus === 'played' || 
                          matchStatus === 'Afgelopen' ||
                          matchStatus === 'Finished' ||
                          matchStatus === 'Final' ||
                          (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                           !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
            
            if (isPlayed) {
                var homeGoals = match.homeGoals || match.homescore || 0;
                var awayGoals = match.awayGoals || match.awayscore || 0;
                innerHTML += '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 2px 8px; margin-bottom: 1px; border-right: 3px solid #ffd700;">' +
                    '<div style="display: flex; align-items: center; font-size: 1.8rem; font-weight: bold; color: #333;">' +
                    '<div style="flex: 4; text-align: left;">' + home + '</div>' +
                    '<div style="flex: 1; text-align: center; color: #0066cc;">' + homeGoals + ' - ' + awayGoals + '</div>' +
                    '<div style="flex: 4; text-align: right;">' + featuredTeamName + '</div>' +
                    '</div></div>';
            } else {
                var matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                innerHTML += '<div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 4px; padding: 2px 8px; margin-bottom: 1px; border-right: 3px solid #ffd700;">' +
                    '<div style="display: flex; align-items: center; font-size: 1.8rem; font-weight: bold; color: #333;">' +
                    '<div style="flex: 4; text-align: left;">' + home + '</div>' +
                    '<div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">' + matchDate + '</div>' +
                    '<div style="flex: 4; text-align: right;">' + featuredTeamName + '</div>' +
                    '</div></div>';
            }
        }
    }
    
    innerHTML += '</div></div></div>';
    slide.innerHTML = innerHTML;
    
    document.getElementById('slide-container').appendChild(slide);
}

function formatDateForMatrix(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return dateString;
    }
    
    // Check if it's a score (contains dash and is short)
    if (dateString.indexOf('-') !== -1 && dateString.length <= 5) {
        return dateString;
    }
    
    // Check if it's a date in YYYY-MM-DD format
    var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(dateString)) {
        var parts = dateString.split('-');
        return parts[2] + '-' + parts[1];
    }
    
    // If it's already a valid date object or other format, try standard conversion
    try {
        var date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
        }
    } catch (e) {
        // If date parsing fails, return original string
    }
    
    return dateString;
}

function addTeamMatrixSlide(matrix) {
    var slide = document.createElement('div');
    slide.className = 'slide-item';
    
    var innerHTML = '<div style="height: calc(100vh - 100px); overflow-y: auto; padding-top: 1rem;">' +
        '<h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #333; text-align: center;">Team vs Team Matrix</h2>' +
        '<div class="table-responsive">' +
        '<table style="font-size: 0.9rem; background-color: rgba(255, 255, 255, 0.95);" class="table table-sm table-bordered">' +
        '<thead><tr>' +
        '<th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 4px 2px;"></th>';
    
    // Add team headers
    var teams = matrix.teams || [];
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        innerHTML += '<th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 4px 2px; font-size: 1rem;">' + 
                    team.substring(0, 8) + '</th>';
    }
    
    innerHTML += '</tr></thead><tbody>';
    
    // Add team rows
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        innerHTML += '<tr>' +
            '<th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 4px 2px; font-size: 1rem;">' + 
            team.substring(0, 8) + '</th>';
        
        for (var j = 0; j < teams.length; j++) {
            var opponent = teams[j];
            var result = '';
            
            if (matrix.matrix && matrix.matrix[team] && matrix.matrix[team][opponent]) {
                var res = matrix.matrix[team][opponent];
                result = (res.indexOf('-') !== -1 && res.length <= 5) ? res : formatDateForMatrix(res);
            } else {
                result = '-';
            }
            
            innerHTML += '<td style="text-align: center; padding: 3px 1px; border: 1px solid #dee2e6; font-size: 1rem;">' +
                        result + '</td>';
        }
        
        innerHTML += '</tr>';
    }
    
    innerHTML += '</tbody></table></div></div>';
    slide.innerHTML = innerHTML;
    
    document.getElementById('slide-container').appendChild(slide);
}

// Function to set configuration from template
function setConfiguration(screenDuration) {
    SCREEN_DURATION_SECONDS = screenDuration;
    currentCountdown = screenDuration;
}

// Refresh data every 30 minutes
setInterval(function() {
    loadData();
}, 30 * 60 * 1000);

