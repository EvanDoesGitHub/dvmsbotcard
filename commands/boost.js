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


            // Calculate drops remaining.  The !buy command sets the boost to expire after 100 drops.
            let dropsRemaining =  user.luckBoost.dropsRemaining;

            const embed = new EmbedBuilder()
                .setTitle('Active Boost')
                .setDescription(`You have an active **${user.luckBoost.multiplier}x** boost.`)
                .addFields(
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
