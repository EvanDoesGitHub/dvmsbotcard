module.exports = {
    name: 'give',
    description: 'Give coins to another user: `!give @user <amount>` or `!give <amount> @user`',
    async execute(message, args, { db }) {
        const senderId = message.author.id;

        // Parse arguments to get recipient and amount.  Handles both orders.
        let recipientId;
        let amount;

        if (args.length !== 2) {
            return message.reply('Usage: `!give @user <amount>` or `!give <amount> @user`');
        }

        if (message.mentions.users.first()) {
            recipientId = message.mentions.users.first().id;
            const amountArg = args.find(arg => !/<@!?\d+>/.test(arg)); // Find non-mention
            amount = parseInt(amountArg, 10);
        } else {
             const amountArg = args.find(arg => !/<@!?\d+>/.test(arg)); // Find non-mention
             amount = parseInt(amountArg, 10);
            const userArg = args.find(arg => /<@!?\d+>/.test(arg));
            if(userArg){
                recipientId = userArg.replace(/<@!?(\d+)>/, '$1'); // Extract user ID from mention
            }
        }

        if (!recipientId || isNaN(amount) || amount <= 0) {
            return message.reply('Invalid arguments.  Use `!give @user <amount>` or `!give <amount> @user`, with a positive amount.');
        }

        if (recipientId === senderId) {
            return message.reply('You can\'t give coins to yourself.');
        }

        // Make sure both users exist in the database.
        db.data.users[senderId] ||= { inventory: [], balance: 0 };
        db.data.users[recipientId] ||= { inventory: [], balance: 0 };

        const senderBalance = db.data.users[senderId].balance;

        if (senderBalance < amount) {
            return message.reply(`You don't have enough coins. Your balance is ${senderBalance}₩.`);
        }

        // Perform the transfer.
        db.data.users[senderId].balance -= amount;
        db.data.users[recipientId].balance += amount;
        await db.write();

        message.reply(`✅ Transferred ${amount}₩ to <@${recipientId}>.  Your new balance is ${db.data.users[senderId].balance}₩.`);
    },
};
