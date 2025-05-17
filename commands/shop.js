const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'shop',
    description: 'View items for sale in the shop.',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Card Shop')
            .setDescription('Purchase items to enhance your card collection!')
            .setColor(0x00AE86) // You can choose a color
            .addFields(
                {
                    name: 'Card Pack',
                    value: 'Instantly refills your drop timer.  Use `!buy cardpack` to purchase.',
                    inline: true
                },
                {
                    name: 'Price',
                    value: '5000₩',
                    inline: true
                },
                {
                    name: '2x Luck Boost',
                    value: 'Increases your luck by 2x for your next 100 card drops. Use `!buy 2xboost` to purchase.',
                    inline: true
                },
                {
                    name: 'Price',
                    value: '10000₩',
                    inline: true
                },
                {
                    name: '5x Luck Boost',
                    value: 'Increases your luck by 5x for your next 100 card drops! Use `!buy 5xboost` to purchase.',
                    inline: true
                },
                {
                    name: 'Price',
                    value: '25000₩',
                    inline: true
                },
            )

        return message.channel.send({ embeds: [embed] });
    },
};
