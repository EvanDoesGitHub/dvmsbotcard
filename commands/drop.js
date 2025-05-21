const { EmbedBuilder } = require('discord.js');

// Helper function for card rarity
function getRarity(user) {
    const rarityTable = {
        'Secret': 0.0005,      // 0.05%
        'Mythic': 0.0045,        // 0.45%
        'Legendary': 0.02,      // 2%
        'Epic': 0.075,         // 7.5%
        'Rare': 0.1,           // 10%
        'Uncommon': 0.2,         // 20%
        'Common': 0.6          // 60%
    };

    if (user?.luckBoost?.multiplier) {
        if (user.luckBoost.multiplier === 25) {
            rarityTable['Secret'] = 0.0001;
            rarityTable['Mythic'] = 0.0009;
            rarityTable['Legendary'] = 0.004;
            rarityTable['Epic'] = 0.015;
            rarityTable['Rare'] = 0.03;
            rarityTable['Common'] = 0.9500;
        } else if (user.luckBoost.multiplier === 10) {
            rarityTable['Secret'] = 0.0002;
            rarityTable['Mythic'] = 0.0018;
            rarityTable['Legendary'] = 0.008;
            rarityTable['Epic'] = 0.04;
            rarityTable['Rare'] = 0.10;
            rarityTable['Common'] = 0.8500;
        } else if (user.luckBoost.multiplier === 5) {
            rarityTable['Secret'] = 0.001;
            rarityTable['Mythic'] = 0.007;
            rarityTable['Legendary'] = 0.032;
            rarityTable['Epic'] = 0.11;
            rarityTable['Rare'] = 0.15;
            rarityTable['Common'] = 0.6920;
        } else if (user.luckBoost.multiplier === 4) {
            rarityTable['Secret'] = 0.0003;
            rarityTable['Mythic'] = 0.0027;
            rarityTable['Legendary'] = 0.012;
            rarityTable['Epic'] = 0.06;
            rarityTable['Rare'] = 0.075;
            rarityTable['Uncommon'] = 0.8500;
        } else if (user.luckBoost.multiplier === 2) {
            rarityTable['Secret'] = 0.0005;
            rarityTable['Mythic'] = 0.0045;
            rarityTable['Legendary'] = 0.02;
            rarityTable['Epic'] = 0.075;
            rarityTable['Rare'] = 0.10;
            rarityTable['Uncommon'] = 0.8000;
        }
    }

    const n = Math.random();
    let rarity;
    let percentage;
    let fraction;

    let cumulative = 0;
    for (const r in rarityTable) {
        cumulative += rarityTable[r];
        if (n < cumulative) {
            rarity = r;
            percentage = (rarityTable[r] * 100).toFixed(2) + '%';
            fraction = getFraction(rarityTable[r]);
            break;
        }
    }
    return { rarity, percentage, fraction };
}

function getFraction(decimal) {
    const tolerance = 1e-5; // Adjust for precision
    let numerator = 1;
    let denominator = 1;
    let error = Math.abs(decimal - numerator / denominator);

    while (error > tolerance && denominator <= 10000) { // Limit denominator to prevent infinite loop
        if (decimal > numerator / denominator) {
            numerator++;
        } else {
            denominator++;
        }
        error = Math.abs(decimal - numerator / denominator);
    }
    return `${numerator}/${denominator}`;
}

// Helper function for card condition
function randomCondition() {
    const a = ['Poor', 'Average', 'Great'];
    return a[Math.floor(Math.random() * a.length)];
}

