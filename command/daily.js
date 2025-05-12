const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'daily',
  description: 'Collect your daily coins. Rewards increase with streaks!',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;
    const user = db.data.users[userId] ||= { inventory: [], balance: 0 };

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const GRACE_PERIOD = 6 * 60 * 60 * 1000;

    const lastDaily = user.lastDaily ?? 0;
    const streak = user.dailyStreak ?? 0;

    const timeSinceLast = now - lastDaily;

    if (timeSinceLast < ONE_DAY) {
      const remainingMs = ONE_DAY - timeSinceLast;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      return message.reply(`⏳ You already claimed your daily. Come back in **${hours}h ${minutes}m**.`);
    }

    // Determine if the streak should reset
    let newStreak = streak;
    if (timeSinceLast > ONE_DAY + GRACE_PERIOD) {
      newStreak = 0;
    }

    newStreak += 1;

    const reward = Math.min(10 + (newStreak - 1) * 5, 100);
    user.balance += reward;
    user.lastDaily = now;
    user.dailyStreak = newStreak;

    await db.write();

    const embed = new EmbedBuilder()
      .setTitle('🗓️ Daily Reward')
      .setDescription(
        `You received **${reward}₩**!\n` +
        `🔥 Streak: **${newStreak} day(s)**\n` +
        `💰 New Balance: **${user.balance}₩**`
      )
      .setColor(0x00CC99);

    return message.reply({ embeds: [embed] });
  }
};
