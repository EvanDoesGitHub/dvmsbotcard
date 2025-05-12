const { EmbedBuilder } = require('discord.js');

async function sweepExpiredAuctions(client, db) {
  await db.read();

  // Ensure auctions is always an object.  If it's initially undefined, initialize it.
  if (!db.data.auctions) {
    db.data.auctions = {};
  }

  // Iterate over the values (the auction objects) of the db.data.auctions object
  for (const auction of Object.values(db.data.auctions)) {
    if (auction.ended) continue;

    if (Date.now() >= auction.end) {
      auction.ended = true;

      // Fetch the channel; handle the error *and* check if the channel is valid.
      const channel = await client.channels.fetch(auction.owner).catch(error => {
        console.error("Failed to fetch channel:", error);
        return null; // Return null to indicate failure
      });

      if (!channel) {
        console.warn(`Channel ${auction.owner} not found for auction. Skipping notification.`);
        continue; // Skip the rest of this iteration
      }

      if (auction.highestBidder) {
        const seller = db.data.users[auction.owner] ||= { inventory: [], balance: 0 };
        const winner = db.data.users[auction.highestBidder] ||= { inventory: [], balance: 0 };

        const card = auction.item;
        seller.balance += auction.highestBid;
        winner.balance -= auction.highestBid;
        winner.inventory.push(card);

        const embed = new EmbedBuilder()
          .setTitle('🎉 Auction Ended')
          .setDescription(`Card **${card.title || card.cardId}** sold to <@${auction.highestBidder}> for **${auction.highestBid}₩**.`)
          .setColor('Green');

        channel.send({ embeds: [embed] });
      } else {
        const seller = db.data.users[auction.owner] ||= { inventory: [], balance: 0 };
        seller.inventory.push(auction.item);

        const embed = new EmbedBuilder()
          .setTitle('⌛ Auction Ended')
          .setDescription(`No bids for **${auction.item.title || auction.item.cardId}**. It was returned to <@${auction.owner}>.`)
          .setColor('Red');

        channel.send({ embeds: [embed] });
      }
    }
  }

  await db.write();
}

module.exports = { sweepExpiredAuctions };
