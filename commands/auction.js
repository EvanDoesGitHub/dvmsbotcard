const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'auction',
    description: 'Start, bid in, or stop an auction:\n' +
        '`!auction start <groupId> <startingPrice> <duration>`\n' +
        '`!auction bid <auctionId> <amount>`\n' +
        '`!auction stop <auctionId>` (owner only)\n' +
        '  - Duration can be specified like: 1w, 2d, 3h, 4m, 5s.  Example: 1w2d3h',
    async execute(message, args, { cards, db }) {
        await db.read();
        const userId = message.author.id;
        const sub = args[0]?.toLowerCase();

        // helper to parse groupId (cardX.Y.Z or X.Y.Z)
        function parseGroupId(input) {
            const match = input.match(/^(\d+)\.(\d)\.(\d)$/);
            if (!match) {
                console.log(`parseGroupId: Invalid input format: ${input}`);
                return null;
            }
            const [, cardIdRaw, shinyCode, conditionCode] = match;
            const cardId = `card${cardIdRaw}`;
            const shiny = shinyCode === '1';
            const condition = conditionCode === '3' ? 'Poor'
                : conditionCode === '4' ? 'Great'
                : 'Average';
            console.log(`parseGroupId: Parsed cardId: ${cardId}, shiny: ${shiny}, condition: ${condition}`);
            return { cardId, shiny, condition };
        }

        // ENSURE auctions key exists
        db.data.auctions ||= {};

        // ――― START ―――
        if (sub === 'start') {
            const groupId = args[1];
            const startPrice = parseInt(args[2], 10);
            const durationStr = args[3];

            if (!groupId || isNaN(startPrice) || !durationStr) {
                console.log(`!auction start: Invalid arguments. groupId: ${groupId}, startPrice: ${startPrice}, durationStr: ${durationStr}`);
                return message.reply('Usage: `!auction start <groupId> <startingPrice> <duration>` (e.g., `!auction start 3.1.4 100 1w2d3h`)');
            }

            // Validate startPrice
            if (startPrice < 1) {
                console.log(`!auction start: startPrice is less than 1: ${startPrice}`);
                return message.reply('Starting price must be at least 1.');
            }

            // Parse duration string
            const durationRegex = /(\d+)([wdhms])/gi;
            let totalSeconds = 0;
            let match;
            while ((match = durationRegex.exec(durationStr)) !== null) {
                const value = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();
                switch (unit) {
                    case 'w': totalSeconds += value * 60 * 60 * 24 * 7; break;
                    case 'd': totalSeconds += value * 60 * 60 * 24; break;
                    case 'h': totalSeconds += value * 60 * 60; break;
                    case 'm': totalSeconds += value * 60; break;
                    case 's': totalSeconds += value; break;
                }
            }

            // Validate totalSeconds
            if (totalSeconds < 10 || totalSeconds > 86400) {
                console.log(`!auction start: Invalid duration: ${totalSeconds}`);
                return message.reply('Duration must be between 10 seconds and 24 hours (86400 seconds).');
            }
            const durationSec = totalSeconds;

            // find card in your inventory
            const user = db.data.users[userId] ||= { inventory: [], balance: 0 };
            const info = parseGroupId(groupId);
            if (!info) {
                console.log(`!auction start: Invalid groupId: ${groupId}`);
                return message.reply('Invalid group ID format. Use `<cardId>.<shiny>.<condition>` (e.g., `3.1.4`)');
            }

            console.log(`!auction start: User inventory:`, user.inventory);
            console.log(`!auction start: Parsed card info:`, info);

            const cardToAuction = user.inventory.find(c =>
                c.cardId === info.cardId && !!c.shiny === info.shiny && c.condition === info.condition
            );

            if (!cardToAuction) {
                console.log(`!auction start: Card not found in inventory. groupId: ${groupId}, info:`, info);
                return message.reply(`You don't have any **${groupId}** to auction.`);
            }
            const cardInstanceId = cardToAuction.instanceId; //store instanceId

            // pull the card out of inventory
            const newInventory = user.inventory.filter(c => !(c.cardId === info.cardId && !!c.shiny === info.shiny && c.condition === info.condition && c.instanceId === cardInstanceId)); // added instanceId check
            if (newInventory.length !== user.inventory.length - 1) {
                user.inventory = newInventory;
                console.log(`!auction start: Card removed from inventory. New inventory:`, newInventory);
            } else {
                console.log(`!auction start: Card not removed from inventory.  This should not happen. groupId: ${groupId}, info:`, info);
                return message.reply(`You don't have any **${groupId}** to auction.`);
            }
            await db.write();

            // register auction
            const { nanoid } = await import('nanoid'); // Dynamically import nanoid
            const auctionId = nanoid();
            const now = Date.now();
            db.data.auctions[auctionId] = {
                id: auctionId,
                seller: userId,
                card: cardToAuction,
                highestBid: startPrice,
                highestBidder: null,
                deposits: {},
                expiresAt: now + durationSec * 1000,
                ended: false
            };
            await db.write();

            const baseCard = cards.find(c => c.id === cardToAuction.cardId); // Find base card info
            const sparkle = cardToAuction.shiny ? '✨' : '';
            const embed = new EmbedBuilder()
                .setTitle('🏷️ Auction Started')
                .setDescription(`**${baseCard.title}** ${sparkle} (${groupId}) is up for auction!`) // Use baseCard
                .addFields(
                    { name: 'Auction ID', value: auctionId, inline: true },
                    { name: 'Start Price', value: `${startPrice}₩`, inline: true },
                    { name: 'Duration', value: `${durationStr}`, inline: true }, // Show the user's input
                    { name: 'Seller', value: `<@${userId}>`, inline: true }, // Add seller
                )
                .setImage(baseCard.image) // Add card image
                .setColor(0x00AE86);
            console.log(`!auction start: Auction started:`, db.data.auctions[auctionId]);
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

