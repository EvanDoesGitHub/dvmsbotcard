const { EmbedBuilder } = require('discord.js');

// Helper function for card rarity
function getRarity(user) {
    const n = Math.random() * 100;
    let rarity;
    let chance;
    let percentage;

    if (user?.luckBoost?.multiplier === 25) { // 25x boost
        if (n < 0.01) {
            rarity = 'Secret';
            chance = '1 in 10000';
            percentage = '0.01%';
        } else if (n < 0.1) {
            rarity = 'Mythic';
            chance = '1 in 1000';
            percentage = '0.09%';
        } else if (n < 0.5) {
            rarity = 'Legendary';
            chance = '1 in 200';
            percentage = '0.4%';
        } else if (n < 2) {
            rarity = 'Epic';
            chance = '1 in 50';
            percentage = '1.5%';
        } else if (n < 5) {
            rarity = 'Rare';
            chance = '1 in 33';
            percentage = '3%';
        } else {
            rarity = 'Common'; // Changed from Rare to Common
            chance = '>1 in 20';
            percentage = '>95%';
        }
    } else if (user?.luckBoost?.multiplier === 10) { // 10x boost
        if (n < 0.02) {
            rarity = 'Secret';
            chance = '1 in 5000';
             percentage = '0.02%';
        } else if (n < 0.2) {
            rarity = 'Mythic';
            chance = '1 in 555';
            percentage = '0.18%';
        } else if (n < 1) {
            rarity = 'Legendary';
            chance = '1 in 125';
            percentage = '0.8%';
        } else if (n < 5) {
            rarity = 'Epic';
            chance = '1 in 25';
             percentage = '4%';
        } else if (n < 15) {
            rarity = 'Rare';
            chance = '1 in 10';
            percentage = '10%';
        } else {
            rarity = 'Common';  // Changed from Rare to Common
            chance = '>1 in 7';
            percentage = '>85%';
        }
    } else if (user?.luckBoost?.multiplier === 5) { // 5x boost
        if (n < 0.1) {
            rarity = 'Secret';
            chance = '1 in 1000';
            percentage = '0.1%';
        } else if (n < 0.8) {
            rarity = 'Mythic';
            chance = '1 in 125';
            percentage = '0.7%';
        } else if (n < 4) {
            rarity = 'Legendary';
            chance = '1 in 25';
            percentage = '3.2%';
        } else if (n < 15) {
            rarity = 'Epic';
            chance = '1 in 7';
            percentage = '11%';
        } else if (n < 30) {
            rarity = 'Rare';
            chance = '1 in 5';
            percentage = '15%';
        } else {
            rarity = 'Common';  // Changed from Rare to Common
            chance = '>1 in 3.3';
            percentage = '>70%';
        }
    } else if (user?.luckBoost?.multiplier === 4) {
        if (n < 0.03) {
            rarity = 'Secret';
            chance = '1 in 3333';
            percentage = '0.03%';
        } else if (n < 0.3) {
            rarity = 'Mythic';
            chance = '1 in 370';
            percentage = '0.27%';
        } else if (n < 1.5) {
            rarity = 'Legendary';
            chance = '1 in 66';
            percentage = '1.2%';
        } else if (n < 7.5) {
            rarity = 'Epic';
            chance = '1 in 13';
            percentage = '6%';
        } else if (n < 15) {
            rarity = 'Rare';
            chance = '1 in 6.6';
            percentage = '7.5%';
        } else {
            rarity = 'Uncommon';
            chance = '>1 in 6.6';
            percentage = '>85%';
        }
    } else if (user?.luckBoost?.multiplier === 2) { // 2x boost
        if (n < 0.05) {
            rarity = 'Secret';
            chance = '1 in 2000';
            percentage = '0.05%';
        } else if (n < 0.5) {
            rarity = 'Mythic';
            chance = '1 in 222';
            percentage = '0.45%';
        } else if (n < 2.5) {
            rarity = 'Legendary';
            chance = '1 in 40';
            percentage = '2%';
        } else if (n < 10) {
            rarity = 'Epic';
            chance = '1 in 10';
            percentage = '7.5%';
        } else if (n < 20) {
            rarity = 'Rare';
            chance = '1 in 5';
            percentage = '10%';
        } else {
            rarity = 'Uncommon';
            chance = '>1 in 5';
            percentage = '>80%';
        }
    } else { // No boost
        if (n < 0.05) {
            rarity = 'Secret';
            chance = '1 in 2000';
            percentage = '0.05%';
        } else if (n < 0.5) {
            rarity = 'Mythic';
            chance = '1 in 222';
            percentage = '0.45%';
        } else if (n < 2.5) {
            rarity = 'Legendary';
            chance = '1 in 40';
            percentage = '2%';
        } else if (n < 10) {
            rarity = 'Epic';
            chance = '1 in 10';
            percentage = '7.5%';
        } else if (n < 20) {
            rarity = 'Rare';
            chance = '1 in 5';
            percentage = '10%';
        } else if (n < 40) {
            rarity = 'Uncommon';
            chance = '1 in 2.5';
            percentage = '20%';
        } else {
            rarity = 'Common';
            chance = '1 in 2.5';
            percentage = '40%';
        }
    }
    return { rarity, chance, percentage };
}

