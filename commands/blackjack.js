const { EmbedBuilder } = require('discord.js');

// Helper function to get card value
function getCardValue(card) {
    const rank = card.slice(0, -1); // Remove the suit
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11; // Start with Ace as 11, adjust later
    const value = parseInt(rank, 10);
    return isNaN(value) ? 0 : value; // Handle invalid card ranks
}

// Helper function to calculate hand value and adjust Aces
function getHandValue(hand) {
    let value = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let aceCount = hand.filter(card => card.slice(0, -1) === 'A').length;

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
}

// Helper function to get a random card with emojis
function getCard() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return `${rank}${suit}`;
}

// Function to format card display with emojis
function formatCardDisplay(hand) {
    return hand.map(card => {
        const suitEmoji = {
            '♠️': '♠️',
            '♥️': '♥️',
            '♦️': '♦️',
            '♣️': '♣️',
        }[card.slice(-1)];
        return `${card.slice(0, -1)}${suitEmoji}`;
    }).join(' ');
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
                    { name: 'Your Hand', value: formatCardDisplay(playerHand), inline: true },
                    { name: 'Dealer Hand', value: `${dealerHand[0]} ❓`, inline: true },
                    { name: 'Your Points', value: String(playerValue), inline: true },
                    { name: 'Dealer Points', value: '?', inline: true },
                )
                .setFooter({ text: 'Type `hit` or `stand`' })
                .setColor(0x00BFFF); // Blue color for initial game state

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
                        console.log(`Player Hand: ${formatCardDisplay(playerHand)}, Player Value: ${playerValue}`);
                        embed.setFields(
                            { name: 'Your Hand', value: formatCardDisplay(playerHand), inline: true },
                            { name: 'Dealer Hand', value: `${dealerHand[0]} ❓`, inline: true },
                            { name: 'Your Points', value: String(playerValue), inline: true },
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
                        console.log(`Dealer Hand: ${formatCardDisplay(dealerHand)}, Dealer Value: ${dealerValue}`);
                    }

                    console.log(`Final Player Value: ${playerValue}, Final Dealer Value: ${dealerValue}`);
                    let resultText = '';
                    let resultColor = 0;

                    if (playerValue > 21) {
                        resultText = `You Busted! Dealer wins. You lose ${bet}₩.`;
                        resultColor = 0xFF0000; // Red
                        user.balance -= bet;
                    } else if (dealerValue > 21 || playerValue > dealerValue) {
                        resultText = `You Win! You win ${bet}₩!`;
                        resultColor = 0x00FF00; // Green
                        user.balance += bet;
                    } else if (playerValue === dealerValue) {
                        resultText = 'Tie Game! You get your bet back.';
                        resultColor = 0xFFFF00; // Yellow
                    } else {
                        resultText = `Dealer Wins! You lose ${bet}₩.`;
                        resultColor = 0xFF0000; // Red
                        user.balance -= bet;
                    }
                    // Ensure balance doesn't go below 0
                    user.balance = Math.max(0, user.balance);
                    await db.write();
                    resultEmbed = new EmbedBuilder()
                        .setTitle(resultText.split('!')[0] + '!') // Use only the first part before "!"
                        .setDescription(resultText.substring(resultText.indexOf(' ') + 1))
                        .setColor(resultColor)
                        .addFields(
                            { name: 'Your Hand', value: formatCardDisplay(playerHand), inline: true },
                            { name: 'Dealer Hand', value: formatCardDisplay(dealerHand), inline: true }, // Use formatCardDisplay here
                            { name: 'Your Points', value: String(playerValue), inline: true },
                            { name: 'Dealer Points', value: String(dealerValue), inline: true },
                        );
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
