const { EmbedBuilder } = require('discord.js');

// Helper function to get card value
function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card)) return 10;
    if (card === 'A') return 11; // Start with Ace as 11, adjust later
    return parseInt(card, 10);
}

// Helper function to calculate hand value and adjust Aces
function getHandValue(hand) {
    let value = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let aceCount = hand.filter(card => card === 'A').length;

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
}

// Helper function to get a random card
function getCard() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return `${rank}${suit}`;
}

module.exports = {
    name: 'blackjack',
    description: 'Play a game of Blackjack.  Limit is 1000₩.',
    async execute(message, args, { db }) {
        try {
            await db.read();
            const userId = message.author.id;
            const user = db.data.users[userId] || { balance: 0 };
            let balance = user.balance;

            if (!args.length) {
                return message.reply('Please specify a bet amount.');
            }

            const bet = parseInt(args[0], 10);

            if (isNaN(bet) || bet <= 0) {
                return message.reply('Please enter a valid bet amount (greater than 0).');
            }

            if (bet > balance) {
                return message.reply(`You don't have enough money. Your balance is ${balance}₩.`);
            }

            if (bet > 1000) {
                return message.reply('The maximum bet for Blackjack is 1000₩.');
            }

            let playerHand = [getCard(), getCard()];
            let dealerHand = [getCard(), getCard()];
            let playerValue = getHandValue(playerHand);
            let dealerValue = getHandValue(dealerHand);
            let gameOver = false;
            let resultEmbed = null; // Declare here

            const embed = new EmbedBuilder()
                .setTitle('Blackjack Game')
                .setDescription(`Bet: ${bet}₩`)
                .addFields(
                    { name: 'Your Hand', value: playerHand.join(' '), inline: true },
                    { name: 'Dealer Hand', value: `${dealerHand[0]} ?`, inline: true },
                    { name: 'Your Points', value: playerValue, inline: true },
                    { name: 'Dealer Points', value: '?', inline: true },
                )
                .setFooter({ text: 'Type `hit` or `stand`' });

            const gameMessage = await message.reply({ embeds: [embed] });

            const filter = m => m.author.id === userId && ['hit', 'stand'].includes(m.content.toLowerCase());
            const collector = message.channel.createMessageCollector({ filter, time: 120000 });

            collector.on('collect', async m => {
                try {
                    const input = m.content.toLowerCase();

                    if (gameOver) return; // Prevent actions after game over

                    if (input === 'hit') {
                        playerHand.push(getCard());
                        playerValue = getHandValue(playerHand);
                        embed.setFields(
                            { name: 'Your Hand', value: playerHand.join(' '), inline: true },
                            { name: 'Dealer Hand', value: `${dealerHand[0]} ?`, inline: true },
                            { name: 'Your Points', value: playerValue, inline: true },
                            { name: 'Dealer Points', value: '?', inline: true },
                        );
                        gameMessage.edit({ embeds: [embed] });

                        if (playerValue >= 21) {
                            gameOver = true;
                            collector.stop();
                        }
                    } else if (input === 'stand') {
                        gameOver = true;
                        collector.stop();
                    }
                    m.delete();
                } catch (error) {
                    console.error('Error in collector.on(collect):', error);
                }
            });

            collector.on('end', async () => {
                try {
                    if (!gameOver) {
                        message.reply('Game ended due to inactivity.');
                        return;
                    }
                    while (dealerValue < 17) {
                        dealerHand.push(getCard());
                        dealerValue = getHandValue(dealerHand);
                    }
                    embed.setFields(
                        { name: 'Your Hand', value: playerHand.join(' '), inline: true },
                        { name: 'Dealer Hand', value: dealerHand.join(' '), inline: true },
                        { name: 'Your Points', value: playerValue, inline: true },
                        { name: 'Dealer Points', value: dealerValue, inline: true },
                    );
                    if (playerValue > 21) {
                        resultEmbed = new EmbedBuilder()
                            .setTitle('You Busted!')
                            .setDescription(`Dealer wins. You lose ${bet}₩.`)
                            .setColor(0xFF0000); // Red
                        user.balance -= bet;
                    } else if (dealerValue > 21 || playerValue > dealerValue) {
                        resultEmbed = new EmbedBuilder()
                            .setTitle('You Win!')
                            .setDescription(`You win ${bet}₩!`)
                            .setColor(0x00FF00); // Green
                        user.balance += bet;
                    } else if (playerValue === dealerValue) {
                        resultEmbed = new EmbedBuilder()
                            .setTitle('Tie Game')
                            .setDescription('You get your bet back.')
                            .setColor(0xFFFF00); // Yellow
                    } else {
                        resultEmbed = new EmbedBuilder()
                            .setTitle('Dealer Wins!')
                            .setDescription(`You lose ${bet}₩.`)
                            .setColor(0xFF0000); // Red
                        user.balance -= bet;
                    }
                    await db.write();
                    gameMessage.edit({ embeds: [embed, resultEmbed] });
                } catch (error) {
                    console.error('Error in collector.on(end):', error);
                }
            });
        } catch (error) {
            console.error('Error in blackjack command:', error);
            message.reply('An error occurred while playing Blackjack. Please try again.');
        }
    },
};
