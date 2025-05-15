const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'add',
  description: 'Admin-only command to add a specific card to a user by group ID (e.g. 3.1.4)',
  async execute(message, args, { db, cards }) {
    if (message.author.id !== '722463127782031400') {
      return message.reply("❌ You don't have permission to use this command.");
    }

    const [groupId, mention] = args;
    if (!groupId || !mention) {
      return message.reply("Usage: `!add <groupId> @user` (e.g. `!add 3.1.4 @user`)");
    }

    const match = groupId.match(/^(\d+)\.(\d)\.(\d)$/);
    if (!match) {
      return message.reply("❌ Invalid group ID format. Use `cardId.shiny.condition` (e.g. `3.1.4`)");
    }

    const [, cardId, shinyCode, conditionCode] = match;
    const shiny = shinyCode === '1';
    const condition = conditionCode === '3' ? 'Poor'
      : conditionCode === '4' ? 'Great'
        : 'Average';

    const baseCard = cards.find(c => c.id === cardId);
    if (!baseCard) {
      return message.reply(`❌ No card found with ID \`${cardId}\`.`);
    }

    const userId = mention.replace(/[<@!>]/g, '');
    await db.read();
    if (!db.data.users[userId]) {
      db.data.users[userId] = {
        lastDrops: [],
        cooldownEnd: 0,
        inventory: [],
        balance: 0
      };
    }

    // Dynamically import nanoid
    const { nanoid } = await import('nanoid');

    db.data.users[userId].inventory.push({
      cardId,
      instanceId: nanoid(),
      shiny,
      condition,
      acquired: Date.now()
    });

    await db.write();

    const sparkle = shiny ? '✨' : '';
    const embed = new EmbedBuilder()
      .setTitle(`✅ Card Added`)
      .setDescription(
        `Gave <@${userId}> the card **${baseCard.title}** ${sparkle}\n` +
        `Condition: **${condition}**`
      )
      .setImage(baseCard.image)
      .setColor(0x00ff00)
      .setFooter({ text: `ID: ${groupId}` });

    message.channel.send({ embeds: [embed] });
  }
};
