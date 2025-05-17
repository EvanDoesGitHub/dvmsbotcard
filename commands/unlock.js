const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unlock',
    description: 'Unlocks cards by group ID or card ID, allowing them to be sold.\n' +
        'Examples: `!unlock 5.1.2`, `!unlock card5.0.4`, `!unlock 5`',
    async execute(message, args, { db }) {
        await db.read();
        const userId = message.author.id;

        const input = args[0];
        if (!input) {
            return message.reply("Usage: `!unlock <groupId|cardId>`\nExamples: `!unlock 5.1.3`, `!unlock card5.0.2`, `!unlock 5`");
        }

        if (!db.data.lockedCards) {
            db.data.lockedCards = []; // Ensure the array exists
        }

        const parts = input.split('.');
        let cardsToUnlock = [];

        if (parts.length === 3) {
            // Full group ID: cardId.shiny.condition
            let [rawId, shinyCode, condCode] = parts;
            const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
            const shiny = shinyCode === '1';
            const condition = condCode === '3' ? 'Poor' : condCode === '4' ? 'Great' : 'Average';

            cardsToUnlock = [{ cardId, shiny, condition }]; // Array of one card
        } else {
            // General unlock by card ID
            const rawId = input;
            const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
             cardsToUnlock = [{ cardId }]; // Array of one card
        }

        let unlockedCount = 0;
        let notLockedCount = 0;
        for (const cardToUnlock of cardsToUnlock) {
            const identifier = `${cardToUnlock.cardId}.${cardToLock.shiny !== undefined ? (cardToLock.shiny ? '1' : '0') : '*'}.${cardToLock.condition !== undefined ? (cardToLock.condition === 'Poor' ? '3' : cardToLock.condition === 'Great' ? '4' : '2') : '*'}`;
            const index = db.data.lockedCards.indexOf(identifier);
            if (index > -1) {
                db.data.lockedCards.splice(index, 1); // Remove the identifier
                unlockedCount++;
            } else {
                notLockedCount++;
            }
        }
        await db.write();

        const embed = new EmbedBuilder()
            .setTitle('🔓 Card(s) Unlocked')
            .setDescription(`${unlockedCount} card(s) matching **${input}** have been unlocked and can now be sold.`)
            .setColor(0x00FF00); // Changed to green for unlock

        if (notLockedCount > 0) {
            embed.setFooter({ text: `${notLockedCount} card(s) were not locked.` });
        }

        return message.channel.send({ embeds: [embed] });
    }
};
