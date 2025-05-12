const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'leaderboard',
  description: 'Show two leaderboards: by inventory worth (1️⃣) or by balance (2️⃣)',
  async execute(message, args, { db, cards }) {
    await db.read();
    const users = db.data.users || {};

    // Build arrays of { userId, inventoryValue, balance }
    const stats = Object.entries(users).map(([userId, user]) => {
      // compute inventory value
      let inv = 0;
      for (const card of user.inventory || []) {
        const def = cards.find(c => c.id === card.cardId);
        if (!def) continue;
        const base = card.shiny ? Math.ceil(def.value * 1.4) : def.value;
        const mult = card.condition === 'Poor'  ? 0.85
                   : card.condition === 'Great' ? 1.15
                   : 1;
        inv += Math.ceil(base * mult);
      }
      return {
        userId,
        inventoryValue: inv,
        balance: user.balance || 0
      };
    });

    // Top10 by inventory
    const byInv = [...stats]
      .filter(u => u.inventoryValue > 0)
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 10);

    // Top10 by balance
    const byBal = [...stats]
      .filter(u => u.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    // Helper to resolve tags
    const resolveTags = async arr =>
      Promise.all(arr.map(e =>
        message.client.users.fetch(e.userId)
          .then(u => u.tag)
          .catch(() => e.userId)
      ));

    const invTags = await resolveTags(byInv);
    const balTags = await resolveTags(byBal);

    // Prepare lines
    const invLines = byInv.map((e, i) =>
      `**${i+1}.** ${invTags[i]} — ${e.inventoryValue}₩`
    );
    const balLines = byBal.map((e, i) =>
      `**${i+1}.** ${balTags[i]} — ${e.balance}₩`
    );

    // Your personal stats
    const me = stats.find(s => s.userId === message.author.id) || { inventoryValue: 0, balance: 0 };

    // Page creator
    const makeEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setFooter({ text: `You: Inv ${me.inventoryValue}₩ · Bal ${me.balance}₩` });

      if (page === 0) {
        embed
          .setTitle('🏆 Leaderboard: Inventory Worth')
          .setDescription(invLines.length ? invLines.join('\n') : 'No collected cards yet.');
      } else {
        embed
          .setTitle('💰 Leaderboard: Balance')
          .setDescription(balLines.length ? balLines.join('\n') : 'No balances yet.');
      }
      embed.addFields({
        name: 'Switch Page',
        value: 'React with 1️⃣ for Inventory or 2️⃣ for Balance',
        inline: false
      });
      return embed;
    };

    // Send initial (inventory) page
    let page = 0;
    const sent = await message.reply({ embeds: [makeEmbed(page)] });

    // Add reactions
    await sent.react('1️⃣');
    await sent.react('2️⃣');

    // Collector filter
    const filter = (reaction, user) =>
      ['1️⃣','2️⃣'].includes(reaction.emoji.name) && user.id === message.author.id;

    const collector = sent.createReactionCollector({ filter, time: 60000 });

    collector.on('collect', (reaction) => {
      // update page
      page = reaction.emoji.name === '1️⃣' ? 0 : 1;
      sent.edit({ embeds: [makeEmbed(page)] });
      reaction.users.remove(message.author).catch(() => {});
    });

    collector.on('end', () => {
      sent.reactions.removeAll().catch(() => {});
    });
  }
};