module.exports = {
    name: 'drop',
    aliases: ['d', 'dropcard', 'dc', 'cardrop', 'cdrop'],
    async execute(message, args, { cards, db }) {
        try {
            await db.read(); // Read the latest database state

            const dropperId = message.author.id;
            const now = Date.now();
            const BYPASS_USER_ID = '722463127782031400'; // Replace with your ID
            const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

            let user = db.data?.users?.[dropperId];

            // Robust initialization for the user object and its 'drops' property
            if (!user) {
                user = {
                    lastDrops: [],
                    cooldownEnd: 0,
                    inventory: [],
                    balance: 0,
                    dropsAvailable: 10,
                    luckBoost: null,
                    cooldownMessageSent: false,
                    drops: 0 // Initialize 'drops' for a brand new user
                };
                if (!db.data) db.data = { users: {} }; // Ensure the parent 'users' object exists
                db.data.users[dropperId] = user; // Assign the new user object to the database
                console.log(`Creating new user: ${dropperId}`);
            } else {
                // For existing users: Ensure 'drops' property is present and is a number
                if (typeof user.drops !== 'number') {
                    user.drops = 0; // Initialize if missing or not a number
                }
            }

            // Reset or check cooldown
            if (dropperId !== BYPASS_USER_ID) {
                if (user.cooldownEnd && now >= user.cooldownEnd) {
                    user.lastDrops = [];
                    user.cooldownEnd = 0;
                    user.dropsAvailable = 10; //reset drops available
                    user.cooldownMessageSent = false; // Reset the flag
                }

                if (user.cooldownEnd && now < user.cooldownEnd) {
                    const timeDiff = user.cooldownEnd - now;
                    const minutes = Math.ceil(timeDiff / (60 * 1000));
                    const resetTime = new Date(user.cooldownEnd).toLocaleString('en-US', {
                        timeZone: 'America/Toronto',
                        hour12: false,
                    });
                    return message.reply(`⏳ You've used all your drops. Resets in **${minutes} minutes** at ${resetTime}. You can also buy more in the shop!`);
                }

                if (user.dropsAvailable <= 0) {
                    if (!user.cooldownMessageSent) { // Check if the message has been sent
                        user.cooldownEnd = now + COOLDOWN_DURATION;
                        user.cooldownMessageSent = true; // Set the flag
                        try {
                            await db.write();
                        } catch (e) {
                            console.error("Error writing to db (cooldown setup):", e);
                        }
                        const resetTime = new Date(user.cooldownEnd).toLocaleString('en-US', {
                            timeZone: 'America/Toronto',
                            hour12: false,
                        });
                        return message.reply(`You've used all your drops. Resets in **60 minutes** at ${resetTime}. You can also buy more in the shop!`);
                    } else {
                        // If cooldown message was already sent, just inform about the remaining time.
                        const timeDiff = user.cooldownEnd - now;
                        const minutes = Math.ceil(timeDiff / (60 * 1000));
                        const resetTime = new Date(user.cooldownEnd).toLocaleString('en-US', {
                            timeZone: 'America/Toronto',
                            hour12: false,
                        });
                        return message.reply(`⏳ You've used all your drops. Resets in **${minutes} minutes** at ${resetTime}. You can also buy more in the shop!`);
                    }
                }
            }

            // pick rarity→card
            const { rarity, percentage, fraction } = getRarity(user);
            if (!Array.isArray(cards)) {
                console.error("Error: 'cards' is not an array:", cards, { userId: message.author.id });
                return message.reply("Error: Card data is not loaded correctly.");
            }
            const pool = cards.filter((c) => c.rarity === rarity);
            if (!pool.length) return message.reply(`No **${rarity}** cards.`);
            const selected = pool[Math.floor(Math.random() * pool.length)];

            if (!selected) {
                console.error("Error: No card selected from pool. Pool:", pool, "Rarity:", rarity, { userId: message.author.id });
                message.reply("Error: Could not select a card.");
                return;
            }

            // shiny?
            const isShiny = Math.random() < 1 / 40;
            const sparkle = isShiny ? '✨' : '';
            const baseValue = isShiny ? Math.ceil(selected.value * 1.4) : selected.value;

            // condition
            const condition = randomCondition();
            const modifier = { Poor: -0.15, Great: 0.15, Average: 0 }[condition] || 0;
            const finalValue = Math.ceil(baseValue * (1 + modifier));

            // build embed
            let desc = `A **${selected.rarity}** card dropped! (${percentage}, or ${fraction}) React ✅ to claim.`;
            let remaining = dropperId === BYPASS_USER_ID ? 'unlimited' : user.dropsAvailable - 1;
            desc += `\nYou have **${remaining}** drops left.`;
            if (remaining !== 'unlimited' && remaining <= 2)
                desc += `\n⚠️ Only ${remaining} left!`;
            if (isShiny) desc = `✨ **SHINY CARD** ✨\n` + desc;

            const embed = new EmbedBuilder()
                .setTitle(`${sparkle}${selected.title} — ${condition}`)
                .setDescription(desc)
                .setImage(selected.image)
                .setFooter({ text: `Value: ${finalValue}₩` });

            let dropMsg;
            try {
                dropMsg = await message.reply({ embeds: [embed] });
                await dropMsg.react('✅');
            } catch (error) {
                console.error("Error sending message or reacting:", error, { userId: message.author.id });
                message.reply("Error: Failed to send drop message or add reaction.");
                return;
            }

            // allow anyone (except bots) to claim
            const collector = dropMsg.createReactionCollector({
                filter: (reaction, reactor) =>
                    reaction.emoji.name === '✅' && !reactor.bot,
                max: 1,
                time: 60000,
            });

            collector.on('collect', async (reaction, reactor) => {
                try {
                    const claimerId = reactor.id;
                    await db.read(); // Re-read to get the latest state before modifying
                    let claimer = db.data?.users?.[claimerId];

                    if (!claimer) {
                        claimer = { lastDrops: [], cooldownEnd: 0, inventory: [], balance: 0, dropsAvailable: 3, cooldownMessageSent: false, drops: 0 }; // Initialize drops for new claimers
                        if (!db.data) db.data = { users: {} }; // Ensure the parent 'users' object exists
                        db.data.users[claimerId] = claimer; // Assign the newly created user object
                        console.log(`Creating new user (claimer): ${claimerId}`);
                    } else {
                         // For existing claimers: Ensure 'drops' property is present and is a number
                        if (typeof claimer.drops !== 'number') {
                            claimer.drops = 0;
                        }
                    }

                    // store only cardId + instance, value/title etc looked up later
                    let cardInstance;
                    try {
                        // nanoid is passed via context from index.js, no need to import here
                        // const { nanoid } = await import('nanoid'); // This line is not needed if nanoid is passed
                        cardInstance = {
                            cardId: selected.id,
                            instanceId: message.client.nanoid(), // Access nanoid from client context
                            shiny: isShiny,
                            condition: condition,
                            acquired: Date.now(),
                        };
                    } catch (e) {
                        console.error("Failed to generate unique card ID (nanoid issue):", e);
                        return message.reply("Error: Failed to generate unique card ID.");
                    }

                    claimer.inventory.push(cardInstance);

                    try {
                        await db.write();
                        console.log(`Card claimed by: ${claimerId}`);
                    } catch (e) {
                        console.error("Error writing to database (card claim):", e, { userId: claimerId });
                        message.reply("Error: Failed to write to the database after claim.");
                        return;
                    }

                    message.channel.send(
                        `🎉 <@${claimerId}> picked up **${selected.title}** (${selected.rarity}) ${sparkle}!`
                    );
                } catch (error) {
                    console.error("Error in collect event:", error, { userId: reactor.id });
                }
            });

            collector.on('end', async (collected) => {
                try {
                    if (!collected.size) {
                        const timedOut = EmbedBuilder.from(embed).setDescription(
                            desc + `\n\n⌛ **Time's up!**`
                        );
                        await dropMsg.edit({ embeds: [timedOut] });
                    }
                } catch (error) {
                    console.error("Error in end event", error, { messageId: dropMsg.id });
                }
            });

            // Deduct a drop and increment total drops after successful drop message sent
            if (dropperId !== BYPASS_USER_ID) {
                user.dropsAvailable -= 1;
                user.drops += 1; // Increment the total drops count
                if (user.luckBoost?.dropsRemaining > 0) {
                    user.luckBoost.dropsRemaining -= 1;
                    if (user.luckBoost.dropsRemaining <= 0) {
                        user.luckBoost = null;
                    }
                }
                try {
                    await db.write(); // Write the changes to dropsAvailable and total drops
                } catch (error) {
                    console.error("Error writing to database (decrement dropsAvailable or increment drops):", error, { userId: dropperId });
                    message.reply("Error: Failed to update your drop count or total drops.");
                    return;
                }
            }
        } catch (error) {
            console.error("Error in drop command:", error, { userId: message.author.id });
            message.reply("An error occurred while processing the drop.");
        }
    },
};
