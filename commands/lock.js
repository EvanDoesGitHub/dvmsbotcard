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
        } else {
            // General lock by card ID
            const rawId = input;
            const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
            cardsToLock = [{ cardId }]; // Array of one card
        }

        let lockedCount = 0;
        let alreadyLocked = 0;
        for (const cardToLock of cardsToLock) {
            const identifier = cardToLock.cardId + (cardToLock.shiny !== undefined ? `.${cardToLock.shiny}` : '') + (cardToLock.condition !== undefined ? `.${cardToLock.condition}` : '');
            if (!db.data.lockedCards.includes(identifier)) {
                db.data.lockedCards.push(identifier);
                lockedCount++;
            }
            else{
                alreadyLocked++;
            }
        }
        await db.write();

        const embed = new EmbedBuilder()
            .setTitle('🔒 Card(s) Locked')
            .setDescription(`${lockedCount} card(s) matching **${input}** have been locked and can no longer be sold.`)
            .setColor(0xFF0000);
        if (alreadyLocked > 0){
             embed.setFooter({ text: `${alreadyLocked} card(s) were already locked.` });
        }

        return message.channel.send({ embeds: [embed] });
    }
};
