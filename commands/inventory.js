const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'inventory',
    description: 'Show your collected cards, their IDs, quantities, and total worth in ₩',
    async execute(message, args, { db, cards }) {
        try {
            await db.read();
            const userId = message.author.id;
            const user = db.data?.users?.[userId]; // Use optional chaining

            if (!user || !user.inventory || user.inventory.length === 0) {
                return message.reply('Your inventory is empty. Use `!drop` to collect cards!');
            }

            const groups = {};
            let totalWorth = 0;

            for (const inventoryItem of user.inventory) {
                //  inventory is stored as an array of objects, not strings.
                const cardId = inventoryItem.cardId;
                const shiny = inventoryItem.shiny;
                const condition = inventoryItem.condition;
                const protectedStatus = inventoryItem.protected || false; // Get protected status, default to false

                const baseCard = cards.find(c => c.id === cardId);
                if (!baseCard) {
                    console.warn(`Card with ID ${cardId} not found in cards data.`);
                    continue;
                }

                // compute final value after shiny & condition
                const baseValue = shiny ? Math.ceil(baseCard.value * 1.4) : baseCard.value;
                let conditionMultiplier = 1;
                if (condition === 1) conditionMultiplier = 0.85; // Poor
                else if (condition === 3) conditionMultiplier = 1.15; // Great
                //  Average (2) doesn't need an else if, it defaults to 1
                const finalValue = Math.ceil(baseValue * conditionMultiplier);

                const groupKey = `${cardId}.${shiny ? '1' : '0'}.${condition}.${protectedStatus ? '1' : '0'}`; // Include protected

                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        cardInfo: {
                            ...baseCard,
                            shiny: shiny,
                            condition: condition,
                            value: finalValue,
                            protected: protectedStatus, // Store protected status
                        },
                        count: 0,
                    };
                }
                groups[groupKey].count++;
                totalWorth += finalValue;
            }

            // convert to array and sort by descending group worth
            const cardGroups = Object.entries(groups).sort((a, b) => {
                const [, A] = a;
                const [, B] = b;
                return (B.cardInfo.value * B.count) - (A.cardInfo.value * A.count);
            });

            const itemsPerPage = 5;
            const totalPages = Math.ceil(cardGroups.length / itemsPerPage);
            let currentPage = 0;

            const createEmbed = (page) => {
                const embed = new EmbedBuilder()
                    .setTitle(`${message.author.username}'s Inventory`)
                    .setDescription(
                        `**Total cards:** ${user.inventory.length}\n` +
                        `**Total worth:** ${totalWorth}₩\n` +
                        `**Page:** ${page + 1}/${totalPages}`
                    )
                    .setColor(0x00AE86);

                const slice = cardGroups.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
                for (const [groupKey, { cardInfo, count }] of slice) { // Destructure cardInfo
                    const groupWorth = cardInfo.value * count;
                    const shinyLabel = cardInfo.shiny ? '✨ SHINY CARD ✨' : '';
                    let conditionLabelText = '';
                    if (cardInfo.condition === 1) {
                        conditionLabelText = '⚠️ Poor Condition';
                    } else if (cardInfo.condition === 2) {
                        conditionLabelText = '🔹 Average Condition';
                    } else if (cardInfo.condition === 3) {
                        conditionLabelText = '🌟 Great Condition';
                    }
                    const protectedLabel = cardInfo.protected ? '🔒 Protected' : ''; // Get protected status

                    embed.addFields({
                        name: `ID: **${cardId}.${shiny ? '1' : '0'}.${cardInfo.condition}** — ${cardInfo.title} ${shinyLabel} ${conditionLabelText} ${protectedLabel}`, // Added protectedLabel
                        value: `Quantity: ${count}\n` +
                            `Value per card: ${cardInfo.value}₩\n` +
                            `Group worth: ${groupWorth}₩`,
                        inline: false,
                    });
                }

                // updated commands list
                embed.addFields({
                    name: 'Commands',
                    value:
                        '`!offer <cardId> <quantity>` to offer cards\n' +
                        '`!sell <groupId> <amount|all>` to sell cards for ₩\n' +
                        '`!trade @user` to start a trade\n' +
                        '`!auction` to manage auctions\n' +
                        '`!index` to view collection progress\n' +
                        '`!leaderboard` to see top collectors',
                    inline: false,
                });

                return embed;
            };

            const sent = await message.reply({ embeds: [createEmbed(currentPage)] });
            await sent.react('⏪');
            await sent.react('⏩');

            const filter = (reaction, user) =>
                ['⏪', '⏩'].includes(reaction.emoji.name) && user.id === message.author.id;
            const collector = sent.createReactionCollector({ filter, time: 60000 });

            collector.on('collect', reaction => {
                if (reaction.emoji.name === '⏪' && currentPage > 0) currentPage--;
                if (reaction.emoji.name === '⏩' && currentPage < totalPages - 1) currentPage++;
                sent.edit({ embeds: [createEmbed(currentPage)] });
                reaction.users.remove(message.author);
            });

            collector.on('end', () => {
                sent.reactions.removeAll().catch(console.error);
            });
        } catch (error) {
            console.error("Error in inventory command:", error, { userId: message.author.id });
            message.reply('An error occurred while displaying your inventory.');
        }
    },
};
