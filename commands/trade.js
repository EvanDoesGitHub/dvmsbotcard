const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'trade',
  description: 'Initiate a trade with another user',
  async execute(message, args, { cards, db }) {
    try {
      // Dynamically import nanoid
      const { nanoid } = await import('nanoid');

      await db.read();
      const initiator = message.author;
      const target = message.mentions.users.first();

      if (!target || target.bot) {
        return message.reply('Please mention a valid user to trade with.');
      }
      if (initiator.id === target.id) {
        return message.reply("You can't trade with yourself!");
      }
      // Prevent concurrent trades
      if (db.data.activeTrades?.[initiator.id] || db.data.activeTrades?.[target.id]) {
        return message.reply('Either you or they are already in a trade.');
      }

      // Create trade session
      const tradeId = nanoid();
      const trade = {
        id: tradeId,
        a: initiator.id,
        b: target.id,
        offers: { [initiator.id]: [], [target.id]: [] },
        confirmed: [],
      };
      db.data.trades = db.data.trades || {};
      db.data.activeTrades = db.data.activeTrades || {};
      db.data.trades[tradeId] = trade;
      db.data.activeTrades[initiator.id] = tradeId;
      db.data.activeTrades[target.id] = tradeId;
      await db.write();

      // Ask target to accept
      const embed = new EmbedBuilder()
        .setTitle('Trade Request')
        .setDescription(
          `${initiator} wants to trade with you!\n\n` +
            `React with ✅ within 60s to accept.`
        )
        .setColor(0xffa500);

      const inviteMsg = await message.channel.send({ embeds: [embed] });
      await inviteMsg.react('✅');

      const filter = (r, u) => r.emoji.name === '✅' && u.id === target.id;
      inviteMsg
        .awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
        .then(async () => {
          try {
            message.channel.send(
              `✅ Trade #${tradeId} accepted! Both players, use \`!offer <cardId> <qty>\` to set your offer, then \`!confirm\` when ready.` // Changed !offer format
            );
          } catch (error) {
             console.error("Error sending message after trade acceptance:", error);
          }
        })
        .catch(async () => {
          try{
          // timeout: clean up
          delete db.data.trades[tradeId];
          delete db.data.activeTrades[initiator.id];
          delete db.data.activeTrades[target.id];
          await db.write();
          message.channel.send('❌ Trade request timed out.');
          } catch(error){
             console.error("Error during trade timeout:", error);
          }
        });
    } catch (error) {
      console.error('Error in trade command:', error);
      message.reply('An error occurred while initiating the trade.');
    }
  },
};
