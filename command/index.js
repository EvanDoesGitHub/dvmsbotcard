// commands/index.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'index',
  description: 'Show collection progress and breakdown by rarity, including shiny counts',
  async execute(message, args, { cards, db }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId] || { collected: [], inventory: [] };

    // Ensure arrays exist
    user.collected = user.collected || [];
    user.inventory = user.inventory || [];

    // Total distinct cards in the system
    const totalCards = cards.length;

    // Ever-collected distinct IDs
    const collectedIds = new Set(user.collected);

    // Distinct shiny IDs ever collected
    const shinyIds = new Set(
      user.inventory
        .filter(c => c.shiny)
        .map(c => c.id)
    );

    // Rarity buckets
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Secret'];
    const collectedByRarity = {};
    const shinyByRarity = {};
    const totalByRarity = {};

    rarities.forEach(r => {
      collectedByRarity[r] = new Set();
      shinyByRarity[r] = new Set();
      totalByRarity[r] = cards.filter(c => c.rarity === r).length;
    });

    // Populate collectedByRarity
    for (const id of collectedIds) {
      const def = cards.find(c => c.id === id);
      if (def) collectedByRarity[def.rarity].add(id);
    }

    // Populate shinyByRarity
    for (const id of shinyIds) {
      const def = cards.find(c => c.id === id);
      if (def) shinyByRarity[def.rarity].add(id);
    }

    // Total shiny count
    const totalShinyCount = shinyIds.size;

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Collection Index`)
      .setColor(0x00AE86)
      .setDescription(
        `**Total cards collected:** ${collectedIds.size} / ${totalCards}\n` +
        `**Total shiny cards collected:** ${totalShinyCount}`
      )

      // Ever-collected rows
      .addFields(
        rarities.map(r => ({
          name: `${r}`,
          value: `${collectedByRarity[r].size} / ${totalByRarity[r]}`,
          inline: true
        }))
      )

      // Separator
      .addFields({ name: '\u200b', value: '\u200b', inline: false })

      // Shiny-collected rows
      .addFields(
        rarities.map(r => ({
          name: `✨ ${r} Shiny`,
          value: `${shinyByRarity[r].size} / ${totalByRarity[r]}`,
          inline: true
        }))
      );

    return message.reply({ embeds: [embed] });
  }
};
