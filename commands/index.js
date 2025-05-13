const { EmbedBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'index',
  description: 'Show collection progress and breakdown by rarity, including shiny counts',
  async execute(message, args, { cards, db }) {
    try {
      await db.read();
      const userId = message.author.id;
      // Use a more robust way to get user data, ensuring it's always an object.
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
          .map(c => c.cardId) // Changed to c.cardId
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
      for (const card of user.inventory) {
        if (card.shiny) {
          const def = cards.find(c => c.id === card.cardId); // Changed to use cardId
          if (def) {
            shinyByRarity[def.rarity].add(card.cardId); // Added cardId
          }
        }
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
    } catch (error) {
      console.error("Error in index command:", error, { userId: message.author.id });
      message.reply("An error occurred while processing your request.");
    }
  }
};
