const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'boost',
    description: 'Check your active boost and how long it lasts, or remove it.',
    async execute(message, args, { db }) {
        await db.read();
        const userId = message.author.id;
        const user = db.data.users[userId];
        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'remove') {
            if (!user || !user.luckBoost) {
                return message.reply('You do not have an active boost to remove.');
            }

            user.luckBoost = null; // Remove the boost
            await db.write();
            return message.reply('Your active boost has been removed.');
        } else { // Default to showing boost info
            if (!user || !user.luckBoost) {
                return message.reply('You do not have an active boost.');
            }

            const now = Date.now();
            const expiresAt = user.luckBoost.expiresAt;

            if (now >= expiresAt) {
                // Clear the expired boost
                user.luckBoost = null;
                await db.write();
                return message.reply('Your boost has expired.');
            }

            const remaining = expiresAt - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            // Calculate drops remaining.  The !buy command sets the boost to expire after 100 drops.
            let dropsRemaining = Math.ceil(remaining / (60 * 60 * 1000)); // Assuming 1 drop per hour, convert ms to hours

            // added this check
            if(user.luckBoost.dropsRemaining !== undefined){
                dropsRemaining = user.luckBoost.dropsRemaining;
            }


            const embed = new EmbedBuilder()
                .setTitle('Active Boost')
                .setDescription(`You have an active **${user.luckBoost.multiplier}x** boost.`)
                .addFields(
                    { name: 'Expires In', value: `${hours}h ${minutes}m ${seconds}s` },
                    { name: 'Drops Remaining', value: `${dropsRemaining}` }
                )
                .setColor(0xF1C40F); // Gold color
            
            // Save dropsRemaining to the database
            user.luckBoost.dropsRemaining = dropsRemaining;
            await db.write();

            return message.channel.send({ embeds: [embed] });
        }
    },
};
