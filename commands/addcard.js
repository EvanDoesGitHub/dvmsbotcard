// commands/addcard.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const ALLOWED_USER_ID = '722463127782031400'; // Your user ID

const ranges = {
  Common:    [10,   25],
  Uncommon:  [30,   60],
  Rare:      [60,  120],
  Epic:      [120, 250],
  Legendary: [250, 500],
  Mythic:    [500,1000],
  Secret:    [5000,10000]
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  name: 'addcard',
  description: '🔧 Add a new card to cards.json (owner only)',
  async execute(message, args) {
    // Restrict to one user ID
    if (message.author.id !== ALLOWED_USER_ID) {
      return message.reply("🚫 You are not allowed to use this command.");
    }

    // args: <rarity> <title words> <imageUrl>
    const [rarity, ...rest] = args;
    if (!ranges[rarity]) {
      return message.reply(`❌ Invalid rarity. Choose one of: ${Object.keys(ranges).join(', ')}`);
    }

    const image = rest.pop();
    const title = rest.join(' ');

    const file = path.resolve(__dirname, '../cards.json');
    const cards = JSON.parse(fs.readFileSync(file, 'utf8'));

    const nextId = cards
      .map(c => parseInt(c.id.replace(/^card/, ''), 10))
      .filter(n => !isNaN(n));

    const id = 'card' + (nextId.length ? Math.max(...nextId) + 1 : 1);
    const [min, max] = ranges[rarity];
    const value = randInt(min, max);

    const newCard = { id, title, rarity, image, value };
    cards.push(newCard);
    fs.writeFileSync(file, JSON.stringify(cards, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('🆕 Card Added')
      .addFields(
        { name: 'ID', value: id, inline: true },
        { name: 'Title', value: title, inline: true },
        { name: 'Rarity', value: rarity, inline: true },
        { name: 'Value', value: `${value}₩`, inline: true }
      )
      .setImage(image)
      .setColor(0x00AE86);

    return message.reply({ embeds: [embed] });
  }
};
