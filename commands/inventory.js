const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'inventory',
  description: 'Show your collected cards, their IDs, quantities, and total worth in ₩',
  async execute(message, args, { db, cards }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId];
    if (!user || !user.inventory.length) {
      return message.reply('Your inventory is empty. Use `!drop` to collect cards!');
    }

    const groups = {};
    let totalWorth = 0;

    for (const cardId of user.inventory) {
      const cardParts = cardId.split('.'); // cardId.shiny.condition.protected
      const baseCardId = cardParts[0];
      const shiny = cardParts[1] === '1';
      const conditionCode = cardParts[2]; // "2", "3", or "4"
      const protectedStatus = cardParts[3] === '2'; // "0" or "2"

      const baseCard = cards.find(c => c.id === baseCardId);
      if (!baseCard) continue;

      let condition = 'Average';
      if (conditionCode === '3') condition = 'Poor';
      else if (conditionCode === '4') condition = 'Great';

      // compute final value after shiny & condition
      const baseValue = shiny ? Math.ceil(baseCard.value * 1.4) : baseCard.value;
      let conditionMultiplier = 1;
      if (condition === 'Poor') conditionMultiplier = 0.85;
      if (condition === 'Great') conditionMultiplier = 1.15;
      const finalValue = Math.ceil(baseValue * conditionMultiplier);

      const groupKey = `${baseCardId}.${shiny ? '1' : '0'}.${conditionCode}.${protectedStatus ? '2' : '0'}`; // Include protected in key

      if (!groups[groupKey]) {
        groups[groupKey] = {
          cardInfo: {
            ...baseCard,
            shiny: shiny,
            condition: condition,
            value: finalValue,
            protected: protectedStatus, // Store protected status
          },
          count: 0
        };
      }
      groups[groupKey].count++;
      totalWorth += finalValue;
    }

    // convert to array and sort by descending group worth
    const cardGroups = Object.entries(groups).sort((a, b) => {
      const [, A] = a;
      const [, B] = b;
      return (B.cardInfo.value * B.count) - (A.cardInfo.value * A.count);
    });

    const itemsPerPage = 5;
    const totalPages = Math.ceil(cardGroups.length / itemsPerPage);
    let currentPage = 0;

    const createEmbed = page => {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Inventory`)
        .setDescription(
          `**Total cards:** ${user.inventory.length}\n` +
          `**Total worth:** ${totalWorth}₩\n` +
          `**Page:** ${page + 1}/${totalPages}`
        )
        .setColor(0x00AE86);

      const slice = cardGroups.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
      for (const [groupKey, { cardInfo, count }] of slice) { // Destructure cardInfo
        const groupWorth = cardInfo.value * count;
        const shinyLabel = cardInfo.shiny ? '✨ SHINY CARD ✨' : '';
        const conditionLbl = cardInfo.condition === 'Poor' ? '⚠️ Poor Condition'
          : cardInfo.condition === 'Great' ? '🌟 Great Condition'
            : '🔹 Average Condition';
        const protectedLabel = cardInfo.protected ? '🔒 Protected' : ''; // Get protected status

        embed.addFields({
          name: `ID: **${groupKey}** — ${cardInfo.title} ${shinyLabel} ${conditionLbl} ${protectedLabel}`, // Added protectedLabel
          value: `Quantity: ${count}\n` +
            `Value per card: ${cardInfo.value}₩\n` +
            `Group worth: ${groupWorth}₩`,
          inline: false
        });
      }

      // updated commands list
      embed.addFields({
        name: 'Commands',
        value:
          '`!offer <cardId> <quantity>` to offer cards\n' +
          '`!sell <groupId> <amount|all>` to sell cards for ₩\n' +
          '`!trade @user` to start a trade\n' +
          '`!auction` to manage auctions\n' +
          '`!index` to view collection progress\n' +
          '`!leaderboard` to see top collectors',
        inline: false
      });

      return embed;
    };

    const sent = await message.reply({ embeds: [createEmbed(currentPage)] });
    await sent.react('⏪');
    await sent.react('⏩');

    const filter = (reaction, user) =>
      ['⏪', '⏩'].includes(reaction.emoji.name) && user.id === message.author.id;
    const collector = sent.createReactionCollector({ filter, time: 60000 });

    collector.on('collect', reaction => {
      if (reaction.emoji.name === '⏪' && currentPage > 0) currentPage--;
      if (reaction.emoji.name === '⏩' && currentPage < totalPages - 1) currentPage++;
      sent.edit({ embeds: [createEmbed(currentPage)] });
      reaction.users.remove(message.author);
    });

    collector.on('end', () => {
      sent.reactions.removeAll().catch(console.error);
    });
  }
};
