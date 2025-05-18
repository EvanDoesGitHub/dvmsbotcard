const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'lock',
  description: 'Locks cards by group ID or card ID, preventing them from being sold.\n' +
    'Examples: `!lock 5.1.2`, `!lock card5.0.4`, `!lock 5`',
  async execute(message, args, { db }) {
    await db.read();
    const userId = message.author.id;

    const input = args[0];
    if (!input) {
      return message.reply("Usage: `!lock <groupId|cardId>`\nExamples: `!lock 5.1.3`, `!lock card5.0.2`, `!lock 5`");
    }

    if (!db.data.lockedCards) {
      db.data.lockedCards = [];
    }

    const parts = input.split('.');
    let cardsToLock = [];

    if (parts.length === 3) {
      // Full group ID: cardId.shiny.condition
      let [rawId, shinyCode, condCode] = parts;
      const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
      const shiny = shinyCode === '1';
      const condition = condCode === '3' ? 'Poor' : condCode === '4' ? 'Great' : 'Average';

      cardsToLock = [{ cardId, shiny, condition }]; // Array of one card
    } else if (parts.length === 1 && !input.startsWith('card')) {
      // Just the card ID (e.g., "!lock 5")
       const cardId = `card${parts[0]}`;
       cardsToLock = [{ cardId }];
    }
     else {
      // Just the card ID (e.g., "!lock card5")
      const cardId = parts[0];
      cardsToLock = [{ cardId }];
    }

    let lockedCount = 0;
    let alreadyLocked = 0;
    for (const cardToLock of cardsToLock) {
      // Construct identifier, handling undefined shiny/condition. Include a wildcard for protected.
      const identifier = `${cardToLock.cardId}.${cardToLock.shiny !== undefined ? (cardToLock.shiny ? '1' : '0') : '*'}.${cardToLock.condition !== undefined ? (cardToLock.condition === 'Poor' ? '3' : cardToLock.condition === 'Great' ? '4' : '2') : '*'}.*`;

      const matchingLocks = db.data.lockedCards.filter(lockedCardId => {
        const lockedParts = lockedCardId.split('.');
        const inputParts = identifier.split('.');

        // Compare cardId
        if (lockedParts[0] !== inputParts[0]) return false;

        // Compare shiny (if input is specific, compare; otherwise, wildcard matches anything)
        if (inputParts[1] !== '*' && lockedParts[1] !== inputParts[1]) return false;

        // Compare condition (if input is specific, compare; otherwise, wildcard matches anything)
        if (inputParts[2] !== '*' && lockedParts[2] !== inputParts[2]) return false;

        // Protected status is wildcarded, so we don't compare it here.

        return true;
      });

      if (matchingLocks.length === 0) {
        db.data.lockedCards.push(identifier); // Use the identifier for adding
        lockedCount++;
      } else {
        alreadyLocked++;
      }
    }
    await db.write();

    const embed = new EmbedBuilder()
      .setTitle('🔒 Card(s) Locked')
      .setDescription(`${lockedCount} card(s) matching **${input}** have been locked and can no longer be sold.`)
      .setColor(0xFF0000);
    if (alreadyLocked > 0) {
      embed.setFooter({ text: `${alreadyLocked} card(s) were already locked.` });
    }

    return message.channel.send({ embeds: [embed] });
  }
};
