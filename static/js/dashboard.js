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

// Mobile detection function (dynamic)
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTabletDevice() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

function isTVDevice() {
    return window.innerWidth > 1024;
}

// Current device state (will be updated dynamically)
let isMobile = isMobileDevice();
let isTablet = isTabletDevice();
let isTV = isTVDevice();

// Function to get team logo based on team name
function getTeamLogo(teamName) {
    if (!teamName) return '';
    
    // Team name to logo ID mapping (based on hollandsevelden.nl data)
    const teamLogoMap = {
        'Columbia': 't_184',
        'AVV Columbia': 't_184',
        'AGOVV': 't_183', 
        'Epe': 't_185',
        'Zwart-Wi': 't_186',
        'Hattem': 't_187',
        'Groen Wi': 't_188',
        'Heerde': 't_189',
        'VIOS V': 't_190',
        "'t Harde": 't_191',
        'VVOP': 't_192',
        'Hatto': 't_193',
        'OWIOS': 't_194',
        'SP Teuge': 't_195',
        'SEH': 't_196'
    };
    
    // Find logo for team (exact match or partial match)
    const logoId = teamLogoMap[teamName] || Object.keys(teamLogoMap).find(key => 
        teamName.includes(key) || key.includes(teamName)
    );
    
    if (logoId) {
        return `<img src="/static/images/team_logos/${teamLogoMap[logoId] || logoId}.png" class="team-logo" alt="${teamName}" onerror="this.style.display='none'">`;
    }
    
    return ''; // No logo found
}

// Function to get larger team logo for matches (1.3x bigger)
function getTeamLogoLarge(teamName) {
    if (!teamName) return '';
    
    // Team name to logo ID mapping (based on hollandsevelden.nl data)
    const teamLogoMap = {
        'Columbia': 't_184',
        'AVV Columbia': 't_184',
        'AGOVV': 't_183', 
        'Epe': 't_185',
        'Zwart-Wi': 't_186',
        'Hattem': 't_187',
        'Groen Wi': 't_188',
        'Heerde': 't_189',
        'VIOS V': 't_190',
        "'t Harde": 't_191',
        'VVOP': 't_192',
        'Hatto': 't_193',
        'OWIOS': 't_194',
        'SP Teuge': 't_195',
        'SEH': 't_196'
    };
    
    // Find logo for team (exact match or partial match)
    const logoId = teamLogoMap[teamName] || Object.keys(teamLogoMap).find(key => 
        teamName.includes(key) || key.includes(teamName)
    );
    
    if (logoId) {
        return `<img src="/static/images/team_logos/${teamLogoMap[logoId] || logoId}.png" class="team-logo-large" alt="${teamName}" onerror="this.style.display='none'">`;
    }
    
    return ''; // No logo found
}

// Function to get team name with logo
function getTeamNameWithLogo(teamName, forceShorten = false) {
    const logo = getTeamLogo(teamName);
    const displayName = getShortTeamName(teamName, forceShorten);
    return logo ? `${logo} ${displayName}` : displayName;
}

// Function to get team name with large logo (for matches)
function getTeamNameWithLogoLarge(teamName, forceShorten = false) {
    const logo = getTeamLogoLarge(teamName);
    const displayName = getShortTeamName(teamName, forceShorten);
    return logo ? `${logo} ${displayName}` : displayName;
}

// Function to get team name with large logo after name (for away teams)
function getTeamNameWithLogoLargeAfter(teamName, forceShorten = false) {
    const logo = getTeamLogoLargeAfter(teamName);
    const displayName = getShortTeamName(teamName, forceShorten);
    return logo ? `${displayName} ${logo}` : displayName;
}

// Function to get larger team logo positioned after name
function getTeamLogoLargeAfter(teamName) {
    if (!teamName) return '';
    
    // Team name to logo ID mapping (based on hollandsevelden.nl data)
    const teamLogoMap = {
        'Columbia': 't_184',
        'AVV Columbia': 't_184',
        'AGOVV': 't_183', 
        'Epe': 't_185',
        'Zwart-Wi': 't_186',
        'Hattem': 't_187',
        'Groen Wi': 't_188',
        'Heerde': 't_189',
        'VIOS V': 't_190',
        "'t Harde": 't_191',
        'VVOP': 't_192',
        'Hatto': 't_193',
        'OWIOS': 't_194',
        'SP Teuge': 't_195',
        'SEH': 't_196'
    };
    
    // Find logo for team (exact match or partial match)
    const logoId = teamLogoMap[teamName] || Object.keys(teamLogoMap).find(key => 
        teamName.includes(key) || key.includes(teamName)
    );
    
    if (logoId) {
        return `<img src="/static/images/team_logos/${teamLogoMap[logoId] || logoId}.png" class="team-logo-large-after" alt="${teamName}" onerror="this.style.display='none'">`;
    }
    
    return ''; // No logo found
}

