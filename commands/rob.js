const ROB_CHANCE = 0.3; // 30% chance of getting caught
const ROB_MULTIPLIER = 0.1; // Steal 10% of the target's balance
const FINE_MULTIPLIER = 1.2; // Pay 20% more than you tried to steal

module.exports = {
    name: 'rob', // Changed to name for message command
    description: 'Attempt to steal money from another user.',
    async execute(message, args, { db }) { // Removed interaction, added message
        const robberId = message.author.id;
        const targetId = message.mentions.users.first()?.id; // Get ID from mention

        if (!targetId) {
            return message.reply("Please mention the user you want to rob.");
        }

        if (robberId === targetId) {
            return message.reply("You can't rob yourself!");
        }

        await db.read();

        // Initialize user balances if they don't exist
        if (!db.data.users[robberId]) {
            db.data.users[robberId] = { balance: 0 };
        }
        if (!db.data.users[targetId]) {
            db.data.users[targetId] = { balance: 0 };
        }

        let robberBalance = db.data.users[robberId].balance;
        let targetBalance = db.data.users[targetId].balance;

        if (targetBalance === 0) {
            return message.reply("That user has no money to steal!");
        }

        const stolenAmount = Math.floor(targetBalance * ROB_MULTIPLIER);
        const fineAmount = Math.floor(stolenAmount * FINE_MULTIPLIER);

        if (Math.random() < ROB_CHANCE) { // Robber gets caught
            db.data.users[robberId].balance -= fineAmount;
            db.data.users[targetId].balance += fineAmount;
            await db.write();

            if (robberBalance < fineAmount) {
                return message.reply(`You were caught and fined ${fineAmount}₩! You're now in debt.`);
            } else {
                return message.reply(`You were caught and fined ${fineAmount}₩!`);
            }
        } else { // Robber succeeds
            db.data.users[robberId].balance += stolenAmount;
            db.data.users[targetId].balance -= stolenAmount;
            await db.write();
            return message.reply(`You stole ${stolenAmount}₩ from <@${targetId}>!`);
        }
    },
};
