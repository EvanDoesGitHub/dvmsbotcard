const { EmbedBuilder } = require('discord.js');

const SECTIONS = [
    {
        emoji: '1️⃣',
        title: '📦 Collection & Inventory',
        commands: [
            { cmd: '`!drop`',       desc: 'Trigger a random card drop' },
            { cmd: '`!inventory`',  desc: 'Show your cards, grouped by ID/shine/condition' },
            { cmd: '`!mygroups`',     desc: 'List your distinct group IDs (for offer/sell)' },
            { cmd: '`!view <groupId>`', desc: 'View details of one card type you own' },
            { cmd: '`!index`',        desc: 'See your progress & shiny counts by rarity' },
            { cmd: '`!leaderboard`',  desc: 'Top collectors by inventory worth' },
        ]
    },
    {
        emoji: '2️⃣',
        title: '🤝 Trading',
        commands: [
            { cmd: '`!trade @user`',         desc: 'Invite someone to a card trade' },
            { cmd: '`!offer <groupId> <qty>`', desc: 'Offer specific cards into a trade' },
            { cmd: '`!remove <groupId> <qty>`',desc: 'Remove offered cards before confirm' },
            { cmd: '`!confirm`',          desc: 'Lock in your side of the trade' },
            { cmd: '`!endtrade`',         desc: 'Cancel your active trade immediately' }
        ]
    },
    {
        emoji: '3️⃣',
        title: '💸 Money',
        commands: [
            { cmd: '`!balance`',          desc: 'Show your current ₩ balance' },
            { cmd: '`!give <user> <amount>`',   desc: 'Give money to another user' },
            { cmd: '`!buy <item>`',         desc: 'Buy items from the shop' },
            { cmd: '`!shop`',            desc: 'Show the items available in the shop' },
            { cmd: '`!coinflip <amount>`', desc: 'Flip a coin and gamble' },
            { cmd: '`!sell <groupId> <qty|all>`', desc: 'Sell cards for ₩ into your wallet' },
            { cmd: '`!daily`', desc: 'Collect daily coins — rewards grow with streaks' },
            { cmd: '`!cooldown`', desc: 'Check cooldowns for !daily and !drop' },
            { cmd: '`!boost`', desc: 'Check your active boost and how long it lasts.' },
        ]
    },
    {
        emoji: '4️⃣',
        title: '🛠️ Admin & Misc',
        commands: [
            { cmd: '`!restart`',          desc: '🔄 Owner-only: restart the bot process' },
            { cmd: '`!help`',             desc: '📖 Show this help menu' },
            { cmd: '`!profile [@user]`',      desc: 'View your profile' },
        ]
    }
];

module.exports = {
    name: 'help',
    description: 'Show an interactive help menu',
    async execute(message) {
        let page = 0;
        const embed = new EmbedBuilder()
            .setTitle(SECTIONS[page].title)
            .setColor(0x00AE86)
            .setDescription(
                SECTIONS[page].commands
                    .map(c => `${c.cmd}\n ${c.desc}`)
                    .join('\n\n')
            )
            .setFooter({ text: `Page ${page + 1}/${SECTIONS.length}` });

        const helpMsg = await message.reply({ embeds: [embed] });

        for (const section of SECTIONS) {
            await helpMsg.react(section.emoji);
        }

        const filter = (reaction, user) =>
            SECTIONS.some(s => s.emoji === reaction.emoji.name) &&
            user.id === message.author.id;

        const collector = helpMsg.createReactionCollector({
            filter,
            time: 120_000
        });

        collector.on('collect', (reaction, user) => {
            reaction.users.remove(user).catch(() => { });
            const idx = SECTIONS.findIndex(s => s.emoji === reaction.emoji.name);
            if (idx === -1) return;
            page = idx;

            const sec = SECTIONS[page];
            const newEmbed = EmbedBuilder.from(embed)
                .setTitle(sec.title)
                .setDescription(
                    sec.commands.map(c => `${c.cmd}\n ${c.desc}`).join('\n\n')
                )
                .setFooter({ text: `Page ${page + 1}/${SECTIONS.length}` });

            helpMsg.edit({ embeds: [newEmbed] });
        });

        collector.on('end', () => {
            helpMsg.reactions.removeAll().catch(() => { });
        });
    }
};
