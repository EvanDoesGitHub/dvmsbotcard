// commands/endtrade.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'endtrade',
  description: 'Unilaterally cancel your active trade immediately, no consent needed.',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const tradeId = db.data.activeTrades?.[userId];
    if (!tradeId) {
      return message.reply("❌ You have no active trade to cancel.");
    }

    const trade = db.data.trades[tradeId];
    if (!trade) {
      // clean up if somehow stale
      delete db.data.activeTrades[userId];
      await db.write();
      return message.reply("❌ Trade not found or already completed.");
    }

    const a = trade.a, b = trade.b;
    // remove from both sides
    delete db.data.activeTrades[a];
    delete db.data.activeTrades[b];
    delete db.data.trades[tradeId];
    await db.write();

    // fetch both for display
    const userA = await message.client.users.fetch(a).catch(() => null);
    const userB = await message.client.users.fetch(b).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('❌ Trade Cancelled')
      .setDescription(
        `<@${userId}> has cancelled the trade.\n\n` +
        `• ${userA ? userA.tag : a}\n` +
        `• ${userB ? userB.tag : b}`
      )
      .setColor(0xFF0000)
      .setFooter({ text: `Trade ID: ${tradeId}` });

    return message.channel.send({
      embeds: [embed],
      allowedMentions: { users: [a, b] }
    });
  }
};
