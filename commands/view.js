// commands/view.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'view',
  description: 'View details about a specific card you own: `!view <cardId>`',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId];

    if (!user?.inventory?.length) {
      return message.reply("You have no cards in your inventory to view.");
    }

    // Parse the cardId (allow "1" or "card1")
    const raw = args[0];
    if (!raw) {
      return message.reply("Please specify a card ID. Usage: `!view <cardId>`");
    }
    const cardId = raw.toString().toLowerCase().startsWith('card')
      ? raw.toLowerCase()
      : `card${raw}`;

    // Filter the user's inventory for that cardId
    const matches = user.inventory.filter(c => c.id.toLowerCase() === cardId);
    if (!matches.length) {
      return message.reply(`You don't have any cards with ID **${cardId}**.`);
    }

    // Sort by acquired timestamp if available, otherwise by insertion order
    matches.sort((a, b) => {
      if (a.acquired && b.acquired) return a.acquired - b.acquired;
      return 0;
    });

    const first = matches[0];
    const totalOwned = matches.length;

    // Count conditions & shiny statuses
    const breakdown = matches.reduce((acc, c) => {
      const key = `${c.condition}${c.shiny ? ' ✨' : ''}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Format the breakdown into lines
    const breakdownLines = Object.entries(breakdown)
      .map(([label, qty]) => `• ${label} ×${qty}`)
      .join('\n');

    // Format acquisition time
    const firstTime = first.acquired
      ? new Date(first.acquired).toLocaleString('en-US', { timeZone: 'America/Toronto' })
      : 'Unknown';

    // Build and send embed
    const embed = new EmbedBuilder()
      .setTitle(`${first.title} — Details`)
      .setThumbnail(first.image) // small image on corner
      .setColor(0x00AE86)
      .addFields(
        { name: 'Rarity', value: first.rarity, inline: true },
        { name: 'Total Owned', value: `${totalOwned}`, inline: true },
        { name: 'First Obtained', value: firstTime, inline: false },
        { name: 'Condition Breakdown', value: breakdownLines, inline: false }
      )
      .setImage(first.image)
      .setFooter({ text: `Card ID: ${cardId}` });

    return message.reply({ embeds: [embed] });
  }
};
