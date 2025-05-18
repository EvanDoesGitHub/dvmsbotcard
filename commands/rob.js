const { SlashCommandBuilder } = require('discord.js');
const { writeFileSync } = require('fs'); // Use writeFileSync for simplicity

const ROB_CHANCE = 0.3; // 30% chance of getting caught
const ROB_MULTIPLIER = 0.1; // Steal 10% of the target's balance
const FINE_MULTIPLIER = 1.2; // Pay 20% more than you tried to steal

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to steal money from another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to rob.')
                .setRequired(true)),
    async execute(interaction, { db }) { // Destructure db from the client object
        const robberId = interaction.user.id;
        const targetId = interaction.options.getUser('target').id;

        if (robberId === targetId) {
            return interaction.reply("You can't rob yourself!");
        }

        await db.read(); // Ensure the database is read

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
            return interaction.reply("That user has no money to steal!");
        }

        const stolenAmount = Math.floor(targetBalance * ROB_MULTIPLIER);
        const fineAmount = Math.floor(stolenAmount * FINE_MULTIPLIER);

        if (Math.random() < ROB_CHANCE) { // Robber gets caught
            db.data.users[robberId].balance -= fineAmount;
            db.data.users[targetId].balance += fineAmount;
            await db.write(); // Use await here

            if (robberBalance < fineAmount) {
                return interaction.reply(`You were caught and fined ${fineAmount}₩! You're now in debt.`);
            } else {
                return interaction.reply(`You were caught and fined ${fineAmount}₩!`);
            }
        } else { // Robber succeeds
            db.data.users[robberId].balance += stolenAmount;
            db.data.users[targetId].balance -= stolenAmount;
            await db.write(); // and here
            return interaction.reply(`You stole ${stolenAmount}₩ from <@${targetId}>!`);
        }
    },
};
