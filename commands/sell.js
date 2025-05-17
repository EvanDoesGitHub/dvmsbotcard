const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'sell',
    description: 'Sell cards by group ID or card ID. Examples: `!sell 5.1.2 2`, `!sell card5.0.4 all`, `!sell 5 all`, `!sell last`, `!sell all`',
    async execute(message, args, { db, cards }) {
        await db.read();
        const userId = message.author.id;
        const user = db.data.users[userId];
        if (!user || !user.inventory?.length) return message.reply("You don't have any cards.");

        let input = args[0];
        const amountArg = args[1]?.toLowerCase() ?? '1';

        if (!input) {
            return message.reply("Usage: `!sell <groupId|cardId|last|all> [amount|all]`.\nExamples: `!sell 5.1.3 2`, `!sell card5.0.2 all`, `!sell 5 all`, `!sell last`, `!sell all`");
        }

        if (input === 'last') {
            if (!user.lastGroupId) {
                return message.reply("You haven't used `!mygroups` or similar command yet, so there's no last group to sell.");
            }
            input = user.lastGroupId;
        }

        if (input === 'all') {
            // Sell all cards in inventory
            if (!user.inventory.length) {
                return message.reply("Your inventory is empty.");
            }
            toSell = user.inventory.slice(); // Create a copy to avoid modifying the original array directly
        } else {
            const parts = input.split('.');
            let candidates;

            if (parts.length === 3) {
                // Full group ID: cardId.shiny.condition
                let [rawId, shinyCode, condCode] = parts;
                const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
                const shiny = shinyCode === '1';
                const condition = condCode === '3' ? 'Poor' : condCode === '4' ? 'Great' : 'Average';

                candidates = user.inventory.filter(c =>
                    c.cardId === cardId &&
                    c.shiny === shiny &&
                    c.condition === condition
                );

                if (!candidates.length) {
                    return message.reply(`You don’t have any cards matching **${input}**.`);
                }
            } else {
                // General sell by card ID only
                const rawId = input;
                const cardId = rawId.startsWith('card') ? rawId : `card${rawId}`;
                candidates = user.inventory.filter(c => c.cardId === cardId);

                if (!candidates.length) {
                    return message.reply(`You don’t have any cards with ID **${cardId}**.`);
                }
            }
            if (amountArg === 'all') {
                toSell = candidates;
            } else {
                const count = parseInt(amountArg);
                if (isNaN(count) || count < 1) {
                    return message.reply("Invalid amount. Use a number or `all`.");
                }
                if (count > candidates.length) {
                    return message.reply(`You only have ${candidates.length} of **${input}**, but tried to sell ${count}.`);
                }
                toSell = candidates.slice(0, count);
            }
        }
        // Check for locked cards
        const lockedCards = db.data.lockedCards || [];
        const sellableCards = [];
        for (const card of toSell) {
            const cardIdentifier = `${card.cardId}.${card.shiny ? '1' : '0'}.${card.condition === 'Poor' ? '3' : card.condition === 'Great' ? '4' : '2'}`;
            const genericCardIdentifier = `${card.cardId}.*.${card.condition === 'Poor' ? '3' : card.condition === 'Great' ? '4' : '2'}`;
            const genericShinyIdentifier = `${card.cardId}.${card.shiny ? '1' : '0'}.*`;
            const veryGenericCardIdentifier = `${card.cardId}.*.${'*'}`;

            if (
                !lockedCards.includes(cardIdentifier) &&
                !lockedCards.includes(genericCardIdentifier) &&
                !lockedCards.includes(genericShinyIdentifier) &&
                !lockedCards.includes(veryGenericCardIdentifier)
            ) {
                sellableCards.push(card);
            }
            else{
                 message.reply(`Card ${card.cardId} is locked and cannot be sold.`);
            }
        }
        if (sellableCards.length === 0) {
            return message.reply("All the cards you selected are locked.");
        }

        const removeIds = new Set(sellableCards.map(c => c.instanceId));
        user.inventory = user.inventory.filter(c => !removeIds.has(c.instanceId));

        const totalValue = sellableCards.reduce((sum, c) => {
            const baseCard = cards.find(card => card.id === c.cardId);
            if (!baseCard) return sum;
            let value = baseCard.value;
            if (c.shiny) value = Math.ceil(value * 1.4);
            if (c.condition === 'Poor') value = Math.ceil(value * 0.85);
            if (c.condition === 'Great') value = Math.ceil(value * 1.15);
            return sum + value;
        }, 0);

        user.balance = (user.balance || 0) + totalValue;
        await db.write();

        const first = sellableCards[0];
        const cardInfo = cards.find(c => c.id === first.cardId);
        const embed = new EmbedBuilder()
            .setTitle(`🪙 Sold ${sellableCards.length}× ${cardInfo.title}`)
            .setDescription(
                `You sold ${sellableCards.length} card(s) for **${totalValue}₩**.\n` +
                `💰 New Balance: **${user.balance}₩**`
            )
            .setColor(0xFFD700);

        return message.reply({ embeds: [embed] });
    }
};
