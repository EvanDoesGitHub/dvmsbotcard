const ROB_CHANCE = 0.3; // 30% chance of getting caught
const ROB_MULTIPLIER = 0.1; // Steal 10% of the target's balance
const FINE_MULTIPLIER = 1.2; // Pay 20% more than you tried to steal
const COOLDOWN_TIME = 600000; // 10 minutes in milliseconds

module.exports = {
    name: 'rob',
    description: 'Attempt to steal money from another user.',
    async execute(message, args, { db }) {
        const robberId = message.author.id;
        const targetId = message.mentions.users.first()?.id;

        if (!targetId) {
            return message.reply("Please mention the user you want to rob.");
        }

        if (robberId === targetId) {
            return message.reply("You can't rob yourself!");
        }

        await db.read();

        // Initialize user data if they don't exist
        if (!db.data.users[robberId]) {
            db.data.users[robberId] = { balance: 0, cooldown: 0 };
        }
        if (!db.data.users[targetId]) {
            db.data.users[targetId] = { balance: 0, cooldown: 0 };
        }

        const robber = db.data.users[robberId];
        const target = db.data.users[targetId];

        const now = Date.now();

        if (robber.cooldown > now) {
            const timeLeft = (robber.cooldown - now) / 1000;
            return message.reply(`You can rob again in ${timeLeft.toFixed(0)} seconds.`);
        }

        if (target.cooldown > now) {
            const timeLeft = (target.cooldown - now) / 1000;
            return message.reply(`That user cannot be robbed for another ${timeLeft.toFixed(0)} seconds.`);
        }

        let robberBalance = robber.balance;
        let targetBalance = target.balance;

        if (targetBalance === 0) {
            return message.reply("That user has no money to steal!");
        }

        const stolenAmount = Math.floor(targetBalance * ROB_MULTIPLIER);
        const fineAmount = Math.floor(stolenAmount * FINE_MULTIPLIER);

        if (Math.random() < ROB_CHANCE) { // Robber gets caught
            robber.balance -= fineAmount;
            target.balance += fineAmount;
            robber.cooldown = now + COOLDOWN_TIME;
            await db.write();

            if (robberBalance < fineAmount) {
                return message.reply(`You were caught and fined ${fineAmount}₩! You're now in debt.`);
            } else {
                return message.reply(`You were caught and fined ${fineAmount}₩!`);
            }
        } else { // Robber succeeds
            robber.balance += stolenAmount;
            target.balance -= stolenAmount;
            robber.cooldown = now + COOLDOWN_TIME;
            target.cooldown = now + COOLDOWN_TIME;
            await db.write();
            return message.reply(`You stole ${stolenAmount}₩ from <@${targetId}>!`);
        }
    },
};
