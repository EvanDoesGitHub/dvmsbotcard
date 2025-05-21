const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'profile',
  description: 'View your profile, including card collection size, worth, balance, and total drops. Use `!profile @user` to view another user\'s profile.',
  async execute(message, args, { db, cards }) {
    await db.read(); // Read the latest database state

    // Determine which user's profile to display
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    let user = db.data.users[userId]; // Get the user data

    // **CRITICAL CHANGE HERE**
    // Robust handling for user data, including the 'drops' property for display
    if (!user) {
        // If user doesn't exist in DB, create a temporary default object for display
        user = { inventory: [], balance: 0, drops: 0 };
    } else {
        // If user exists but 'drops' property is missing or not a number, initialize it to 0
        if (typeof user.drops !== 'number') {
            user.drops = 0; // Ensures totalDrops will be a number, not undefined/null/NaN
        }
    }

    const inventory = user.inventory || [];
    const balance = user.balance || 0;
    const totalDrops = user.drops; // Use the now guaranteed 'user.drops'

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
        { name: 'Total Drops Made', value: `${totalDrops}`, inline: true }, // Display total drops
      )
      .setThumbnail(targetUser.avatarURL());

    return message.channel.send({ embeds: [embed] });
  },
};
