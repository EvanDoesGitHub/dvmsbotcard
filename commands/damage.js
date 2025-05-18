const { EmbedBuilder } = require('discord.js');

const COOLDOWN_TIME = 600000; // 10 minutes in milliseconds
const DAMAGE_AMOUNT = 1; // Amount of damage each card takes
const FAILURE_RATE = 0.3; // 30% chance of failure

module.exports = {
    name: 'damage',
    description: 'Damage another user\'s top 5 most expensive non-protected cards, with a chance of failure.',
    async execute(message, args, { cards, db }) {
        const damagerId = message.author.id;
        const targetId = message.mentions.users.first()?.id;

        if (!targetId) {
            return message.reply("Please mention the user you want to damage.");
        }

        if (damagerId === targetId) {
            return message.reply("You can't damage yourself!");
        }

        await db.read();

        // Initialize user data if they don't exist
        if (!db.data.users[damagerId]) {
            db.data.users[damagerId] = { balance: 0, cooldown: 0, inventory: [] };
        }
        if (!db.data.users[targetId]) {
            db.data.users[targetId] = { balance: 0, cooldown: 0, inventory: [] };
        }

        const damager = db.data.users[damagerId];
        const target = db.data.users[targetId];
        const now = Date.now();

        if (damager.cooldown > now) {
            const timeLeft = (damager.cooldown - now) / 1000;
            return message.reply(`You can damage again in ${timeLeft.toFixed(0)} seconds.`);
        }

        if (target.cooldown > now) {
            const timeLeft = (target.cooldown - now) / 1000;
            return message.reply(`That user cannot be damaged for another ${timeLeft.toFixed(0)} seconds.`);
        }

        if (!target.inventory || target.inventory.length === 0) {
            return message.reply("That user has no cards to damage!");
        }

        // 1. Filter out protected cards
        const vulnerableCards = target.inventory.filter(card => !card.protected);

        if (vulnerableCards.length === 0) {
            return message.reply("That user has no non-protected cards!");
        }

        // 2. Sort cards by price
        const getCardPrice = (cardId) => {
            const cardDef = cards.find(c => c.id === cardId);
            if (cardDef) {
                return cardDef.price || 0;
            }
            return 0;
        };

        vulnerableCards.sort((a, b) => {
            const priceA = getCardPrice(a.cardId);
            const priceB = getCardPrice(b.cardId);
            return priceB - priceA;
        });

        // 3. Get the top 5 most expensive cards
        const cardsToDamage = vulnerableCards.slice(0, 5);
        let totalFine = 0; // Keep track of the total fine

        // 4. Damage the cards (with failure chance)
        const damagedCards = []; // Array to store actually damaged cards for the embed
        for (const card of cardsToDamage) {
            if (Math.random() > FAILURE_RATE) { // Success!
                card.damage = (card.damage || 0) + DAMAGE_AMOUNT;
                damagedCards.push(card); // Add to the list of damaged cards
            } else {
                // Failure!  Calculate and apply fine
                const cardPrice = getCardPrice(card.cardId);
                totalFine += cardPrice;
            }
        }

        if (totalFine > 0) {
            damager.balance -= totalFine; // Subtract the fine
            if (damager.balance < 0) {
                // Handle debt (optional: you might have a separate debt tracking)
                message.reply(`You failed to damage and owe ${totalFine}! Your balance is now ${damager.balance}.`);
            } else {
                message.reply(`You failed to damage and owe ${totalFine}! Your balance is now ${damager.balance}.`);
            }
        }

        target.cooldown = now + COOLDOWN_TIME;
        damager.cooldown = now + COOLDOWN_TIME;
        await db.write();

        // 5. Create and send embed
        const embed = new EmbedBuilder()
            .setTitle('Card Damage Report')
            .setDescription(
                (totalFine > 0 ? `Failed to damage some cards. Fined ${message.author.username} ${totalFine}!\n` : '') +
                `Damaged ${message.mentions.users.first().username}'s cards!`
            )
            .setColor(totalFine > 0 ? 0xFF8C00 : 0xFF0000); // Orange for failure, Red for success

        if (damagedCards.length > 0) {
            damagedCards.forEach(card => { // Use the damagedCards array
                const cardDef = cards.find(c => c.id === card.cardId);
                const cardName = cardDef ? cardDef.name : 'Unknown Card';
                embed.addFields({
                    name: cardName,
                    value: `New Damage: ${card.damage}`,
                    inline: false,
                });
            });
        } else if (totalFine === 0) {
            embed.addFields({
                name: 'No Cards Damaged',
                value: 'No cards were damaged this time.',
                inline: false
            });
        }

        return message.reply({ embeds: [embed] });
    },
};
