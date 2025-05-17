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
        const subCommand = args[0]?.toLowerCase();

        // Helper Functions
        /**
         * Parses a group ID string into its constituent parts.
         * @param {string} groupId - The group ID string (e.g., "1.0.2" or "card1.1.3").
         * @returns {object|null} - An object with cardId, shiny, and condition, or null if invalid.
         */
        function parseGroupId(groupId) {
            const regex = /^(\d+|card\d+)\.(\d)\.(\d)$/;
            const match = groupId.match(regex);
            if (!match) {
                return null; // Invalid format
            }
            let cardId = match[1];
            const shiny = match[2] === '1';
            const condition = match[3] === '3' ? 'Poor' : match[3] === '4' ? 'Great' : 'Average';

             if (!cardId.startsWith('card')) {
                cardId = `card${cardId}`;
             }
            return { cardId, shiny, condition };
        }

        /**
         * Parses a duration string into total seconds.
         * @param {string} durationString - The duration string (e.g., "1w2d3h").
         * @returns {number} - The total duration in seconds.
         */
        function parseDuration(durationString) {
            const regex = /(\d+)([wdhms])/gi;
            let totalSeconds = 0;
            let match;
            while ((match = regex.exec(durationString)) !== null) {
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
            return totalSeconds;
        }

        // Ensure auctions key exists in database
        db.data.auctions = db.data.auctions || {};

        // --- Start Auction ---
        if (subCommand === 'start') {
            const groupId = args[1];
            const startingPrice = parseInt(args[2], 10);
            const durationString = args[3];

            // Input validation
            if (!groupId || isNaN(startingPrice) || isNaN(parseDuration(durationString)) || startingPrice < 1) {
                return message.reply(
                    'Usage: `!auction start <groupId> <startingPrice> <duration>` (e.g., `!auction start 3.1.4 100 1w2d3h`)\n' +
                    '  - Starting price must be a number greater than 0.\n' +
                    '  - Duration must be in the format: 1w2d3h4m5s (minimum 10 seconds, maximum 30 days).'
                );
            }

            const durationSeconds = parseDuration(durationString);
            if (durationSeconds < 10 || durationSeconds > 30 * 24 * 60 * 60) {
                return message.reply('Duration must be between 10 seconds and 30 days.');
            }

            const parsedGroupId = parseGroupId(groupId);
            if (!parsedGroupId) {
                return message.reply('Invalid group ID format.  Use something like:  1.0.2');
            }

            const { cardId, shiny, condition } = parsedGroupId;
            const user = db.data.users[userId] || { inventory: [], balance: 0 };
            const cardToAuction = user.inventory.find(card =>
                card.cardId === cardId && card.shiny === shiny && card.condition === condition
            );

            if (!cardToAuction) {
                return message.reply(`You don't have that card (${groupId}) to auction.`);
            }

            // Remove the card from the user's inventory
            user.inventory = user.inventory.filter(card => card.instanceId !== cardToAuction.instanceId);
            await db.write();

            // Create the auction
            const auctionId = await import('nanoid').then(nanoid => nanoid.nanoid()); // Dynamically import nanoid
            const expiresAt = Date.now() + durationSeconds * 1000;
            const newAuction = {
                id: auctionId,
                seller: userId,
                card: cardToAuction,
                highestBid: startingPrice,
                highestBidder: null,
                deposits: {},
                expiresAt,
                ended: false,
            };
            db.data.auctions[auctionId] = newAuction;
            await db.write();

            // Build and send the embed
            const baseCard = cards.find(c => c.id === cardToAuction.cardId);
            const shinyText = cardToAuction.shiny ? '✨' : '';
            const embed = new EmbedBuilder()
                .setTitle('🏷️ New Auction Started')
                .setDescription(`**${baseCard.title}** ${shinyText} (${groupId}) is up for auction!`)
                .addFields(
                    { name: 'Auction ID', value: auctionId, inline: true },
                    { name: 'Starting Price', value: `${startingPrice}₩`, inline: true },
                    { name: 'Duration', value: durationString, inline: true },
                    { name: 'Seller', value: `<@${userId}>`, inline: true },
                )
                .setImage(baseCard.image)
                .setColor(0x00AE86);

            return message.channel.send({ embeds: [embed] });
        }

        // --- Bid on Auction ---
        if (subCommand === 'bid') {
            const auctionId = args[1];
            const bidAmount = parseInt(args[2], 10);

            // Input validation
            if (!auctionId || isNaN(bidAmount) || bidAmount < 1) {
                return message.reply('Usage: `!auction bid <auctionId> <amount>` - Amount must be a number greater than 0.');
            }

            const auction = db.data.auctions[auctionId];
            if (!auction) {
                return message.reply('Auction not found.');
            }
            if (auction.ended) {
                return message.reply('This auction has ended.');
            }
            if (Date.now() >= auction.expiresAt) {
                return message.reply('This auction has expired.');
            }
            if (bidAmount <= auction.highestBid) {
                return message.reply(`Your bid must be higher than the current highest bid of ${auction.highestBid}₩.`);
            }

            const user = db.data.users[userId] || { balance: 0 };
            const previousDeposit = auction.deposits[userId] || 0;
            const requiredFunds = bidAmount - previousDeposit;

            if (user.balance < requiredFunds) {
                return message.reply(`You need ${requiredFunds}₩ to make that bid.  Your current balance: ${user.balance}₩`);
            }

            // Refund the previous highest bidder
            if (auction.highestBidder) {
                db.data.users[auction.highestBidder].balance += auction.highestBid;
                auction.deposits[auction.highestBidder] = 0;
            }

            // Deduct the bid amount from the bidder and update auction
            user.balance -= requiredFunds;
            auction.deposits[userId] = bidAmount;
            auction.highestBid = bidAmount;
            auction.highestBidder = userId;
            await db.write();

            // Send a confirmation message
            const embed = new EmbedBuilder()
                .setTitle('💰 New Highest Bid')
                .setDescription(`<@${userId}> has the highest bid with **${bidAmount}₩**!`)
                .addFields(
                    { name: 'Auction ID', value: auctionId, inline: true },
                    {
                        name: 'Time Remaining',
                        value: `${Math.ceil((auction.expiresAt - Date.now()) / 1000)} seconds`,
                        inline: true
                    }
                )
                .setColor(0xFFA500);
            return message.channel.send({ embeds: [embed] });
        }

        // --- Stop Auction ---
        if (subCommand === 'stop') {
            const auctionId = args[1];
            if (!auctionId) {
                return message.reply('Usage: `!auction stop <auctionId>`');
            }

            const auction = db.data.auctions[auctionId];
            if (!auction) {
                return message.reply('Auction not found.');
            }
            if (auction.seller !== userId) {
                return message.reply('You can only stop auctions you created.');
            }
            if (auction.ended) {
                return message.reply('That auction has already ended.');
            }

            auction.ended = true;
            await db.write();
            return message.channel.send(`✅ Auction \`${auctionId}\` has been stopped.`);
        }

        // --- Invalid Subcommand ---
        return message.reply('Invalid subcommand. Use `start`, `bid`, or `stop`.');
    },
};

