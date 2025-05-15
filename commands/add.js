const { EmbedBuilder } = require('discord.js');
const BYPASS_USER_ID = '722463127782031400';

module.exports = {
  name: 'add',
  description: 'Admin: Add a card to a user manually',
  async execute(message, args, { db, cards }) {
    if (message.author.id !== BYPASS_USER_ID) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    const [groupId, conditionArg, mention] = args;

    if (!groupId || !conditionArg || !mention) {
      return message.reply("Usage: `!add <cardId> <condition> <@user>`");
    }

    const condition = capitalize(conditionArg);
    const allowedConditions = ['Poor', 'Average', 'Great'];
    if (!allowedConditions.includes(condition)) {
      return message.reply("Condition must be one of: Poor, Average, Great");
    }

    const match = mention.match(/^<@!?(\d+)>$/);
    if (!match) return message.reply("Invalid user mention format.");
    const targetUserId = match[1];

    const card = cards.find(c => c.id === groupId);
    if (!card) return message.reply("❌ No card found with that ID.");

    const { nanoid } = await import('nanoid');

    await db.read();
    let targetUser = db.data.users?.[targetUserId];
    if (!targetUser) {
      targetUser = { lastDrops: [], cooldownEnd: 0, inventory: [], balance: 0 };
      if (!db.data.users) db.data.users = {};
      db.data.users[targetUserId] = targetUser;
    }

    const isShiny = false;
    const baseValue = card.value;
    const modifier = { Poor: -0.15, Great: 0.15, Average: 0 }[condition];
    const finalValue = Math.ceil(baseValue * (1 + modifier));

    targetUser.inventory.push({
      cardId: card.id,
      instanceId: nanoid(),
      shiny: isShiny,
      condition,
      acquired: Date.now(),
    });

    await db.write();

    const embed = new EmbedBuilder()
      .setTitle(`✅ Card Added`)
      .setDescription(`**${card.title}** (${card.rarity}) added to <@${targetUserId}>`)
      .addFields(
        { name: 'Card ID', value: card.id, inline: true },
        { name: 'Condition', value: condition, inline: true },
        { name: 'Value', value: `${finalValue}₩`, inline: true }
      )
      .setThumbnail(card.image)
      .setColor(0x00cc99);

    return message.reply({ embeds: [embed] });
  }
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
