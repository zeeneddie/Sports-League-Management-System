# Mapping van clubnamen naar logo bestanden voor Overige Apeldoornse clubs
CLUB_LOGO_MAPPING = {
    # Exacte matches met logo bestanden
    'Albatross': 'albatross.gif',
    'TKA': 'tka.gif',
    'WSV': 'wsv.gif',
    'Victoria Boys': 'victoriaboys.gif',
    'Loenermark': 'loenermark.gif',
    'Robur et Velocitas': 'roburetvelocitas.gif',
    'Brummen SP': 'brummensp.gif',
    'Apeldoornse Boys': 'apeldoorncsv.gif',
    'Voorst': 'voorst.gif',
    'CCW 16': 'ccw16.gif',
    'WWNA': 'wwna.gif',
    'Orderbos': 'orderbos.gif',
    'Oeken': 'oeken.gif',
    'Apeldoorn CSV': 'apeldoorncsv.gif',
    'Vaassen': 'vaassen.gif',

    # Mogelijke variaties die niet exact matchen
    'Alexandria': 'Alexandria.gif',
    'ZVV 56': 'zvv56.gif'
}

def get_club_logo(club_name):
    """
    Geeft het logo bestand voor een clubnaam terug
    """
    if club_name in CLUB_LOGO_MAPPING:
        return CLUB_LOGO_MAPPING[club_name]

    # Fallback: probeer lowercase variant
    for club, logo in CLUB_LOGO_MAPPING.items():
        if club.lower() == club_name.lower():
            return logo

    # Geen logo gevonden
    return None

def filter_apeldoornse_clubs(results):
    """
    Verwerk alle uitslagen en voeg logo informatie toe
    """
    processed_results = []
    for match in results:
        home_team = match.get('home', '')
        away_team = match.get('away', '')

        # Voeg logo informatie toe voor alle wedstrijden
        match['home_logo'] = get_club_logo(home_team)
        match['away_logo'] = get_club_logo(away_team)
        processed_results.append(match)

    return processed_results