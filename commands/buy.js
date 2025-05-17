module.exports = {
    name: 'buy',
    description: 'Buy items from the shop: `!buy <item>`',
    async execute(message, args, { db }) {
        const userId = message.author.id;
        const item = args[0]?.toLowerCase();

        if (!item) {
            return message.reply('Please specify an item to buy: `cardpack`, `2xboost`, or `5xboost`.');
        }

        // Make sure the user exists in the DB
        db.data.users[userId] ||= { inventory: [], balance: 0, cooldown: 0 };  //add cooldown
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
            const boost = item === '2xboost' ? 2 : 5;
            const expiresAt = Date.now() + 100 * 60 * 60 * 1000; // Expires after 100 drops (assuming 1 drop per hour)
           db.data.users[userId].luckBoost = {
                multiplier: boost,
                expiresAt: expiresAt,
            };
        }
        await db.write();
        message.reply(`✅ Successfully purchased ${item}! ${description} Your new balance is ${db.data.users[userId].balance}₩.`);
    },
};
