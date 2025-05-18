const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'buy',
    description: 'Buy items from the shop: `!buy <item>`',
    async execute(message, args, { db }) {
        const userId = message.author.id;
        const item = args[0]?.toLowerCase();

        if (!item) {
            return message.reply('Please specify an item to buy: `cardpack`, `2xboost`, or `5xboost`.');
        }

        await db.read();
        // Make sure the user exists in the DB
        db.data.users[userId] ||= { inventory: [], balance: 0, dropsAvailable: 0, luckBoost: null };
        let balance = db.data.users[userId].balance;
        let dropsAvailable = db.data.users[userId].dropsAvailable;

        let price = 0;
        let description = '';

        if (item === 'cardpack') {
            price = 5000;
            description = 'Adds 10 card drops to your available drops.';
        } else if (item === '2xboost') {
            price = 10000;
            description = 'Activated 2x luck boost for your next 100 card drops!'; // Changed description
        } else if (item === '5xboost') {
            price = 25000;
            description = 'Activated 5x luck boost for your next 100 card drops!'; // Changed description
        } else {
            return message.reply('Invalid item.  Please choose `cardpack`, `2xboost`, or `5xboost`.');
        }

        if (balance < price) {
            return message.reply(`You don't have enough coins to buy ${item}.  The price is ${price}₩.`);
        }

        // Deduct the cost from the user's balance
        db.data.users[userId].balance -= price;

        if (item === 'cardpack') {
            db.data.users[userId].dropsAvailable += 10;
            dropsAvailable = db.data.users[userId].dropsAvailable; //update
        } else if (item === '2xboost' || item === '5xboost') {
            // Apply luck boost
            let boost = item === '2xboost' ? 2 : 5;

            // Check for existing boost and combine
            if (db.data.users[userId].luckBoost) {
                const existingBoost = db.data.users[userId].luckBoost;
                if (existingBoost.multiplier === 2 && boost === 5 ||
                    existingBoost.multiplier === 5 && boost === 2) {
                    boost = 10; // Combine to 10x
                } else if (existingBoost.multiplier === 2 && boost === 2) {
                    boost = 4;
                } else if (existingBoost.multiplier === 5 && boost === 5) {
                    boost = 25;
                } else {
                    boost = existingBoost.multiplier + boost;
                }
            }
            db.data.users[userId].luckBoost = {
                multiplier: boost,
                dropsRemaining: 100, // Track remaining drops
            };
        }
        await db.write();
        if (item === 'cardpack') {
            return message.reply(`✅ Successfully purchased ${item}! ${description} You now have ${dropsAvailable} drops available and your balance is ${db.data.users[userId].balance}₩.`);
        } else {
            return message.reply(`✅ Successfully purchased ${item}! ${description} Your new balance is ${db.data.users[userId].balance}₩.`);
        }

    },
};
