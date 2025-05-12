const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'drop',
  async execute(message, args, { cards, db }) {
    try {
      // Dynamically import nanoid
      const { nanoid } = await import('nanoid');

      try {
        await db.read();
      } catch (error) {
        console.error("Error reading from database:", error);
        message.reply("Error: Failed to read from the database.");
        return;
      }

      const dropperId = message.author.id;
      const now = Date.now();
      const HOUR = 60 * 60 * 1000;
      const BYPASS_USER_ID = '722463127782031400';

      let user = db.data.users[dropperId];
      if (!user) {
        user = { lastDrops: [], cooldownEnd: 0, inventory: [] };
        db.data.users[dropperId] = user;
      }

      // reset or check cooldown
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
          return message.reply(`⏳ You've used all 10 drops. Resets at **${resetTime}**.`);
        }
        user.lastDrops = user.lastDrops.filter((ts) => now - ts < HOUR);
        if (user.lastDrops.length >= 10) {
          user.cooldownEnd = now + HOUR;
          try {
            await db.write();
          } catch (error) {
            console.error("Error writing to database:", error);
            message.reply("Error: Failed to write to the database.");
            return;
          }
          const resetTime = new Date(user.cooldownEnd).toLocaleString('en-US', {
            timeZone: 'America/Toronto',
            hour12: false,
          });
          return message.reply(`⏳ Hit 10 drops. Resets at **${resetTime}**.`);
        }
        user.lastDrops.push(now);
        try {
          await db.write();
        } catch (error) {
          console.error("Error writing to database:", error);
          message.reply("Error: Failed to write to the database.");
          return;
        }
      }

      const remaining =
        dropperId === BYPASS_USER_ID ? 'unlimited' : 10 - (user.lastDrops?.length || 0);

      // pick rarity→card
      const { rarity } = getRarity();
      const pool = cards.filter((c) => c.rarity === rarity);
      if (!pool.length) return message.reply(`No **${rarity}** cards.`);
      const selected = pool[Math.floor(Math.random() * pool.length)];

      //Check if selected is valid
      if(!selected){
        console.error("Error: No card selected from pool. Pool:", pool, "Rarity:", rarity);
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
      let desc = `A **${selected.rarity}** card dropped! React ✅ to claim.`;
      desc += `\nYou have **${remaining}** drops left this hour.`;
      if (remaining !== 'unlimited' && remaining <= 2)
        desc += `\n⚠️ Only ${remaining} left!`;
      if (isShiny) desc = `✨ **SHINY CARD** ✨\n` + desc;

      const embed = new EmbedBuilder()
        .setTitle(`${sparkle}${selected.title} — ${condition}`)
        .setDescription(desc)
        .setImage(selected.image ) // Use String, not object
        .setFooter({ text: `Value: ${finalValue}₩` });

      let dropMsg;
      try {
        dropMsg = await message.reply({ embeds: [embed] });
        await dropMsg.react('✅');
      } catch (error) {
        console.error("Error sending message or reacting:", error);
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
          let claimer = db.data.users[claimerId];
          if (!claimer) {
            claimer = { lastDrops: [], cooldownEnd: 0, inventory: [] };
            db.data.users[claimerId] = claimer;
          }

          // store only cardId + instance, value/title etc looked up later
          claimer.inventory.push({
            cardId: selected.id,
            instanceId: nanoid(), // Use nanoid here
            shiny: isShiny,
            condition,
            acquired: Date.now(),
          });
          await db.write();

          message.channel.send(
            `🎉 <@${claimerId}> picked up **${selected.title}** (${selected.rarity}) ${sparkle}!`
          );
        } catch (error) {
          console.error("Error in collect event:", error); //catch errors
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
          console.error("Error in end event", error);
        }
      });
    } catch (error) {
      console.error("Error in drop command:", error);
      message.reply("An error occurred while processing the drop."); // send message to channel
    }
  },
};

// Helpers
function getRarity() {
  const n = Math.random() * 100;
  if (n < 0.05) return { rarity: 'Secret' };
  if (n < 0.5) return { rarity: 'Mythic' };
  if (n < 2.5) return { rarity: 'Legendary' };
  if (n < 10) return { rarity: 'Epic' };
  if (n < 20) return { rarity: 'Rare' };
  if (n < 40) return { rarity: 'Uncommon' };
  return { rarity: 'Common' };
}
function randomCondition() {
  const a = ['Poor', 'Average', 'Great'];
  return a[Math.floor(Math.random() * a.length)];
}
