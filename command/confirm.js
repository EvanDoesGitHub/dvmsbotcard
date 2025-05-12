const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'confirm',
  description: 'Confirm your active trade. Once both confirm, cards swap.',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const tradeId = db.data.activeTrades?.[userId];
    if (!tradeId) return message.reply("You have no active trade.");

    const trade = db.data.trades[tradeId];
    if (!trade) return message.reply("Trade session not found or already completed.");
    if (trade.confirmed.includes(userId)) return message.reply("You've already confirmed this trade.");

    trade.confirmed.push(userId);
    await db.write();

    // When both have confirmed:
    if (trade.confirmed.length === 2) {
      const [a, b] = [trade.a, trade.b];
      const offerA = trade.offers[a] || [];
      const offerB = trade.offers[b] || [];

      // Summarize helper (including shiny and condition)
      const summarize = items => {
        if (items.length === 0) return { text: 'Nothing', total: 0 };
        const counts = {};
        const values = {};
      
        for (const card of items) {
          const shinyEmoji = card.shiny ? '✨' : '';
          const conditionEmoji =
            card.condition === 'Poor' ? '📉' :
            card.condition === 'Great' ? '📈' :
            '📊';
      
          const groupId = `${card.id}.${card.shiny ? 1 : 0}.${card.condition === 'Poor' ? 3 : card.condition === 'Great' ? 4 : 2}`;
          const key = `${shinyEmoji}${conditionEmoji} ${card.title} | ${groupId}`;
      
          counts[key] = (counts[key] || 0) + 1;
          values[key] = (values[key] || 0) + card.value;
        }
      
        const lines = Object.entries(counts).map(
          ([label, qty]) => `• ${label} ×${qty} (₩${values[label]})`
        );
        const total = items.reduce((sum, c) => sum + c.value, 0);
        return { text: lines.join('\n'), total };
      };
      
      

      const summaryA = summarize(offerA);
      const summaryB = summarize(offerB);

      // **Swap inventories using instanceId matching**
      const invA = db.data.users[a].inventory;
      const invB = db.data.users[b].inventory;

      // Remove A's offered cards
      for (const card of offerA) {
        const idx = invA.findIndex(c => c.instanceId === card.instanceId);
        if (idx !== -1) invA.splice(idx, 1);
      }
      // Remove B's offered cards
      for (const card of offerB) {
        const idx = invB.findIndex(c => c.instanceId === card.instanceId);
        if (idx !== -1) invB.splice(idx, 1);
      }

      // Add them to the other inventory
      invA.push(...offerB);
      invB.push(...offerA);

      // Clean up trade state
      delete db.data.activeTrades[a];
      delete db.data.activeTrades[b];
      delete db.data.trades[tradeId];
      await db.write();

      // Fetch users for mentions
      const userAObj = await message.client.users.fetch(a);
      const userBObj = await message.client.users.fetch(b);

      // Build and send embed with proper allowedMentions
      const embed = new EmbedBuilder()
        .setTitle('Trade Completed')
        .addFields(
          {
            name: `${userAObj.toString()} gave (${summaryA.total}₩)`,
            value: summaryA.text,
            inline: true
          },
          {
            name: `${userBObj.toString()} gave (${summaryB.total}₩)`,
            value: summaryB.text,
            inline: true
          }
        )
        .setColor(0x00FF00);

      return message.channel.send({
        embeds: [embed],
        allowedMentions: { users: [a, b] }
      });
    }

    return message.reply('✅ You have confirmed. Waiting for the other person to confirm.');
  }
};
