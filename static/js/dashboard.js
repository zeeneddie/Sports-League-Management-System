// Dashboard JavaScript - SPMS Liga Dashboard
// Configuration will be set by the template
let SCREEN_DURATION_SECONDS = 10; // Default, will be overwritten

// Global variables
let carouselInstance = null;
let countdownInterval = null;
let currentCountdown = SCREEN_DURATION_SECONDS;
let totalSlides = 0;
let featuredTeamName = "";
let carouselInitialized = false;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadData().then(() => {
        initializeCarousel();
        updateCompetitionStatus('Dashboard geladen - Carousel actief');
    }).catch(error => {
        console.error('Data loading failed:', error);
        updateCompetitionStatus('Dashboard geladen - Beperkte functionaliteit');
    });
});

// Load data from API
async function loadData() {
    try {
        console.log('Loading data from /api/data...');
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Data loaded:', data);
        
        // Set featured team info globally
        featuredTeamName = data.featured_team_name || "Featured Team";
        updateTeamName();
        
        // Check and display TEST MODE indicator
        checkTestMode(data);
        
        // Clear existing slides except intro
        const carouselInner = document.getElementById('carousel-inner');
        const introSlide = carouselInner.querySelector('.intro-screen');
        
        // Keep intro slide, remove others
        const otherSlides = carouselInner.querySelectorAll('.carousel-item:not(.intro-screen)');
        otherSlides.forEach(slide => slide.remove());
        
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
        
        console.log('All slides added successfully');
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

function updateTeamName() {
    const titleElement = document.getElementById('competition-main-title');
    if (titleElement && featuredTeamName) {
        titleElement.textContent = featuredTeamName.toUpperCase();
    }
}

function updateCompetitionStatus(message) {
    const statusElement = document.getElementById('competition-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Check if in test mode and show/hide indicator
function checkTestMode(data) {
    const indicator = document.getElementById('testModeIndicator');
    // Test mode uses 'VV Gorecht' as featured team
    if (data.featured_team_name === 'VV Gorecht') {
        indicator.style.display = 'block';
        console.log('🧪 TEST MODE geactiveerd - VV Gorecht test data');
    } else {
        indicator.style.display = 'none';
        console.log('🌐 API MODE geactiveerd - Live Hollandse Velden data');
    }
}

// Helper function to get first valid (non-null, non-undefined) value
function getFirstValidValue(...values) {
    return values.find(val => val !== undefined && val !== null);
}

// Calculate form data for last 5 matches
function calculateTeamForm(teamName, allMatches) {
    if (!allMatches || !teamName) return '';
    
    // Get all matches for this team, sorted by date
    const teamMatches = allMatches
        .filter(match => {
            const home = match.home || match.hometeam || '';
            const away = match.away || match.awayteam || '';
            return home.includes(teamName) || away.includes(teamName) || 
                   teamName.includes(home) || teamName.includes(away);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // EERST filteren op ALLEEN gespeelde wedstrijden, DAN laatste 5 nemen
    const playedMatches = teamMatches.filter(match => {
        const status = match.status || match.matchStatus || '';
        
        // First check status - this is most reliable
        const isPlayedStatus = status === 'played' || status === 'Gespeeld';
        
        // Only use score validation as fallback if no status is available
        if (status && status !== '') {
            return isPlayedStatus;
        }
        
        // Fallback: check if there are valid scores (only when no status available)
        const homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
        const awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
        const hasValidScores = !isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore));
        
        return hasValidScores;
    });
    
    // Get last 5 PLAYED matches
    const last5PlayedMatches = playedMatches.slice(-5);
    
    // Debug logging for team form
    console.log(`🎯 TEAM FORM DEBUG voor ${teamName}:`);
    console.log(`   Totaal wedstrijden gevonden: ${teamMatches.length}`);
    console.log(`   Gespeelde wedstrijden (status='played'/'Gespeeld' of geldige scores): ${playedMatches.length}`);
    console.log(`   Laatste 5 gespeelde wedstrijden:`);
    
    let formHtml = '<div class="team-form">';
    
    // Add up to 5 circles, with unfilled ones on the left
    for (let i = 0; i < 5; i++) {
        if (i < 5 - last5PlayedMatches.length) {
            // Grey circle for teams with less than 5 played matches (left side)
            console.log(`   ${i+1}. Geen gespeelde wedstrijd beschikbaar -> GRIJS rondje`);
            formHtml += '<span class="form-circle form-unplayed">●</span>';
        } else {
            const match = last5PlayedMatches[i - (5 - last5PlayedMatches.length)];
            // Check if team is playing home or away (improved matching)
            const homeTeam = match.home || match.hometeam || match.home_team || '';
            const awayTeam = match.away || match.awayteam || match.away_team || '';
            
            const isHome = homeTeam.toLowerCase().includes(teamName.toLowerCase()) || 
                          teamName.toLowerCase().includes(homeTeam.toLowerCase());
            const isAway = awayTeam.toLowerCase().includes(teamName.toLowerCase()) || 
                          teamName.toLowerCase().includes(awayTeam.toLowerCase());
            
            let result = 'unplayed'; // Default to unplayed (grey)
            let resultText = 'ONBEKEND';
            let colorText = 'GRIJS';
            
            // All matches in this array are already filtered to played status or valid scores
            const matchStatus = match.status || match.matchStatus || '';
            
            if (isHome || isAway) {
                // Check all possible score field variations using helper function
                const homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
                const awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
                
                const homeGoals = parseInt(homeScore);
                const awayGoals = parseInt(awayScore);
                
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
            
            const homeDisplay = isHome ? `${homeTeam} (THUIS)` : homeTeam;
            const awayDisplay = isAway ? `${awayTeam} (UIT)` : awayTeam;
            
            console.log(`   ${i+1}. ${homeDisplay} vs ${awayDisplay} | ${match.homeGoals || 0}-${match.awayGoals || 0} | Status: ${matchStatus} | isHome: ${isHome} | isAway: ${isAway} | ${resultText} -> ${colorText} rondje`);
            
            formHtml += `<span class="form-circle form-${result}">●</span>`;
        }
    }
    
    formHtml += '</div>';
    console.log(`🏁 Team form voor ${teamName} compleet\n`);
    return formHtml;
}

// Add slides functions with original styling
function addStandingsSlide(standings, allMatches = []) {
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    
    // Split standings into two halves: 1-7 left, 8-14 right
    const leftStandings = standings.slice(0, 7);
    const rightStandings = standings.slice(7, 14);
    
    slide.innerHTML = `
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
                            <th class="position-header">PTS</th>
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
                                <td class="team-name-cell">${teamName}</td>
                                <td class="stats-cell">${team.played || team.matches || 0}</td>
                                <td class="stats-cell">${team.wins || 0}</td>
                                <td class="stats-cell">${team.draws || team.ties || 0}</td>
                                <td class="stats-cell">${team.losses || 0}</td>
                                <td class="stats-cell">${(team.goals_for || team.goalsFor || 0) - (team.goals_against || team.goalsAgainst || 0)}</td>
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
                            <th class="position-header">PTS</th>
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
                                <td class="team-name-cell">${teamName}</td>
                                <td class="stats-cell">${team.played || team.matches || 0}</td>
                                <td class="stats-cell">${team.wins || 0}</td>
                                <td class="stats-cell">${team.draws || team.ties || 0}</td>
                                <td class="stats-cell">${team.losses || 0}</td>
                                <td class="stats-cell">${(team.goals_for || team.goalsFor || 0) - (team.goals_against || team.goalsAgainst || 0)}</td>
                                <td class="points-cell">${team.points}</td>
                                <td>${calculateTeamForm(teamName, allMatches)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('carousel-inner').appendChild(slide);
}

function addPeriodSlide(periodData, periodTitle, periodKey, forceShow = false) {
    // Check if period has any data
    if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
        console.log(`Skipping ${periodTitle} - no data`);
        return;
    }
    
    // Check if any team has played matches (skip check if forced)
    if (!forceShow) {
        const hasPlayedMatches = periodData.some(team => (team.matches || team.played || 0) > 0);
        if (!hasPlayedMatches) {
            console.log(`Skipping ${periodTitle} - no matches played`);
            return;
        }
    } else {
        console.log(`Force showing ${periodTitle} regardless of match status`);
    }
    
    // Adding period slide
    
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    
    // Split teams: positions 1-7 on left, 8-14 on right
    const leftTeams = periodData.filter(team => team.position <= 7);
    const rightTeams = periodData.filter(team => team.position >= 8);
    
    slide.innerHTML = `
        <div>
            <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                ${periodTitle}
            </h2>
            <div class="row">
                <div class="col-md-6">
                    <table class="table table-sm standings-table">
                        <tbody>
                            ${leftTeams.map(team => {
                                const isFeatured = featuredTeamName && (team.name || team.team || '').toLowerCase().includes(featuredTeamName.toLowerCase());
                                const formData = ''; // Form data not available for period slides
                                return `
                                    <tr ${isFeatured ? 'class="featured-team-row"' : ''}>
                                        <td class="position-cell">${team.position}</td>
                                        <td class="team-name-cell">
                                            ${team.name || team.team || 'Onbekend'}
                                            <div class="team-form">${formData}</div>
                                        </td>
                                        <td class="stats-cell">${team.matches || team.played || 0}</td>
                                        <td class="stats-cell">${team.wins || 0}</td>
                                        <td class="stats-cell">${team.ties || team.draws || 0}</td>
                                        <td class="stats-cell">${team.losses || 0}</td>
                                        <td class="points-cell">${team.points || 0}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <table class="table table-sm standings-table">
                        <tbody>
                            ${rightTeams.map(team => {
                                const isFeatured = featuredTeamName && (team.name || team.team || '').toLowerCase().includes(featuredTeamName.toLowerCase());
                                const formData = ''; // Form data not available for period slides
                                return `
                                    <tr ${isFeatured ? 'class="featured-team-row"' : ''}>
                                        <td class="position-cell">${team.position}</td>
                                        <td class="team-name-cell">
                                            ${team.name || team.team || 'Onbekend'}
                                            <div class="team-form">${formData}</div>
                                        </td>
                                        <td class="stats-cell">${team.matches || team.played || 0}</td>
                                        <td class="stats-cell">${team.wins || 0}</td>
                                        <td class="stats-cell">${team.ties || team.draws || 0}</td>
                                        <td class="stats-cell">${team.losses || 0}</td>
                                        <td class="points-cell">${team.points || 0}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('carousel-inner').appendChild(slide);
}

function addLastWeekResultsSlide(results) {
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    
    // Get only the last 7 played matches
    const last7Results = results
        .filter(result => result.status === 'Gespeeld' || (result.homeGoals !== undefined && result.awayGoals !== undefined))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7);
    
    const weeklyResults = groupResultsByWeek(last7Results);
    
    const hasResults = Object.keys(weeklyResults).length > 0;
    
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
                                <div class="col-6 offset-3">
                                    <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 15px;">
                                            <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${home}</div>
                                            <div style="text-align: center; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${homeGoals} - ${awayGoals}</div>
                                            <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${away}</div>
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
    document.getElementById('carousel-inner').appendChild(slide);
}

function groupResultsByWeek(results) {
    const weeklyResults = {};
    
    console.log('Grouping results by week, total results:', results.length);
    
    results.forEach((result, index) => {
        console.log(`Result ${index}:`, result);
        
        if (!result.date) {
            console.log('No date for result:', result);
            return;
        }
        
        const matchDate = new Date(result.date);
        console.log('Match date:', matchDate);
        
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
    
    console.log('Grouping upcoming matches by week, total matches:', matches ? matches.length : 0);
    
    if (!matches || matches.length === 0) {
        return weeklyMatches;
    }
    
    matches.forEach((match, index) => {
        console.log(`Upcoming match ${index}:`, match);
        
        if (!match.date) {
            console.log('No date for upcoming match:', match);
            return;
        }
        
        const matchDate = new Date(match.date);
        console.log('Upcoming match date:', matchDate);
        
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
    
    console.log('Grouped upcoming matches by week:', weeklyMatches);
    return weeklyMatches;
}

function addNextWeekMatchesSlide(matches) {
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    
    // Group matches by week (similar to results)
    const weeklyMatches = groupUpcomingMatchesByWeek(matches);
    
    const hasMatches = Object.keys(weeklyMatches).length > 0;
    
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
                                const matchDate = new Date(match.date).toLocaleDateString('nl-NL');
                                return `
                                <div class="col-6 offset-3">
                                    <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 15px;">
                                            <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${home}</div>
                                            <div style="text-align: center; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${matchDate}</div>
                                            <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${away}</div>
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
    document.getElementById('carousel-inner').appendChild(slide);
}

function addFeaturedMatchesSlide(matches) {
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    
    // Combine all matches and separate into played and upcoming
    const allMatches = [
        ...(matches.played || []),
        ...(matches.upcoming || [])
    ];
    
    // Separate played and upcoming matches using detailed status check
    const playedMatches = allMatches.filter(match => {
        const matchStatus = match.status || match.matchStatus || '';
        return matchStatus === 'Gespeeld' || 
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
                matchStatus === 'played' || 
                matchStatus === 'Afgelopen' ||
                matchStatus === 'Finished' ||
                matchStatus === 'Final' ||
                (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                 !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals))));
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Earliest upcoming first
    
    // Combine: played first, then upcoming
    const sortedMatches = [...playedMatches, ...upcomingMatches];
    
    slide.innerHTML = `
        <div>
            <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                ${featuredTeamName} Wedstrijden
            </h2>
            <div class="row">
                <div class="col-md-6">
                    <h3 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1.5rem; color: #333; text-align: center;">THUIS</h3>
                    ${sortedMatches.filter(match => {
                        const home = match.home || match.hometeam || '';
                        return home.includes(featuredTeamName) || featuredTeamName.includes(home);
                    }).map(match => {
                        const away = match.away || match.awayteam || 'Team';
                        const matchStatus = match.status || match.matchStatus || '';
                        
                        // Check if match is played based on status field
                        const isPlayed = matchStatus === 'Gespeeld' || 
                                       matchStatus === 'played' || 
                                       matchStatus === 'Afgelopen' ||
                                       matchStatus === 'Finished' ||
                                       matchStatus === 'Final' ||
                                       (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                                        !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
                        
                        console.log(`THUIS wedstrijd: ${featuredTeamName} vs ${away}, Status: "${matchStatus}", isPlayed: ${isPlayed}`);
                        
                        if (isPlayed) {
                            const homeGoals = match.homeGoals || match.homescore || 0;
                            const awayGoals = match.awayGoals || match.awayscore || 0;
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 6px; padding: 4px 12px; margin-bottom: 2px; border-left: 4px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.4rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${featuredTeamName}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc;">${homeGoals} - ${awayGoals}</div>
                                    <div style="flex: 4; text-align: right;">${away}</div>
                                </div>
                            </div>`;
                        } else {
                            const matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 6px; padding: 4px 12px; margin-bottom: 2px; border-left: 4px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.4rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${featuredTeamName}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">${matchDate}</div>
                                    <div style="flex: 4; text-align: right;">${away}</div>
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
                <div class="col-md-6">
                    <h3 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1.5rem; color: #333; text-align: center;">UIT</h3>
                    ${sortedMatches.filter(match => {
                        const away = match.away || match.awayteam || '';
                        return away.includes(featuredTeamName) || featuredTeamName.includes(away);
                    }).map(match => {
                        const home = match.home || match.hometeam || 'Team';
                        const matchStatus = match.status || match.matchStatus || '';
                        
                        // Check if match is played based on status field
                        const isPlayed = matchStatus === 'Gespeeld' || 
                                       matchStatus === 'played' || 
                                       matchStatus === 'Afgelopen' ||
                                       matchStatus === 'Finished' ||
                                       matchStatus === 'Final' ||
                                       (matchStatus === '' && match.homeGoals !== undefined && match.awayGoals !== undefined && 
                                        !isNaN(parseInt(match.homeGoals)) && !isNaN(parseInt(match.awayGoals)));
                        
                        console.log(`UIT wedstrijd: ${home} vs ${featuredTeamName}, Status: "${matchStatus}", isPlayed: ${isPlayed}`);
                        
                        if (isPlayed) {
                            const homeGoals = match.homeGoals || match.homescore || 0;
                            const awayGoals = match.awayGoals || match.awayscore || 0;
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 6px; padding: 4px 12px; margin-bottom: 2px; border-right: 4px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.4rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${home}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc;">${homeGoals} - ${awayGoals}</div>
                                    <div style="flex: 4; text-align: right;">${featuredTeamName}</div>
                                </div>
                            </div>`;
                        } else {
                            const matchDate = new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'});
                            return `
                            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 6px; padding: 4px 12px; margin-bottom: 2px; border-right: 4px solid #ffd700;">
                                <div style="display: flex; align-items: center; font-size: 1.4rem; font-weight: bold; color: #333;">
                                    <div style="flex: 4; text-align: left;">${home}</div>
                                    <div style="flex: 1; text-align: center; color: #0066cc; font-weight: bold;">${matchDate}</div>
                                    <div style="flex: 4; text-align: right;">${featuredTeamName}</div>
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    document.getElementById('carousel-inner').appendChild(slide);
}

function addTeamMatrixSlide(matrix) {
    const slide = document.createElement('div');
    slide.className = 'carousel-item';
    slide.innerHTML = `
        <div>
            <h2 style="font-size: 3rem; font-weight: bold; margin-bottom: 2rem; color: #333; text-align: center;">
                Team vs Team Matrix
            </h2>
            <div class="table-responsive">
                <table style="font-size: 0.9rem; background-color: rgba(255, 255, 255, 0.95);" class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 8px 4px;"></th>
                            ${(matrix.teams || []).map(team => `<th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 8px 4px;">${team.substring(0, 8)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${(matrix.teams || []).map(team => `
                            <tr>
                                <th style="background-color: #f8f9fa; font-weight: bold; text-align: center; padding: 8px 4px;">${team.substring(0, 8)}</th>
                                ${(matrix.teams || []).map(opponent => {
                                    const result = matrix.matrix && matrix.matrix[team] ? matrix.matrix[team][opponent] : null;
                                    return `<td style="text-align: center; padding: 6px 3px; border: 1px solid #dee2e6;">
                                        ${result ? (result.includes('-') ? result : new Date(result).toLocaleDateString('nl-NL').substring(0, 5)) : '-'}
                                    </td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('carousel-inner').appendChild(slide);
}

// Initialize carousel
function initializeCarousel() {
    const carouselElement = document.getElementById('carousel');
    const slides = carouselElement.querySelectorAll('.carousel-item');
    totalSlides = slides.length;
    
    console.log('Initializing carousel with', totalSlides, 'slides');
    
    // Only initialize carousel instance once
    if (!carouselInitialized) {
        carouselInstance = new bootstrap.Carousel(carouselElement, {
            interval: false,  // Disable auto-advance - controlled by countdown timer
            wrap: true
        });
        
        // Add event listener for slide changes (only once)
        carouselElement.addEventListener('slid.bs.carousel', function() {
            updateScreenNumber();
            startCountdown();
        });
        
        carouselInitialized = true;
        console.log('Carousel initialized successfully');
    } else {
        console.log('Carousel already initialized, updating slide count only');
    }
    
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
    
    countdownInterval = setInterval(() => {
        currentCountdown--;
        updateCountdownDisplay();
        
        if (currentCountdown <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            carouselInstance.next();
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const element = document.getElementById('countdown-display');
    if (element) {
        element.textContent = currentCountdown;
    }
}

function updateScreenNumber() {
    const slides = document.querySelectorAll('.carousel-item');
    let currentIndex = 0;
    
    slides.forEach((slide, index) => {
        if (slide.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    const element = document.getElementById('screen-number-display');
    if (element) {
        element.textContent = `${currentIndex + 1}/${totalSlides}`;
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        carouselInstance?.prev();
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        carouselInstance?.next();
    }
});

// Refresh data every 30 minutes
setInterval(() => {
    console.log('Refreshing data...');
    loadData().catch(error => {
        console.error('Data refresh failed:', error);
    });
}, 30 * 60 * 1000);

// Function to set configuration from template
function setConfiguration(screenDuration) {
    SCREEN_DURATION_SECONDS = screenDuration;
    currentCountdown = screenDuration;
}