// scripts/addCard.js
const fs = require('fs');
const path = require('path');
const argv = require('yargs')
  .option('name',     { type: 'string',  demandOption: true })
  .option('rarity',   { type: 'string',  choices: ['Common','Uncommon','Rare','Epic','Legendary','Secret'], demandOption: true })
  .option('image',    { type: 'string',  demandOption: true })
  .argv;

const ranges = {
  Common:    [10,   25],
  Uncommon:  [30,   60],
  Rare:      [60,  120],
  Epic:      [120, 250],
  Legendary: [250, 500],
  Secret:    [500,1000]
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  const file = path.resolve(__dirname, '../cards.json');
  const cards = JSON.parse(fs.readFileSync(file, 'utf8'));

  // 1) Compute new sequential ID
  const existingNums = cards
    .map(c => parseInt(c.id.replace(/^card/,''),10))
    .filter(n => !isNaN(n));
  const nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 1;
  const id = `card${nextNum}`;

  // 2) Pick a random value in the rarity’s preset range
  const [min, max] = ranges[argv.rarity];
  const value = randInt(min, max);

  // 3) Build and append
  const newCard = {
    id,
    title: argv.name,
    rarity: argv.rarity,
    image: argv.image,
    value
  };
  cards.push(newCard);

  // 4) Save
  fs.writeFileSync(file, JSON.stringify(cards, null, 2));
  console.log(`✅ Added ${id} – "${argv.name}" (${argv.rarity}) @ ${value}₩`);
})();
