module.exports = {
    name: 'coinflip',
    description: 'Flip a coin and gamble your coins (max 1000): `!coinflip <amount>`',
    async execute(message, args, { db }) {
        const userId = message.author.id;
        const amount = parseInt(args[0], 10);

        if (isNaN(amount) || amount <= 0 || amount > 1000) {
            return message.reply('Invalid amount.  Please specify a positive number up to 1000.');
        }

        // Make sure the user exists in the DB
        db.data.users[userId] ||= { inventory: [], balance: 0 };
        const balance = db.data.users[userId].balance;

        if (amount > balance) {
            return message.reply(`You don't have enough coins. Your balance is ${balance}₩.`);
        }

        // Simulate coin flip (0 = heads, 1 = tails)
        const flip = Math.floor(Math.random() * 2);
        const result = flip === 0 ? 'Heads' : 'Tails';

        // 5-second delay using a Promise
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (flip === 0) {
            // User wins: double their money
            db.data.users[userId].balance += amount;
            await db.write();
            message.reply(`🎉 It's ${result}! You win ${amount}₩ and now have ${db.data.users[userId].balance}₩.`);
        } else {
            // User loses: lose the money
            db.data.users[userId].balance -= amount;
            await db.write();
            message.reply(`😢 It's ${result}! You lose ${amount}₩ and now have ${db.data.users[userId].balance}₩.`);
        }
    },
};
