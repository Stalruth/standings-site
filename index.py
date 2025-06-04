from datetime import datetime
import json
import math
import os
import re

from flask import abort, Flask, render_template
import jinja2
from markupsafe import Markup
from werkzeug.exceptions import HTTPException, NotFound

app = Flask(__name__, static_url_path='')


with open('icondata.json', 'r') as infile:
    icon_data = json.load(infile)

DATA = os.getenv('STANDINGS_DATA', 'data')


@app.template_filter('percent')
def percent(value):
    return "{:.2f}%".format(value * 100)


@app.template_filter('pokemonIcon')
def pokemon_icon(pokemon_set):
    if 'species' in pokemon_set:
        species = pokemon_set['species']
    else:
        species = 'Unknown'

    p = re.compile('[^a-z0-9]')
    species_id = p.sub('', species.lower())
    icon_info = icon_data['pokemon'][species_id]
    num = icon_info['n']
    if num < 0 or num > 1025:
        num = 0
    if 'i' in icon_info:
        num = icon_info['i']
    top = -math.floor(num / 12) * 30
    left = -(num % 12) * 40

    return Markup(f'<span class="pokemon-icon" title="{species}" style="background-position: {left}px {top}px"></span>')


restricted_pokemon = {
        'Mewtwo', 'Lugia', 'Ho-Oh', 'Kyogre', 'Groudon', 'Rayquaza', 'Dialga',
        'Dialga-Origin', 'Palkia', 'Palkia-Origin', 'Giratina', 'Giratina-Origin',
        'Reshiram', 'Zekrom', 'Kyurem', 'Kyurem-White', 'Kyurem-Black', 'Xerneas',
        'Yveltal', 'Zygarde', 'Zygarde-10%', 'Solgaleo', 'Lunala', 'Necrozma',
        'Necrozma-Dusk-Mane', 'Necrozma-Dawn-Wings', 'Zacian', 'Zacian-Crowned',
        'Zamazenta', 'Zamazenta-Crowned', 'Eternatus', 'Calyrex', 'Calyrex-Ice',
        'Calyrex-Shadow', 'Koraidon', 'Miraidon', 'Terapagos', 'Terapagos-Terastal'
}


def key_restricted(value):
    return value['species'] not in restricted_pokemon


@app.template_filter('sortTeam')
def sort_team(team):
    return sorted(team, key=key_restricted)


@app.template_filter('summariseTeam')
def summarise_team(team):
    return Markup(''.join([pokemon_icon(pokemon_set) for pokemon_set in team]))


@app.template_filter('printSet')
def print_set(pokemon_set):
    item = f" @ {pokemon_set['item']}" if 'item' in pokemon_set else ''
    ability = f"Ability: {pokemon_set['ability']}" if 'ability' in pokemon_set else ''
    tera = f"Tera Type: {pokemon_set['teraType']}" if 'teraType' in pokemon_set else ''
    if 'moves' in pokemon_set:
        moves = '<br>'.join([f"- {move}" for move in pokemon_set['moves']])
    else:
        moves = ''
    return Markup(f"{pokemon_set['species']}{item}<br>{ability}<br>{tera}<br>{moves}")


@app.template_filter('printRecord')
def print_record(player):
    if 'record' not in player:
        return '-'
    wins = player['record']['wins']
    losses = player['record']['losses']
    ties = player['record']['ties']
    if ties != 0:
        return f"{wins}-{losses}-{ties}"
    else:
        return f"{wins}-{losses}"


@app.template_filter('printRank')
def print_rank(rank):
    if rank is None:
        return 'DQ'
    return rank


@app.template_filter('cutRound')
def cut_round(current_round, total_rounds):
    if current_round == total_rounds:
        return 'Finals'
    return f"Top {math.floor(2 ** (total_rounds - current_round + 1))}"


@app.template_filter('roundsPlayed')
def rounds_played(rounds):
    result = 0
    for roundset in rounds:
        result += len(roundset['rounds'])
    return result


