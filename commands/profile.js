const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'profile',
  description: 'View your profile, including card collection size, worth, balance, and total drops. Use `!profile @user` to view another user\'s profile.',
  async execute(message, args, { db, cards }) {
    await db.read();

    // Determine which user's profile to display
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    const user = db.data.users[userId] || { inventory: [], balance: 0, drops: 0 };
    const inventory = user.inventory || [];
    const balance = user.balance || 0;
    const drops = user.drops || 0; // Retrieve the drops count

    let collectionWorth = 0;
    const cardIds = new Set();  // Use a Set to track unique cards
    let collectionSize = 0;

    if (inventory.length > 0) {
      for (const item of inventory) {
        const card = cards.find(c => c.id === item.cardId);
        if (card) {
          let baseValue = item.shiny ? Math.ceil(card.value * 1.4) : card.value;
          const modifier = { Poor: -0.15, Great: 0.15, Average: 0 }[item.condition] || 0;
          const finalValue = Math.ceil(baseValue * (1 + modifier));
          collectionWorth += finalValue;

          if (!cardIds.has(item.cardId)) { //check if the card is already counted
            cardIds.add(item.cardId);
            collectionSize++;
          }
        }
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Profile`)
      .setDescription(`Card Collector Profile`)
      .addFields(
        { name: 'Balance', value: `${balance}₩`, inline: true },
        { name: 'Collection Size', value: `${collectionSize}`, inline: true },
        { name: 'Collection Worth', value: `${collectionWorth}₩`, inline: true },
        { name: 'Total Drops', value: `${drops}`, inline: true }, // Include total drops
      )
      .setThumbnail(targetUser.avatarURL());

    return message.channel.send({ embeds: [embed] });
  },
};