// Function to shorten team name for mobile display
function getShortTeamName(fullTeamName, forceShorten = false) {
    if (!isMobile && !forceShorten) return fullTeamName;
    
    // Extract the main team name (remove prefixes like AVV, SV, VV etc.)
    const parts = fullTeamName.split(' ');
    if (parts.length > 1) {
        // Remove common prefixes
        const prefixes = ['AVV', 'SV', 'VV', 'FC', 'AGOVV', 'VVV'];
        if (prefixes.includes(parts[0])) {
            const mainName = parts.slice(1).join(' ');
            // Further shorten if still too long for mobile
            if (mainName.length > 8) {
                // Take first word only if multiple words remain
                const mainParts = mainName.split(' ');
                return mainParts[0];
            }
            return mainName;
        }
    }
    
    // If no prefix or single word, truncate if too long
    if (fullTeamName.length > 8) {
        return fullTeamName.substring(0, 8);
    }
    
    return fullTeamName;
}

// Apply device-specific styling
function applyDeviceStyling() {
    // Update device detection
    isMobile = isMobileDevice();
    isTablet = isTabletDevice();
    isTV = isTVDevice();
    
    const body = document.body;
    
    // Remove existing device classes
    body.classList.remove('mobile-mode', 'tablet-mode', 'tv-mode');
    
    // Add appropriate device class
    if (isMobile) {
        body.classList.add('mobile-mode');
        console.log('📱 Mobile mode activated (width: ' + window.innerWidth + 'px)');
    } else if (isTablet) {
        body.classList.add('tablet-mode');
        console.log('📱 Tablet mode activated (width: ' + window.innerWidth + 'px)');
    } else {
        body.classList.add('tv-mode');
        console.log('📺 TV mode activated (width: ' + window.innerWidth + 'px)');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Apply device-specific styling first
    applyDeviceStyling();
    
    loadData().then((data) => {
        console.log('🎯 Data loaded successfully, calling updateMatchStatistics with:', data);
        initializeCarousel();
        updateMatchStatistics(data);
    }).catch(error => {
        console.error('Data loading failed:', error);
        updateMatchStatistics(null);
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
        const slideContainer = document.getElementById('slide-container');
        if (!slideContainer) {
            console.error('❌ slide-container element not found!');
            return data; // Return data but skip slideshow initialization
        }
        
        const introSlide = slideContainer.querySelector('.intro-screen');
        
        // Keep intro slide, remove others
        const otherSlides = slideContainer.querySelectorAll('.slide-item:not(.intro-screen)');
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

function updateMatchStatistics(data) {
    if (!data) {
        // If no data, show loading state
        updateCompetitionMatchesStats(0, 0);
        updateColumbiaMatchesStats(0, 0);
        return;
    }
    
    // Calculate total competition matches
    const allMatches = data.all_matches || [];
    const totalMatches = allMatches.length;
    
    // Calculate played matches (matches with status 'Gespeeld' or valid scores)
    const playedMatches = allMatches.filter(match => {
        const status = match.status || match.matchStatus || '';
        const isPlayedStatus = status === 'played' || status === 'Gespeeld';
        
        if (status && status !== '') {
            return isPlayedStatus;
        }
        
        // Fallback: check if there are valid scores
        const homeScore = getFirstValidValue(match.homeGoals, match.homescore, match.home_goals, match.home_score);
        const awayScore = getFirstValidValue(match.awayGoals, match.awayscore, match.away_goals, match.away_score);
        return !isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore));
    }).length;
    
    // Calculate Columbia matches
    const columbiaMatches = data.featured_team_matches || {played: [], upcoming: []};
    const columbiaPlayed = (columbiaMatches.played || []).length;
    const columbiaUpcoming = (columbiaMatches.upcoming || []).length;
    
    console.log(`📊 Match Statistics:`);
    console.log(`   Total matches in competition: ${totalMatches}`);
    console.log(`   Played matches: ${playedMatches}`);
    console.log(`   Columbia played: ${columbiaPlayed}`);
    console.log(`   Columbia upcoming: ${columbiaUpcoming}`);
    
    // Update the display
    updateCompetitionMatchesStats(playedMatches, totalMatches);
    updateColumbiaMatchesStats(columbiaPlayed, columbiaUpcoming);
}

function updateCompetitionMatchesStats(played, total) {
    const element = document.getElementById('competition-matches-stats');
    const remaining = total - played;
    console.log('📊 Updating competition matches stats:', { played, total, remaining, element });
    if (element) {
        if (isMobile) {
            // Mobile: Split over three lines for better readability
            element.innerHTML = `Wedstrijden in competitie:<br>nog te spelen / gespeeld<br>${remaining} / ${played}`;
        } else {
            // Desktop: Single line
            element.textContent = `Wedstrijden in competitie: nog te spelen ${remaining} / gespeeld ${played}`;
        }
        console.log('✅ Updated competition matches stats successfully');
    } else {
        console.error('❌ Element competition-matches-stats not found');
    }
}

function updateColumbiaMatchesStats(played, upcoming) {
    const element = document.getElementById('columbia-matches-stats');
    console.log('⚽ Updating Columbia matches stats:', { played, upcoming, element });
    if (element) {
        if (isMobile) {
            // Mobile: Split over three lines for better readability
            element.innerHTML = `Wedstrijden Columbia:<br>nog te spelen / gespeeld<br>${upcoming} / ${played}`;
        } else {
            // Desktop: Single line
            element.textContent = `Wedstrijden Columbia: nog te spelen ${upcoming} / gespeeld ${played}`;
        }
        console.log('✅ Updated Columbia matches stats successfully');
    } else {
        console.error('❌ Element columbia-matches-stats not found');
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

// Helper function to format numbers with space padding (under 10 = single digit with space, 10+ = normal)
function formatTwoDigits(number) {
    const num = Number(number);
    if (num < 10) {
        return ` ${num}`; // Space + single digit for numbers under 10
    } else {
        return num.toString(); // Normal display for 10 and above
    }
}

// Helper function to format goal difference with proper spacing for negative values
function formatGoalDifference(goalsFor, goalsAgainst) {
    const difference = (goalsFor || 0) - (goalsAgainst || 0);
    if (difference >= 0) {
        if (difference < 10) {
            return `+ ${difference}`; // + space + single digit
        } else {
            return `+${difference}`; // + double digit
        }
    } else {
        const absDiff = Math.abs(difference);
        if (absDiff < 10) {
            return `- ${absDiff}`; // - space + single digit
        } else {
            return `-${absDiff}`; // - double digit
        }
    }
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
    slide.className = 'slide-item';
    
    if (isMobile) {
        // Mobile: Single column layout without form column
        slide.innerHTML = `
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
        `;
    } else {
        // Desktop/TV: Two column layout with form column
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
    } else {
        console.error('❌ Cannot add slide: slide-container element not found!');
    }
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
    } else {
        console.error('❌ Cannot add slide: slide-container element not found!');
    }
}

function addLastWeekResultsSlide(results) {
    const slide = document.createElement('div');
    slide.className = 'slide-item';
    
    // Get only the last 7 played matches
    const last7Results = results
        .filter(result => result.status === 'Gespeeld' || (result.homeGoals !== undefined && result.awayGoals !== undefined))
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
                                    <div class="mobile-match-date">${matchDate}</div>
                                    <div class="mobile-match-teams">
                                        <div class="mobile-team ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                        <div class="mobile-score">${homeGoals} - ${awayGoals}</div>
                                        <div class="mobile-team ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(away)}</div>
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
                                    <div class="col-6 offset-3">
                                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 15px;">
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                                <div style="text-align: center; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${homeGoals} - ${awayGoals}</div>
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(away)}</div>
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
    } else {
        console.error('❌ Cannot add slide: slide-container element not found!');
    }
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
                                        <div class="mobile-team ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                        <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<br>${matchTime}</div>
                                        <div class="mobile-team ${isFeaturedMatch ? 'featured' : ''}">${getTeamNameWithLogoLargeAfter(away)}</div>
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
                                    <div class="col-6 offset-3">
                                        <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 4px 15px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${isFeaturedMatch ? 'background-color: rgba(255, 215, 0, 0.2) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;' : ''}">
                                            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 15px;">
                                                <div style="text-align: left; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLarge(home)}</div>
                                                <div style="text-align: center;">
                                                    <div style="font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#0066cc'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}; line-height: 1;">${matchDate}</div>
                                                    <div style="font-size: 1.4rem; font-weight: 600; color: ${isFeaturedMatch ? '#333' : '#666'}; line-height: 1;">${matchTime}</div>
                                                </div>
                                                <div style="text-align: right; font-size: 2rem; font-weight: bold; color: ${isFeaturedMatch ? '#000' : '#333'}; ${isFeaturedMatch ? 'font-weight: 900;' : ''}">${getTeamNameWithLogoLargeAfter(away)}</div>
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
    } else {
        console.error('❌ Cannot add slide: slide-container element not found!');
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
                                <div class="mobile-match-date">${new Date(match.date).toLocaleDateString('nl-NL', {day: '2-digit', month: '2-digit'})}</div>
                                <div class="mobile-match-teams">
                                    ${isHomeMatch ? 
                                        `<div class="mobile-team featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                         <div class="mobile-score">${ourScore} - ${opponentScore}</div>
                                         <div class="mobile-team">${getTeamNameWithLogoLargeAfter(opponent)}</div>` :
                                        `<div class="mobile-team">${getTeamNameWithLogoLargeAfter(opponent)}</div>
                                         <div class="mobile-score">${opponentScore} - ${ourScore}</div>
                                         <div class="mobile-team featured">${getTeamNameWithLogoLargeAfter(featuredTeamName)}</div>`
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
                                        `<div class="mobile-team featured">${getTeamNameWithLogoLarge(featuredTeamName)}</div>
                                         <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<span style="margin-left: 3px;">${matchTime}</span></div>
                                         <div class="mobile-team">${getTeamNameWithLogoLargeAfter(opponent)}</div>` :
                                        `<div class="mobile-team">${getTeamNameWithLogoLargeAfter(opponent)}</div>
                                         <div class="mobile-match-date" style="flex: 0 0 auto; font-size: 0.8rem; margin-bottom: 0; line-height: 1.2;">${matchDate}<span style="margin-left: 3px;">${matchTime}</span></div>
                                         <div class="mobile-team featured">${getTeamNameWithLogoLargeAfter(featuredTeamName)}</div>`
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
    } else {
        console.error('❌ Cannot add slide: slide-container element not found!');
    }
}


// Initialize slideshow
function initializeCarousel() {
    const slideContainer = document.getElementById('slide-container');
    if (!slideContainer) {
        console.error('❌ Cannot initialize carousel: slide-container element not found!');
        return;
    }
    
    const slides = slideContainer.querySelectorAll('.slide-item');
    totalSlides = slides.length;
    
    console.log('Initializing slideshow with', totalSlides, 'slides');
    
    // Set first slide as active
    if (slides.length > 0) {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[0].classList.add('active');
    }
    
    carouselInitialized = true;
    currentSlideIndex = 0;
    console.log('Slideshow initialized successfully');
    
    updateScreenNumber();
    startCountdown();
}

// Add simple slideshow navigation
let currentSlideIndex = 0;

function nextSlide() {
    const slideContainer = document.getElementById('slide-container');
    const slides = slideContainer.querySelectorAll('.slide-item');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');
    
    // Move to next slide (wrap around)
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    
    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');
    
    updateScreenNumber();
    startCountdown();
}

function previousSlide() {
    const slideContainer = document.getElementById('slide-container');
    const slides = slideContainer.querySelectorAll('.slide-item');
    
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
    
    countdownInterval = setInterval(() => {
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
    const element = document.getElementById('countdown-display');
    if (element) {
        // Add leading zero for numbers under 10
        const displayValue = currentCountdown < 10 ? `0${currentCountdown}` : currentCountdown;
        element.textContent = displayValue;
    }
}

function updateScreenNumber() {
    const element = document.getElementById('screen-number-display');
    if (element) {
        element.textContent = `${currentSlideIndex + 1}/${totalSlides}`;
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
    const oldIsMobile = isMobile;
    
    // Update device detection
    applyDeviceStyling();
    
    // If device type changed, refresh statistics
    if (oldIsMobile !== isMobile) {
        console.log('📱 Device type changed, refreshing statistics...');
        
        // Refresh statistics with current data
        loadData().then((data) => {
            updateMatchStatistics(data);
        }).catch(error => {
            console.error('Data refresh failed:', error);
            updateMatchStatistics(null);
        });
    }
});

// Refresh data every 30 minutes
setInterval(() => {
    console.log('Refreshing data...');
    loadData().then((data) => {
        updateMatchStatistics(data);
    }).catch(error => {
        console.error('Data refresh failed:', error);
        updateMatchStatistics(null);
    });
}, 30 * 60 * 1000);

// Function to set configuration from template
function setConfiguration(screenDuration) {
    SCREEN_DURATION_SECONDS = screenDuration;
    currentCountdown = screenDuration;
}