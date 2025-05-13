const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cooldown',
  description: 'Check your cooldowns for !daily and !drop.',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId] ||= {
      inventory: [],
      balance: 0,
      dailyStreak: 0,
      lastDaily: 0,
      cooldownEnd: 0,
      lastDrops: []
    };

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const GRACE = 6 * 60 * 60 * 1000;

    // === DAILY COOLDOWN ===
    let dailyStatus;
    const timeSinceDaily = now - (user.lastDaily ?? 0);
    if (timeSinceDaily >= ONE_DAY) {
      if (timeSinceDaily <= ONE_DAY + GRACE) {
        dailyStatus = '✅ Available (within streak grace window)';
      } else {
        dailyStatus = '✅ Available (streak will reset)';
      }
    } else {
      const msLeft = ONE_DAY - timeSinceDaily;
      const hrs = Math.floor(msLeft / (1000 * 60 * 60));
      const mins = Math.ceil((msLeft % (1000 * 60 * 60)) / (1000 * 60));
      dailyStatus = `⏳ ${hrs}h ${mins}m until available`;
    }

    // === DROP COOLDOWN ===
    let dropStatus;
    if (!user.cooldownEnd || user.cooldownEnd <= now) {
      dropStatus = '✅ Available';
    } else {
      const msLeft = user.cooldownEnd - now;
      const hrs = Math.floor(msLeft / (1000 * 60 * 60));
      const mins = Math.ceil((msLeft % (1000 * 60 * 60)) / (1000 * 60));
      dropStatus = `⏳ ${hrs}h ${mins}m until available`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`⏱️ Cooldown Status`)
      .addFields(
        { name: '🗓️ !daily', value: dailyStatus, inline: false },
        { name: '🎴 !drop', value: dropStatus, inline: false }
      )
      .setColor(0x3399FF);

    return message.reply({ embeds: [embed] });
  }
};
