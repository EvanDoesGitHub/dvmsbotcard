// commands/auctions.js
const { EmbedBuilder } = require('discord.js');

function formatTime(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 1000 / 60) % 60;
  const h = Math.floor(ms / 1000 / 60 / 60);
  return [
    h > 0 ? `${h}h` : null,
    m > 0 ? `${m}m` : null,
    `${s}s`
  ].filter(Boolean).join(' ');
}

module.exports = {
  name: 'auctions',
  description: '🔎 View all active auctions',
  async execute(message, args, { db }) {
    await db.read();
    const now = Date.now();
    db.data.auctions ||= {};

    // Collect only active, not-yet-ended auctions
    const active = Object.values(db.data.auctions).filter(a =>
      !a.ended && now < a.expiresAt
    );

    if (active.length === 0) {
      return message.reply('There are currently no active auctions.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🏷️ Active Auctions')
      .setColor(0x00AE86)
      .setDescription(active.map(a => {
        const timeLeft = formatTime(a.expiresAt - now);
        const highest = a.highestBid ?? a.startingBid ?? 0;
        const bidder = a.highestBidder ? `<@${a.highestBidder}>` : 'None';
        return (
          `**ID:** \`${a.id}\`\n` +
          `**Item:** ${a.card.title}\n` +
          `**Current Bid:** ${highest}₩ by ${bidder}\n` +
          `**Time Left:** ${timeLeft}`
        );
      }).join('\n\n'));

    return message.reply({ embeds: [embed] });
  }
};
