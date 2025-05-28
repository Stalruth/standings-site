import Eleventy from '@11ty/eleventy';
import { Icons } from '@pkmn/img';

const data = process.argv.filter(el=>el.startsWith('--data')).map(el=>el.split('=')).pop()?.[1] ?? './_data';

const tournament = process.argv.filter(el=>el.startsWith('--tour'))?.map(el=>el.split('='))?.pop()?.[1];
const year = process.argv.filter(el=>el.startsWith('--year'))?.map(el=>el.split('='))?.pop()?.[1] ?? '2025';

function pokemonIcon(pokemonSet) {
    const species = pokemonSet?.species ?? 'Unknown';
    const iconData = Icons.getPokemon(species);
    return `<span class="pokemon-icon" title="${species}" style="background-position: ${iconData.left}px ${iconData.top}px"></span>`;
}

function summariseTeam(team) {
  let result = '';
  for(let i = 0; i < 6; i++) {
    result += pokemonIcon(team[i]);
  }
  return result;
}

function printSet(pokemonSet) {
  const item = pokemonSet.item ? ` @ ${pokemonSet.item}` : '';
  const ability = pokemonSet.ability ? `<br>Ability: ${pokemonSet.ability}` : '';
  const tera = pokemonSet.teraType ? `<br>Tera Type: ${pokemonSet.teraType}` : '';
  const moves = pokemonSet.moves ?? [];
  const movesString = moves.length > 0 ? '<br>' + moves.map(el => `- ${el}`).join('<br>') : '';
  return `${pokemonSet.species}${item}${ability}${tera}${movesString}`;
}

function printRecord(player) {
  if(!player) {
    return '-'
  }
  let result = `${player.record.wins}-${player.record.losses}`;
  if (player.record.ties !== 0) {
    result += `-${player.record.ties}`;
  }
  if (player.rounds[0].rounds[0].id === 0 && player.rounds[0].rounds[0].result === 'L') {
    result += `<abbr title="Late">*</abbr>`;
  }
  if (!player.rounds.at(-1).rounds.at(-1).result) {
    result += `<abbr title="Ongoing">^</abbr>`
  }
  return result
}

function printRank(rank) {
  if(rank === 9999) {
    return 'DQ';
  }
  return rank;
}

