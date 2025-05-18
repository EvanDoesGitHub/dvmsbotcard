const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'damage',
  description: 'Damages a random card in a user\'s inventory.  Ignores protected cards and reduces price by 90%.',
  async execute(message, args, { db, cards }) {
    if (message.author.id === message.guild.ownerId) return message.reply("I can't damage the owner's cards.");

    await db.read();
    const targetUserId = args[0] ? args[0].replace(/<@!?(\d+)>/g, '$1') : message.author.id;
    const targetUser = db.data.users[targetUserId];

    if (!targetUser || !targetUser.inventory.length) {
      return message.reply(args[0] ? "That user has no cards to damage." : "You have no cards to damage.");
    }

    // Filter out protected cards
    const vulnerableCards = targetUser.inventory.filter(cardId => {
      const cardParts = cardId.split('.');
      const baseCardId = cardParts[0];
      return !targetUser.protectedCards.includes(baseCardId);
    });

    if (vulnerableCards.length === 0) {
      return message.reply(args[0] ? "That user has no *vulnerable* cards to damage." : "You have no *vulnerable* cards to damage.");
    }

    const randomCardIndex = Math.floor(Math.random() * vulnerableCards.length);
    const damagedCardId = vulnerableCards[randomCardIndex];

    const cardParts = damagedCardId.split('.'); // [cardId, shiny, condition]
    const baseCardId = cardParts[0];
    const shiny = cardParts[1] === '1';
    let condition = parseInt(cardParts[2]); // 2: avg, 3: poor, 4: great

    const cardData = cards.find(c => c.id === baseCardId);
    if (!cardData) {
      console.error(`Card with ID ${baseCardId} not found in card data.`);
      return message.reply("Sorry, there was an error processing the damage.  The card data could not be found."); // Provide user feedback
    }

    let originalConditionString = condition === 2 ? 'Average' : condition === 3 ? 'Poor' : 'Great';

    if (condition === 4) { // Great
      condition = 2; // Change to Average
    } else if (condition === 2) { // Average
      condition = 3; // Change to Poor
    } else if (condition === 3) {
      //stays poor.
    }

    cardParts[2] = condition.toString(); //update condition
    const newCardId = cardParts.join('.');

    // Remove old card, add new card with new condition
    targetUser.inventory.splice(targetUser.inventory.indexOf(damagedCardId), 1);
    targetUser.inventory.push(newCardId);

    const newConditionString = condition === 2 ? 'Average' : condition === 3 ? 'Poor' : 'Great';

    // Calculate price reduction
    const priceReduction = 0.9; // 90% reduction
    let originalPrice = cardData.price;
    if (shiny) {
      originalPrice *= 2; // Apply shiny multiplier
    }
    const newPrice = Math.max(100, Math.round(originalPrice * (1 - priceReduction))); // Ensure >= 100

    await db.write();
    const embed = new EmbedBuilder()
      .setTitle('Card Damaged!')
      .setDescription(
        `${args[0] ? `<@${targetUserId}>'s` : 'Your'} card **${cardData.title}**` +
        ` has been damaged!  It went from ${originalConditionString} to ${newConditionString} condition.` +
        ` Its price has been reduced to ${newPrice}₩.` //show new price
      )
      .setColor(0xCC0000); // Red

    message.channel.send({ embeds: [embed] });
  },
};
