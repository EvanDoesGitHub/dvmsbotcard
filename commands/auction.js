const { EmbedBuilder } = require('discord.js');
// const { nanoid } = require('nanoid'); // Remove this line

module.exports = {
  name: 'auction',
  description: 'Start, bid in, or stop an auction:\n' +
    '`!auction start <groupId> <startingPrice> <durationSeconds>`\n' +
    '`!auction bid <auctionId> <amount>`\n' +
    '`!auction stop <auctionId>` (owner only)',
  async execute(message, args, { cards, db }) {
    await db.read();
    const userId = message.author.id;
    const sub = args[0]?.toLowerCase();

    // helper to parse groupId (cardX.Y.Z or X.Y.Z)
    function parseGroupId(input) {
      const parts = input.split('.');
      if (parts.length !== 3) return null;
      const [raw, shinyCode, condCode] = parts;
      return {
        cardId: raw.startsWith('card') ? raw : `card${raw}`,
        shiny: shinyCode === '1',
        condition: condCode === '3' ? 'Poor' : condCode === '4' ? 'Great' : 'Average'
      };
    }

    // ENSURE auctions key exists
    db.data.auctions ||= {};

    // ――― START ―――
    if (sub === 'start') {
      const groupId = args[1];
      const startPrice = parseInt(args[2], 10);
      const durationSec = parseInt(args[3], 10);

      if (!groupId || isNaN(startPrice) || isNaN(durationSec) || durationSec <= 0) {
        return message.reply('Usage: `!auction start <groupId> <startingPrice> <durationSeconds>`');
      }

      // find card in your inventory
      const user = db.data.users[userId] ||= { inventory: [], balance: 0 };
      const info = parseGroupId(groupId);
      if (!info) return message.reply('Invalid group ID format. Use `<cardId>.<shiny>.<condition>`');

      const idx = user.inventory.findIndex(c =>
        c.id === info.cardId && !!c.shiny === info.shiny && c.condition === info.condition
      );
      if (idx === -1) {
        return message.reply(`You don't have any **${groupId}** to auction.`);
      }

      // pull the card out of inventory
      const [card] = user.inventory.splice(idx, 1);
      await db.write();

      // register auction
      // const auctionId = nanoid(); // Remove this line
      const now = Date.now();
      const { nanoid } = await import('nanoid');  // Dynamically import nanoid
      const auctionId = nanoid();
      db.data.auctions[auctionId] = {
        id: auctionId,
        seller: userId,
        card,
        highestBid: startPrice,
        highestBidder: null,
        deposits: {},          // track each user’s deposit
        expiresAt: now + durationSec * 1000,
        ended: false
      };
      await db.write();

      const embed = new EmbedBuilder()
        .setTitle('🏷️ Auction Started')
        .setDescription(`**${card.title}** (${groupId}) is up for auction!`)
        .addFields(
          { name: 'Auction ID', value: auctionId, inline: true },
          { name: 'Start Price', value: `${startPrice}₩`, inline: true },
          { name: 'Duration', value: `${durationSec}s`, inline: true }
        )
        .setColor(0x00AE86);

      return message.channel.send({ embeds: [embed] });
    }

    // ――― BID ―――
    else if (sub === 'bid') {
      const auctionId = args[1];
      const bidAmount = parseInt(args[2], 10);

      if (!auctionId || isNaN(bidAmount)) {
        return message.reply('Usage: `!auction bid <auctionId> <amount>`');
      }
      const auction = db.data.auctions[auctionId];
      if (!auction || auction.ended) {
        return message.reply('Auction not found or already ended.');
      }
      const now = Date.now();
      if (now >= auction.expiresAt) {
        return message.reply('This auction has already expired.');
      }

      // ensure bidder has enough balance beyond any previous deposit
      const user = db.data.users[userId] ||= { inventory: [], balance: 0 };
      const prev = auction.deposits[userId] || 0;
      const required = bidAmount - prev;
      if (required > user.balance) {
        return message.reply(`Insufficient funds. You need **${required}₩** more to bid **${bidAmount}₩**.`);
      }
      if (bidAmount <= auction.highestBid) {
        return message.reply(`Your bid must exceed the current highest bid of **${auction.highestBid}₩**.`);
      }

      // refund last highest bidder
      if (auction.highestBidder) {
        db.data.users[auction.highestBidder].balance += auction.highestBid;
        auction.deposits[auction.highestBidder] = 0;
      }

      // take new deposit
      user.balance -= required;
      auction.deposits[userId] = bidAmount;
      auction.highestBid = bidAmount;
      auction.highestBidder = userId;
      await db.write();

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('💰 New Highest Bid')
            .setDescription(`<@${userId}> bids **${bidAmount}₩** on **${auction.card.title}**`)
            .addFields(
              { name: 'Auction ID', value: auctionId, inline: true },
              { name: 'Expires In', value: `${Math.ceil((auction.expiresAt - now) / 1000)}s`, inline: true }
            )
            .setColor(0xFFA500)
        ]
      });
    }

    // ――― STOP ―――
    else if (sub === 'stop') {
      const auctionId = args[1];
      if (!auctionId) {
        return message.reply('Usage: `!auction stop <auctionId>`');
      }
      const auction = db.data.auctions[auctionId];
      if (!auction) {
        return message.reply('Auction not found.');
      }
      if (auction.seller !== userId) {
        return message.reply('Only the auction creator can stop it.');
      }
      if (auction.ended) {
        return message.reply('This auction is already ended.');
      }

      auction.ended = true;
      await db.write();
      return message.channel.send(`✅ Auction \`${auctionId}\` has been stopped by its creator.`);
    }

    // ――― INVALID ―――
    else {
      return message.reply('Invalid subcommand. Use `start`, `bid` or `stop`.');
    }
  }
};
