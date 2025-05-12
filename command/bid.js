// commands/bid.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bid',
  description: '💰 Place a bid on an active auction: `!bid <auctionId> <amount>`',
  async execute(message, args, { db }) {
    const userId = message.author.id;
    const [auctionId, bidAmountStr] = args;
    const bidAmount = parseInt(bidAmountStr, 10);

    if (!auctionId || isNaN(bidAmount)) {
      return message.reply('Usage: `!bid <auctionId> <amount>`');
    }

    await db.read();
    const auctions = db.data.auctions ||= {};
    const auction = auctions[auctionId];

    if (!auction || auction.ended || Date.now() > auction.expiresAt) {
      return message.reply('❌ Auction not found or already ended.');
    }
    if (auction.seller === userId) {
      return message.reply('❌ You can’t bid on your own auction.');
    }

    // Ensure user record
    const users = db.data.users ||= {};
    const bidder = users[userId] ||= { inventory: [], balance: 0 };
    // Ensure deposits map exists
    auction.deposits = auction.deposits || {};

    // Previous deposit by you
    const prevDeposit = auction.deposits[userId] || 0;
    // How much more you must lock up
    const needed = bidAmount - prevDeposit;

    if (needed > bidder.balance) {
      return message.reply(`❌ You need **${needed}₩** more to reach **${bidAmount}₩**.`);
    }
    if (auction.highestBid && bidAmount <= auction.highestBid) {
      return message.reply(`❌ Your bid must exceed the current highest bid of **${auction.highestBid}₩**.`);
    }

    // Refund previous top bidder
    if (auction.highestBidder) {
      const prev = users[auction.highestBidder];
      prev.balance += auction.highestBid;
      auction.deposits[auction.highestBidder] = 0;
    }

    // Deduct only the extra you need
    bidder.balance -= needed;
    auction.deposits[userId] = bidAmount;
    auction.highestBid = bidAmount;
    auction.highestBidder = userId;

    await db.write();

    const embed = new EmbedBuilder()
      .setTitle('💸 New Highest Bid!')
      .setDescription(`<@${userId}> raised the bid to **${bidAmount}₩**`)
      .addFields(
        { name: 'Auction ID', value: auctionId, inline: true },
        { name: 'Time Left', value: `${Math.ceil((auction.expiresAt - Date.now())/1000)}s`, inline: true }
      )
      .setColor(0xFFA500);

    return message.channel.send({ embeds: [embed] });
  }
};