// Helper function for card condition (same as before)
function randomCondition() {
    const a = ['Poor', 'Average', 'Great'];
    return a[Math.floor(Math.random() * a.length)];
}

module.exports = {
    name: 'drop',
    async execute(message, args, { cards, db }) {
        try {
            // Dynamically import nanoid
            const { nanoid } = await import('nanoid');

            try {
                await db.read();
            } catch (error) {
                console.error("Error reading from database:", error, { userId: message.author.id });
                message.reply("Error: Failed to read from the database.");
                return;
            }

            const dropperId = message.author.id;
            const now = Date.now();
            const HOUR = 60 * 60 * 1000;
            const BYPASS_USER_ID = '722463127782031400';

            let user = db.data?.users?.[dropperId];
            if (!user) {
                user = {
                    lastDrops: [],
                    cooldownEnd: 0,
                    inventory: [],
                    balance: 0,
                    dropsAvailable: 0,  // Track available drops
                    luckBoost: null      // Track luck boost
                };
                if (!db.data) db.data = { users: {} };
                db.data.users[dropperId] = user;
                console.log(`Creating new user: ${dropperId}`);
            }

            // Reset or check cooldown (same as before, but using dropsAvailable)
            if (dropperId !== BYPASS_USER_ID) {
                if (user.cooldownEnd && now >= user.cooldownEnd) {
                    user.lastDrops = [];
                    user.cooldownEnd = 0;
                }
                if (user.cooldownEnd && now < user.cooldownEnd) {
                    const resetTime = new Date(user.cooldownEnd).toLocaleString('en-US', {
                        timeZone: 'America/Toronto',
                        hour12: false,
                    });
                    return message.reply(`⏳ You've used all your drops. Resets at **${resetTime}**.`);
                }

                if (user.dropsAvailable <= 0) {
                    return message.reply('You have no more card drops available! Use the `buy` command to get more.');
                }
            }


            // pick rarity→card
            const { rarity, chance, percentage } = getRarity(user); // Pass user object to getRarity
            // **Crucial Check:** Make sure 'cards' is an array before filtering
            if (!Array.isArray(cards)) {
                console.error("Error: 'cards' is not an array:", cards, { userId: message.author.id });
                return message.reply("Error: Card data is not loaded correctly.");
            }
            const pool = cards.filter((c) => c.rarity === rarity);
            if (!pool.length) return message.reply(`No **${rarity}** cards.`);
            const selected = pool[Math.floor(Math.random() * pool.length)];

            //Check if selected is valid
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
            const modifier = { Poor: -0.15, Great: 0.15, Average: 0 }[condition] || 0; //added default
            const finalValue = Math.ceil(baseValue * (1 + modifier));

            // build embed
            let desc = `A **${selected.rarity}** card dropped! (${chance} chance, ${percentage}) React ✅ to claim.`;
            let remaining = dropperId === BYPASS_USER_ID ? 'unlimited' : user.dropsAvailable - 1;
            desc += `\nYou have **${remaining}** drops left.`;
            if (remaining !== 'unlimited' && remaining <= 2)
                desc += `\n⚠️ Only ${remaining} left!`;
            if (isShiny) desc = `✨ **SHINY CARD** ✨\n` + desc;

            const embed = new EmbedBuilder()
                .setTitle(`${sparkle}${selected.title} — ${condition}`)
                .setDescription(desc)
                .setImage(selected.image) // Use String, not object
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
                    await db.read();
                    let claimer = db.data?.users?.[claimerId];
                    if (!claimer) {
                        claimer = { lastDrops: [], cooldownEnd: 0, inventory: [], balance: 0 };
                        if (!db.data) db.data = { users: {} };
                        db.data.users[claimerId] = claimer;
                        console.log(`Creating new user (claimer): ${claimerId}`);
                    }

                    // store only cardId + instance, value/title etc looked up later
                    claimer.inventory.push({
                        cardId: selected.id,
                        instanceId: nanoid(), // Use nanoid here
                        shiny: isShiny,
                        condition,
                        acquired: Date.now(),
                    });
                    try {
                        await db.write();
                        console.log(`Card claimed by: ${claimerId}`);
                    } catch (e) {
                        console.error("Error writing to database (card claim):", error, { userId: claimerId });
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
            // Deduct a drop after successful drop
            if (dropperId !== BYPASS_USER_ID) {
                user.dropsAvailable -= 1;
                 if(user.luckBoost?.dropsRemaining > 0){
                    user.luckBoost.dropsRemaining -= 1;
                    if(user.luckBoost.dropsRemaining <= 0){
                        user.luckBoost = null;
                    }
                }
                try {
                    await db.write();
                } catch (error) {
                    console.error("Error writing to database (decrement dropsAvailable):", error, { userId: dropperId });
                    message.reply("Error: Failed to update your drop count.");
                    return; // Important: Exit the function if the write fails
                }
            }
        } catch (error) {
            console.error("Error in drop command:", error, { userId: message.author.id });
            message.reply("An error occurred while processing the drop.");
        }
    },
};
