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
        db.data.users[userId] ||= { inventory: [], balance: 0, cooldown: 0 };
        let balance = db.data.users[userId].balance;

        let price = 0;
        let description = '';

        if (item === 'cardpack') {
            price = 5000;
            description = 'Instantly refilled your drop timer!';
        } else if (item === '2xboost') {
            price = 10000;
            description = 'Activated 2x luck boost for your next 100 card drops!';
        } else if (item === '5xboost') {
            price = 25000;
            description = 'Activated 5x luck boost for your next 100 card drops!';
        } else {
            return message.reply('Invalid item.  Please choose `cardpack`, `2xboost`, or `5xboost`.');
        }

        if (balance < price) {
            return message.reply(`You don't have enough coins to buy ${item}.  The price is ${price}₩.`);
        }

        // Deduct the cost from the user's balance
        db.data.users[userId].balance -= price;

        if (item === 'cardpack') {
            // Reset the user's cooldown
            db.data.users[userId].cooldown = 0;
        } else if (item === '2xboost' || item === '5xboost') {
            // Apply luck boost
            let boost = item === '2xboost' ? 2 : 5;
            let expiresAt = Date.now() + 100 * 60 * 60 * 1000; // Expires after 100 drops

            // Check for existing boost and combine
            if (db.data.users[userId].luckBoost) {
                const existingBoost = db.data.users[userId].luckBoost;
                if (existingBoost.multiplier === 2 && boost === 5 ||
                    existingBoost.multiplier === 5 && boost === 2) {
                    boost = 10; // Combine to 10x
                    expiresAt = Math.max(existingBoost.expiresAt, expiresAt); // Keep the later expiration
                } else if (existingBoost.multiplier === 2 && boost === 2) {
                    boost = 4;
                    expiresAt = Math.max(existingBoost.expiresAt, expiresAt);
                }
                 else if (existingBoost.multiplier === 5 && boost === 5) {
                    boost = 25;
                    expiresAt = Math.max(existingBoost.expiresAt, expiresAt);
                }
                else {
                    boost = existingBoost.multiplier + boost;
                    expiresAt = Math.max(existingBoost.expiresAt, expiresAt);
                }
            }
            db.data.users[userId].luckBoost = {
                multiplier: boost,
                expiresAt: expiresAt,
            };
        }
        await db.write();

        return message.reply(`✅ Successfully purchased ${item}! ${description} Your new balance is ${db.data.users[userId].balance}₩.`);
    },
};

function getRarity(user) { // Added user parameter
    const n = Math.random() * 100;
    let rarity;

    if (user?.luckBoost?.multiplier === 25) { // 25x boost
        if (n < 0.01) rarity = 'Secret';
        else if (n < 0.1) rarity = 'Mythic';
        else if (n < 0.5) rarity = 'Legendary';
        else if (n < 2) rarity = 'Epic';
        else if (n < 5) rarity = 'Rare';
        else rarity = 'Rare';
    }
    else if (user?.luckBoost?.multiplier === 10) { // 10x boost: significantly increased chances
        if (n < 0.02) rarity = 'Secret';  // Buffed Secret
        else if (n < 0.2) rarity = 'Mythic';    // Buffed Mythic
        else if (n < 1) rarity = 'Legendary';    // Buffed Legendary
        else if (n < 5) rarity = 'Epic';       // Buffed Epic
        else if (n < 15) rarity = 'Rare';     // Buffed Rare
        else rarity = 'Rare';
    } else if (user?.luckBoost?.multiplier === 5) { // 5x boost: increased chances, no commons/uncommons
        if (n < 0.1) rarity = 'Secret';         //was 0.05
        else if (n < 0.8) rarity = 'Mythic';    //was 0.5
        else if (n < 4) rarity = 'Legendary';    //was 2.5
        else if (n < 15) rarity = 'Epic';      //was 10
        else if (n < 30) rarity = 'Rare';      //was 20
        else rarity = 'Rare';
    } else if (user?.luckBoost?.multiplier === 4) {
        if (n < 0.03) rarity = 'Secret';
        else if (n < 0.3) rarity = 'Mythic';
        else if (n < 1.5) rarity = 'Legendary';
        else if (n < 7.5) rarity = 'Epic';
        else if (n < 15) rarity = 'Rare';
        else rarity = 'Uncommon';
    }
    else if (user?.luckBoost?.multiplier === 2) { // 2x boost: no commons
        if (n < 0.05) rarity = 'Secret';
        else if (n < 0.5) rarity = 'Mythic';
        else if (n < 2.5) rarity = 'Legendary';
        else if (n < 10) rarity = 'Epic';
        else if (n < 20) rarity = 'Rare';
        else rarity = 'Uncommon';
    } else {
        if (n < 0.05) rarity = 'Secret';
        else if (n < 0.5) rarity = 'Mythic';
        else if (n < 2.5) rarity = 'Legendary';
        else if (n < 10) rarity = 'Epic';
        else if (n < 20) rarity = 'Rare';
        else if (n < 40) rarity = 'Uncommon';
        else rarity = 'Common';
    }
    return { rarity };
}
