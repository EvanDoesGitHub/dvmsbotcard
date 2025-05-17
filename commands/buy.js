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
             await db.write();
            return message.reply(`✅ Successfully purchased ${item}! ${description} Your new balance is ${db.data.users[userId].balance}₩.`);
        } else if (item === '2xboost' || item === '5xboost') {
            // Apply luck boost
            const boost = item === '2xboost' ? 2 : 5;
            const expiresAt = Date.now() + 100 * 60 * 60 * 1000; // Expires after 100 drops (assuming 1 drop per hour)
            db.data.users[userId].luckBoost = {
                multiplier: boost,
                expiresAt: expiresAt,
            };
            await db.write();
            return message.reply(`✅ Successfully purchased ${item}! ${description} Your new balance is ${db.data.users[userId].balance}₩.`);
        }
    },
};

function getRarity(user) { // Added user parameter
    const n = Math.random() * 100;
    let rarity;

     if (user?.luckBoost?.multiplier === 5) { // 5x boost: increased chances, no commons/uncommons
        if (n < 0.1) rarity = 'Secret';         //was 0.05
        else if (n < 0.8) rarity = 'Mythic';    //was 0.5
        else if (n < 4) rarity = 'Legendary';   //was 2.5
        else if (n < 15) rarity = 'Epic';      //was 10
        else if (n < 30) rarity = 'Rare';      //was 20
        else  rarity = 'Rare';                  // make sure it doesnt return undefined
    } else if (user?.luckBoost?.multiplier === 2) { // 2x boost: no commons
        if (n < 0.05) rarity = 'Secret';
        else if (n < 0.5) rarity = 'Mythic';
        else if (n < 2.5) rarity = 'Legendary';
        else if (n < 10) rarity = 'Epic';
        else if (n < 20) rarity = 'Rare';
        else  rarity = 'Uncommon';
    }
     else {
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
