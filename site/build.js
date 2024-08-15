import Eleventy from '@11ty/eleventy';

// const { default: tours2024 } = await import(`_data/2024/tournaments.json`, {with: {type: 'json'}});
const data = process.argv.filter(el=>el.startsWith('--data')).map(el=>el.split('=')).pop()?.[1] ?? './_data';
const { default: tours2024 } = await import(`${data}/2024/tournaments.json`, { with: { type: 'json' }});

async function build() {
  const input = process.argv.filter(el=>el.startsWith('--input')).map(el=>el.split('=')).pop()?.[1] ?? 'pages';
  const output = process.argv.filter(el=>el.startsWith('--output')).map(el=>el.split('=')).pop()?.[1] ?? '_site';

  let eleventy = new Eleventy(input, output, {
    config: (eleventyConfig) => {
      eleventyConfig.addPassthroughCopy({ 'site/node_modules/mvp.css/mvp.css' : '/css/mvp.css' });
      eleventyConfig.addPassthroughCopy({ 'site/static' : '/' });
      eleventyConfig.addGlobalData('layout', 'base.liquid');
      eleventyConfig.addGlobalData('years', [2024]);
      eleventyConfig.addGlobalData(2024, {tournaments: tours2024});
    }
  });

  await eleventy.write();
}

await build();