@app.template_filter('resultName')
def result_name(value):
    results = {
            'L': 'Loss',
            'W': 'Win',
            'T': 'Tie'
    }
    if value in results:
        return results[value]
    return 'Ongoing'


@app.template_filter('date')
def print_date(value):
    return datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M")


@app.template_filter('playerById')
def player_by_id(pid, players):
    if f"{pid}" in players:
        return players[f"{pid}"]
    return {}


@app.route('/')
def index():
    with open(f"{DATA}/years.json", 'r') as infile:
        years = json.load(infile)
    current_year = years[-1]
    with open(f"{DATA}/{current_year}/tournaments.json", 'r') as infile:
        tournaments = json.load(infile)

    return render_template(
            'index.html',
            title='VGC Homemade Standings',
            permalink='/',
            description='VGC Homemade Standings',
            tournaments=tournaments)

# TODO are we sure there's no directory traversal here
@app.route('/<int:year>/')
def year(year):
    try:
        with open(f"{DATA}/{year}/tournaments.json", 'r') as infile:
            tournaments = json.load(infile)
    except FileNotFoundError:
        raise NotFound

    return render_template(
            'year.html',
            title=f'VGC {year} Homemade Standings',
            permalink='/{year}/',
            description=f'VGC {year} Homemade Standings',
            year=year,
            tournaments=tournaments)

@app.route('/<int:year>/<tid>/')
def tournament(year, tid):
    try:
        with open(f"{DATA}/{year}/{tid}/tournament.json") as infile:
            tournament = json.load(infile)
    except FileNotFoundError:
        raise NotFound

    return render_template(
            'tour.html',
            title=f"{tournament['name']} - VGC Homemade Standings",
            permalink=f"/{year}/{tid}/",
            description=f"Homemade Standings for the {tournament['name']}.",
            divisions=[
                {'name': 'Juniors', 'id': 'juniors'},
                {'name': 'Seniors', 'id': 'seniors'},
                {'name': 'Masters', 'id': 'masters'}
            ],
            tournament=tournament)

@app.route('/<int:year>/<tid>/<divid>/')
def division(year, tid, divid):
    tour_base = f"{DATA}/{year}/{tid}"
    div_base = f"{tour_base}/{divid}"

    try:
        with open(f"{tour_base}/tournament.json") as infile:
            tournament = json.load(infile)

        division = {
                'id': divid,
                'name': divid.capitalize()
        }

        with open(f"{div_base}/players.json") as infile:
            division['players'] = json.load(infile)

        with open(f"{div_base}/standings.json") as infile:
            division['standings'] = json.load(infile)
    except FileNotFoundError:
        raise NotFound

    try:
        with open(f"{div_base}/top-cut.json") as infile:
            division['top_cut'] = json.load(infile)
    except FileNotFoundError:
        pass

    return render_template(
            'division.html',
            title=f"{division['name']}: {tournament['name']} - VGC Homemade Standings",
            permalink=f"/{year}/{tid}/{divid}/",
            description=f"Homemade Standings for the {tournament['name']}: {division['name']} Division.",
            division=division,
            tournament=tournament
    )

@app.route('/<int:year>/<tid>/<divid>/<int:pid>/')
def player(year, tid, divid, pid):
    player_id = f"{pid}"

    division = {
            'id': divid,
            'name': divid.capitalize()
    }

    try:
        with open(f"{DATA}/{year}/{tid}/tournament.json") as infile:
            tournament = json.load(infile)

        with open(f"{DATA}/{year}/{tid}/{divid}/players.json") as infile:
            players = json.load(infile)
            player = players[player_id]
    except FileNotFoundError:
        raise NotFound

    return render_template(
            'player.html',
            title=f"{player['name']}: {tournament['name']} - VGC Homemade Standings",
            permalink=f"/{year}/{tid}/{divid}/{pid}/",
            description=f"Player Details for {player['name']} playing in the {tournament['name']} - VGC Homemade Standings",
            tournament=tournament,
            player=player,
            players=players,
            division=division
    )


@app.errorhandler(HTTPException)
def handle_exception(e):
    return render_template('error.html',
            error=e), e.code

