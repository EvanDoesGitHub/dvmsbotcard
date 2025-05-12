const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'remove',
  description: 'Remove cards from your active trade: `!remove <groupId> <quantity>` (e.g. card1.1.4)',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const tradeId = db.data.activeTrades?.[userId];
    if (!tradeId) {
      return message.reply("You have no active trade. Start one with `!trade @user`.");
    }

    const trade = db.data.trades[tradeId];
    const groupId = args[0];
    const qty = parseInt(args[1], 10);

    if (!groupId || isNaN(qty) || qty < 1) {
      return message.reply('Usage: `!remove <groupId> <quantity>` (e.g. `card1.1.4`)');
    }

    // Parse groupId into components
    const parts = groupId.split('.');
    if (parts.length !== 3) {
      return message.reply('Invalid group ID format. Use `<cardId>.<shinyCode>.<conditionCode>`');
    }

    const [rawCardId, shinyCode, conditionCode] = parts;
    const cardId = rawCardId.startsWith('card') ? rawCardId : `card${rawCardId}`;
    const shiny = shinyCode === '1';
    const condition = conditionCode === '3' ? 'Poor' :
                      conditionCode === '4' ? 'Great' :
                      'Average';

    const userOffers = trade.offers[userId] || [];

    // Filter offers by group ID to identify cards to remove
    const toRemove = userOffers.filter(c =>
      c.id === cardId &&
      c.shiny === shiny &&
      c.condition === condition
    );

    if (toRemove.length < qty) {
      return message.reply(`You only have ${toRemove.length} of ${groupId} in your current offer.`);
    }

    // Remove the specified cards from the offer
    const removeThese = toRemove.slice(0, qty).map(c => c.instanceId);
    trade.offers[userId] = userOffers.filter(c => !removeThese.includes(c.instanceId));
    await db.write();

    // Summarize the current offers (including shiny and condition details)
    const summarize = uid => {
      const items = trade.offers[uid] || [];
      if (!items.length) return 'None';
      
      const counts = items.reduce((acc, c) => {
        const shiny = c.shiny ? '✨' : '';
        const condition = c.condition === 'Poor' ? '📉' : 
                          c.condition === 'Great' ? '📈' : '📊';
        const groupId = `${c.id}.${c.shiny ? 1 : 0}.${c.condition === 'Poor' ? 3 : c.condition === 'Great' ? 4 : 2}`;
        const key = `${shiny}${condition} ${c.title} | ${groupId}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([t, q]) => `• ${t} ×${q}`)
        .join('\n');
    };

    // Build the embed for the trade summary
    const embed = new EmbedBuilder()
      .setTitle(`Trade #${tradeId} Offers`)
      .setDescription(
        `<@${trade.a}> offers:\n${summarize(trade.a)}\n\n` +
        `<@${trade.b}> offers:\n${summarize(trade.b)}`
      )
      .addFields({ name: 'Next step', value: 'Use `!confirm` when ready.' })
      .setColor(0x00AE86);

    // Send the embed to the channel
    return message.channel.send({ embeds: [embed] });
  }
};
