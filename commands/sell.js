const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'sell',
  description: 'Sell cards by group ID or card ID. Examples: `!sell 5.1.2 2`, `!sell card5.0.4 all`, `!sell 5 all`, `!sell last`',
  async execute(message, args, { db, cards }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId];
    if (!user || !user.inventory?.length) return message.reply("You don't have any cards.");

    let input = args[0];
    const amountArg = args[1]?.toLowerCase() ?? '1';

    if (!input) {
      return message.reply("Usage: `!sell <groupId|cardId|last> [amount|all]`.\nExamples: `!sell 5.1.3 2`, `!sell card5.0.2 all`, `!sell 5 all`, `!sell last`");
    }

    if (input === 'last') {
      if (!user.lastGroupId) {
        return message.reply("You haven't used `!mygroups` or similar command yet, so there's no last group to sell.");
      }
      input = user.lastGroupId;
    }

    const parts = input.split('.');
    let candidates;

    if (parts.length === 3) {
      // Full group ID: cardId.shiny.condition
      let [rawId, shinyCode, condCode] = parts;
      const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
      const shiny = shinyCode === '1';
      const condition = condCode === '3' ? 'Poor' : condCode === '4' ? 'Great' : 'Average';

      candidates = user.inventory.filter(c =>
        c.cardId === cardId &&
        c.shiny === shiny &&
        c.condition === condition
      );

      if (!candidates.length) {
        return message.reply(`You don’t have any cards matching **${input}**.`);
      }
    } else {
      // General sell by card ID only
      const rawId = input;
      const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
      candidates = user.inventory.filter(c => c.cardId === cardId);

      if (!candidates.length) {
        return message.reply(`You don’t have any cards with ID **${cardId}**.`);
      }
    }

    let toSell;
    if (amountArg === 'all') {
      toSell = candidates;
    } else {
      const count = parseInt(amountArg);
      if (isNaN(count) || count < 1) {
        return message.reply("Invalid amount. Use a number or `all`.");
      }
      if (count > candidates.length) {
        return message.reply(`You only have ${candidates.length} of **${input}**, but tried to sell ${count}.`);
      }
      toSell = candidates.slice(0, count);
    }

    const removeIds = new Set(toSell.map(c => c.instanceId));
    user.inventory = user.inventory.filter(c => !removeIds.has(c.instanceId));

    const totalValue = toSell.reduce((sum, c) => {
      const baseCard = cards.find(card => card.id === c.cardId);
      if (!baseCard) return sum;
      let value = baseCard.value;
      if (c.shiny) value = Math.ceil(value * 1.4);
      if (c.condition === 'Poor') value = Math.ceil(value * 0.85);
      if (c.condition === 'Great') value = Math.ceil(value * 1.15);
      return sum + value;
    }, 0);

    user.balance = (user.balance || 0) + totalValue;
    await db.write();

    const first = toSell[0];
    const cardInfo = cards.find(c => c.id === first.cardId);
    const embed = new EmbedBuilder()
      .setTitle(`🪙 Sold ${toSell.length}× ${cardInfo.title}`)
      .setDescription(
        `You sold ${toSell.length} card(s) from **${input}** for **${totalValue}₩**.\n` +
        `💰 New Balance: **${user.balance}₩**`
      )
      .setColor(0xFFD700);

    return message.reply({ embeds: [embed] });
  }
};