async function buildTour() {
  const { default: tour } = await import(`${data}/${year}/${tournament}/tournament.json`, { with: { type: 'json' }});

  const divisions = [];
  for (let division of ['Juniors', 'Seniors', 'Masters']) {
    const id = division.toLowerCase();
    const divData = {
      'id': id,
      'name': division,
    };

    try {
      divData['standings'] = (await import(`${data}/${year}/${tournament}/${id}/standings.json`, { with: { type: 'json' }})).default;
    } catch (e) {
      divData['standings'] = [];
    }

    try {
      divData['players'] = (await import(`${data}/${year}/${tournament}/${id}/players.json`, { with: { type: 'json' }})).default;
    } catch (e) {
      divData['players'] = {};
    }

    try {
      divData['top_cut'] = (await import(`${data}/${year}/${tournament}/${id}/top-cut.json`, { with: { type: 'json' }})).default;
    } catch(e) {
      divData['top_cut'] = undefined;
    }

    divisions.push(divData);
  }

  const divIds = {juniors: 0, seniors: 1, masters: 2};
  const players_divisions = divisions.map(div => div.standings.map(id => ({...div.players[id], division: div.id, divId: divIds[div.id]}))).flat();

  for(let item of players_divisions) {
    const restrictedPokemon = new Set([
      'Mewtwo', 'Lugia', 'Ho-Oh', 'Kyogre', 'Groudon', 'Rayquaza', 'Dialga',
      'Dialga-Origin', 'Palkia', 'Palkia-Origin', 'Giratina', 'Giratina-Origin',
      'Reshiram', 'Zekrom', 'Kyurem', 'Kyurem-White', 'Kyurem-Black', 'Xerneas',
      'Yveltal', 'Zygarde', 'Zygarde-10%', 'Solgaleo', 'Lunala', 'Necrozma',
      'Necrozma-Dusk-Mane', 'Necrozma-Dawn-Wings', 'Zacian', 'Zacian-Crowned',
      'Zamazenta', 'Zamazenta-Crowned', 'Eternatus', 'Calyrex', 'Calyrex-Ice',
      'Calyrex-Shadow', 'Koraidon', 'Miraidon', 'Terapagos', 'Terapagos-Terastal'
    ]);

    if(item.team) {
      item.team.sort((lhs,rhs) => {
        const lhsRestricted = restrictedPokemon.has(lhs.species);
        const rhsRestricted = restrictedPokemon.has(rhs.species);
        if(lhsRestricted === rhsRestricted) {
          return 0;
        }
        if(lhsRestricted) {
          return -1;
        }
        return 1;
      });
    }
  }

  const input = process.argv.filter(el=>el.startsWith('--input')).map(el=>el.split('=')).pop()?.[1] ?? 'pages';
  const output = process.argv.filter(el=>el.startsWith('--output')).map(el=>el.split('=')).pop()?.[1] ?? '_site';

  let eleventy = new Eleventy(input, output, {
    config: (eleventyConfig) => {
      eleventyConfig.ignores.add(`${input}/index.json`);
      eleventyConfig.ignores.add(`${input}/index.liquid`);
      eleventyConfig.ignores.add(`${input}/year.json`);
      eleventyConfig.ignores.add(`${input}/year.liquid`);
      eleventyConfig.addGlobalData('layout', 'base.liquid');
      eleventyConfig.addGlobalData('tournament', tour);
      eleventyConfig.addGlobalData('divisions', divisions);
      eleventyConfig.addGlobalData('players_divisions', players_divisions);
      eleventyConfig.addLiquidFilter('percent', num => `${(num * 100).toFixed(2)}%`);
      eleventyConfig.addLiquidFilter('pokemonIcon', pokemonIcon);
      eleventyConfig.addLiquidFilter('summariseTeam', summariseTeam);
      eleventyConfig.addLiquidFilter('printSet', printSet);
      eleventyConfig.addLiquidFilter('printRecord', printRecord);
      eleventyConfig.addLiquidFilter('printRank', printRank);
      eleventyConfig.addLiquidFilter('cutRound', (round, totalRounds) => round === totalRounds ? 'Finals' : `Top ${2 ** (totalRounds - round + 1)}`);
      eleventyConfig.addLiquidFilter('roundsPlayed', (rounds) => rounds.reduce((acc, cur) => acc + cur.rounds.length, 0))
      eleventyConfig.addLiquidFilter('resultName', (result) => ({'L': 'Loss', 'W': 'Win', 'T': 'Tie'}[result] ?? 'Ongoing'));
    }
  });

  await eleventy.write();
}

async function buildBase() {
  const { default: tours2024 } = await import(`${data}/2024/tournaments.json`, { with: { type: 'json' }});
  const { default: tours2025 } = await import(`${data}/2025/tournaments.json`, { with: { type: 'json' }});

  const input = process.argv.filter(el=>el.startsWith('--input')).map(el=>el.split('=')).pop()?.[1] ?? 'pages';
  const output = process.argv.filter(el=>el.startsWith('--output')).map(el=>el.split('=')).pop()?.[1] ?? '_site';

  let eleventy = new Eleventy(input, output, {
    config: (eleventyConfig) => {
      eleventyConfig.ignores.add(`${input}/tour.json`);
      eleventyConfig.ignores.add(`${input}/tour.liquid`);
      eleventyConfig.ignores.add(`${input}/division.json`);
      eleventyConfig.ignores.add(`${input}/division.liquid`);
      eleventyConfig.ignores.add(`${input}/player.json`);
      eleventyConfig.ignores.add(`${input}/player.liquid`);
      eleventyConfig.addPassthroughCopy({ 'node_modules/mvp.css/mvp.css' : '/css/mvp.css' });
      eleventyConfig.addPassthroughCopy({ 'static' : '/' });
      eleventyConfig.addGlobalData('layout', 'base.liquid');
      eleventyConfig.addGlobalData('years', [2024, 2025]);
      eleventyConfig.addGlobalData(2024, {tournaments: tours2024});
      eleventyConfig.addGlobalData(2025, {tournaments: tours2025});
    }
  });

  await eleventy.write();
}

if(tournament) {
  await buildTour();
} else {
  await buildBase();
}

