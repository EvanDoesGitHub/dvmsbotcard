const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'mygroups',
  description: 'View a summary of your card groups for trading (group ID format).',
  async execute(message, args, { db, cards }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId];

    if (!user || !user.inventory.length) {
      return message.reply("You don't have any cards yet. Use `!drop` to get started!");
    }

    const groupSummary = {};

    for (const item of user.inventory) {
      const groupId = `${item.id}.${item.shiny ? 1 : 0}.${item.condition === 'Poor' ? 3 : item.condition === 'Great' ? 4 : 2}`;
      if (!groupSummary[groupId]) {
        const cardData = cards.find(c => c.id === item.id) || {};
        groupSummary[groupId] = {
          count: 0,
          title: cardData.title || 'Unknown Title',
          rarity: cardData.rarity || 'Unknown',
          shiny: item.shiny,
          condition: item.condition
        };
      }
      groupSummary[groupId].count++;
    }

    const lines = Object.entries(groupSummary).map(([groupId, data]) => {
      const sparkle = data.shiny ? '✨' : '';
      const condIcon = data.condition === 'Poor' ? '⚠️' :
                       data.condition === 'Great' ? '🌟' : '🔹';
      return `• ${sparkle}${data.title} (${data.rarity}) ${condIcon} ×${data.count} — \`${groupId}\``;
    });

    const groupIds = Object.keys(groupSummary);
    if (groupIds.length > 0) {
      user.lastGroupId = groupIds[0]; // Store the first group shown
      await db.write();
    }

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Card Groups`)
      .setDescription(lines.join('\n') || 'No cards to show.')
      .setFooter({ text: 'Use these group IDs with !offer <groupId> <qty>' })
      .setColor(0x3498db);

    return message.channel.send({ embeds: [embed] });
  }
};
