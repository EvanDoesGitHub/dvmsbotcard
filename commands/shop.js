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
                    value: 'Instantly refills your drop timer.\nUse `!buy cardpack` to purchase.',
                    inline: false,
                },
                {
                    name: 'Price',
                    value: '5000₩',
                    inline: true,
                },
                {
                    name: '2x Luck Boost',
                    value: 'Increases your luck by 2x for your next 100 card drops.\nUse `!buy 2xboost` to purchase.',
                    inline: false,
                },
                {
                    name: 'Price',
                    value: '10000₩',
                    inline: true,
                },
                {
                    name: '5x Luck Boost',
                    value: 'Increases your luck by 5x for your next 100 card drops!\nUse `!buy 5xboost` to purchase.',
                    inline: false,
                },
                {
                    name: 'Price',
                    value: '25000₩',
                    inline: true,
                }
            )
            .setThumbnail('https://cdn.discordapp.com/emojis/your_shop_emoji_id.png?size=80'); // Replace with an actual emoji

        return message.channel.send({ embeds: [embed] });
    },
};
