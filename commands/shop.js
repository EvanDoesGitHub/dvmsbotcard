const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'shop',
    description: 'View items for sale in the shop.',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Card Shop')
            .setDescription('Purchase items to enhance your card collection!')
            .setColor(0x00AE86)
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
                },
                {
                    name: 'Balance Lock',
                    value: 'Prevents you from being robbed for the next hour.\nUse `!buy balancelock` to purchase.',
                    inline: false,
                },
                {
                    name: 'Price',
                    value: '1000₩',
                    inline: true,
                },
                {
                    name: 'Card Protector',
                    value: 'Permanently protects one of your cards from being damaged.\nUse `!buy cardprotector <card_id>` to purchase.',
                    inline: false,
                },
                {
                  name: 'Price',
                  value: '1000₩',
                  inline: true
                }
            )
            .setThumbnail('https://cdn.discordapp.com/emojis/your_shop_emoji_id.png?size=80');

        return message.channel.send({ embeds: [embed] });
    },
};
