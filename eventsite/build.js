import Eleventy from '@11ty/eleventy';
import { Icons } from '@pkmn/img';

// const { default: tours2024 } = await import(`_data/2024/tournaments.json`, {with: {type: 'json'}});
const data = process.argv.filter(el=>el.startsWith('--data')).map(el=>el.split('=')).pop()?.[1] ?? './_data';
const { default: tournament } = await import(`${data}/tournament.json`, { with: { type: 'json' }});

const divisions = [];
for (let division of ['Juniors', 'Seniors', 'Masters']) {
  const id = division.toLowerCase();
  if (!tournament.players[id]) {
    continue;
  }
  const divData = {
    'id': id,
    'name': division,
    'standings': (await import(`${data}/${id}/standings.json`, { with: { type: 'json' }})).default,
    'players': (await import(`${data}/${id}/players.json`, { with: { type: 'json' }})).default
  };

  try {
    divData['top_cut'] = (await import(`${data}/${id}/top-cut.json`, { with: { type: 'json' }})).default;
  } catch(e) {
    divData['top_cut'] = {}
  }

  divisions.push(divData);
}

const divIds = {juniors: 0, seniors: 1, masters: 2};
const players_divisions = divisions.map(div => div.standings.map(id => ({...div.players[id], division: div.id, divId: divIds[div.id]}))).flat();

function summariseTeam(team) {
  return Array.from({...team, length:6}).map(el => `<span style="${Icons.getPokemon(el?.species).style}"></span>`).join('');
}

async function build() {
  const input = process.argv.filter(el=>el.startsWith('--input')).map(el=>el.split('=')).pop()?.[1] ?? 'pages';
  const output = process.argv.filter(el=>el.startsWith('--output')).map(el=>el.split('=')).pop()?.[1] ?? '_site';

  let eleventy = new Eleventy(input, output, {
    config: (eleventyConfig) => {
      eleventyConfig.addGlobalData('layout', 'base.liquid');
      eleventyConfig.addGlobalData('tournament', tournament);
      eleventyConfig.addGlobalData('divisions', divisions);
      eleventyConfig.addGlobalData('players_divisions', players_divisions);
      eleventyConfig.addLiquidFilter('percent', num => `${(num * 100).toFixed(2)}%`);
      eleventyConfig.addLiquidFilter('summariseTeam', summariseTeam);
      eleventyConfig.addLiquidFilter('cutRound', (round, totalRounds) => round === totalRounds ? 'Finals' : `Top ${2 ** (totalRounds - round + 1)}`);
      eleventyConfig.addLiquidFilter('roundsPlayed', (rounds) => rounds.reduce((acc, cur) => acc + cur.rounds.length, 0))
    }
  });

  await eleventy.write();
}

await build();
