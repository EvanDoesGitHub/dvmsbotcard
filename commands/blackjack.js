const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Play a game of Blackjack (limit 1000)',
  async execute(message, args, { db }) {
    const userId = message.author.id;
    const channelId = message.channel.id;

    // 1. Get or create user data.
    await db.read();
    if (!db.data.users[userId]) {
      db.data.users[userId] = { balance: 0 };
    }
    let balance = db.data.users[userId].balance;

    // 2. Validate the bet
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      return message.reply('Please provide a valid bet greater than zero.');
    }
    if (bet > balance) {
      return message.reply(`You don't have enough coins. Your balance is ${balance}₩.`);
    }
    if (bet > 1000) {
        return message.reply(`The maximum bet for Blackjack is 1000₩.`);
    }

    // 3. Initialize game state
    const deck = createDeck();
    const playerHand = [drawCard(deck), drawCard(deck)];
    const dealerHand = [drawCard(deck), drawCard(deck)];
    let playerTotal = getHandValue(playerHand);
    let dealerTotal = getHandValue(dealerHand);
    let gameOver = false;
    let gameState = {
        deck,
        playerHand,
        dealerHand,
        playerTotal,
        dealerTotal,
        gameOver,
        bet
    };

    // 4. Send initial game message
    let embed = buildEmbed(gameState, userId, false);
    const gameMessage = await message.reply({ embeds: [embed] });

    // 5. Add reactions for player actions
    await gameMessage.react('🇭'); // Hit
    await gameMessage.react('🇸'); // Stand
    await gameMessage.react('🇩'); // Double Down - Removed split
    // await gameMessage.react(' split'); // Split - Removed split

    // 6. Create reaction collector
    const collector = gameMessage.createReactionCollector({
        filter: (reaction, user) =>
            ['🇭', '🇸', '🇩'].includes(reaction.emoji.name) && user.id === userId, //Removed split
        max: 1,
        time: 60000, // 60 seconds
    });

    // 7. Handle player actions
    collector.on('collect', async (reaction) => {
        if (gameOver) return; // Prevent actions after game over

        // Remove the user's reaction
        await reaction.users.remove(userId);

        if (reaction.emoji.name === '🇭') { // Hit
            gameState.playerHand.push(drawCard(gameState.deck));
            gameState.playerTotal = getHandValue(gameState.playerHand);
            if (gameState.playerTotal >= 21) {
                gameState.gameOver = true;
                determineWinner(gameState);
            }
            await gameMessage.edit({ embeds: [buildEmbed(gameState, userId, false)] });
        }

        if (reaction.emoji.name === '🇸') { // Stand
            gameState.gameOver = true;
            determineWinner(gameState);
            await gameMessage.edit({ embeds: [buildEmbed(gameState, userId, true)] });

        }

        if (reaction.emoji.name === '🇩') { // Double Down
            if (gameState.playerHand.length !== 2) {
                return message.reply("You can only double down on your first move!");
            }
            if (balance < bet * 2) {
                 return message.reply("You don't have enough money to double down!");
            }
            gameState.bet *= 2;
            gameState.playerHand.push(drawCard(gameState.deck));
            gameState.playerTotal = getHandValue(gameState.playerHand);
            gameState.gameOver = true;
            determineWinner(gameState);
            await gameMessage.edit({ embeds: [buildEmbed(gameState, userId, true)] });
        }



        if (gameState.gameOver) {
            // Update the database with the result
            db.data.users[userId].balance += gameState.result;
            await db.write();
            collector.stop();
        }
    });

    collector.on('end', collected => {
      if (!collected.size && !gameState.gameOver) {
        message.reply('You ran out of time!');
        gameState.gameOver = true;
        determineWinner(gameState);
         db.data.users[userId].balance += gameState.result;
         db.write();
        gameMessage.edit({embeds: [buildEmbed(gameState, userId, true)]});
      }
    });
  },
};

// Helper Functions
/**
 * Creates a standard 52-card deck.
 * @returns {Array} An array representing the deck of cards.
 */
function createDeck() {
    const suits = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    // Shuffle the deck using the Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

/**
 * Draws a card from the deck.
 * @param {Array} deck The deck of cards.
 * @returns {Object} The card drawn from the deck.
 */
function drawCard(deck) {
    if (deck.length === 0) {
        // Handle empty deck scenario (e.g., reshuffle or throw error)
        return null; // Or throw an error: throw new Error("Deck is empty");
    }
    return deck.pop();
}

/**
 * Calculates the value of a hand of cards.
 * @param {Array} hand An array of cards in the hand.
 * @returns {number} The total value of the hand.
 */
function getHandValue(hand) {
    let total = 0;
    let hasAce = false;

    for (const card of hand) {
        if (!card) continue; // Add this line to handle null cards
        let cardValue = parseInt(card.value);
        if (card.value === 'J' || card.value === 'Q' || card.value === 'K') {
            cardValue = 10;
        } else if (card.value === 'A') {
            hasAce = true;
            cardValue = 11;
        }
        total += cardValue;
    }

    if (hasAce && total > 21) {
        total -= 10; // Convert Ace from 11 to 1
    }

    return total;
}

/**
 * Determines the winner of the Blackjack game.
 * @param {object} gameState
 * @returns {string} The result of the game.
 */
function determineWinner(gameState) {
    const playerTotal = gameState.playerTotal;
    const dealerTotal = gameState.dealerTotal;
    const bet = gameState.bet;

    while (gameState.dealerTotal < 17) {
        gameState.dealerHand.push(drawCard(gameState.deck));
        gameState.dealerTotal = getHandValue(gameState.dealerHand);
    }

    if (playerTotal > 21) {
        gameState.result = -bet; // Player busts, loses bet
        return "Dealer wins! (Player Bust)";
    } else if (dealerTotal > 21) {
        gameState.result = bet; // Dealer busts, player wins bet
        return "Player wins! (Dealer Bust)";
    } else if (playerTotal === dealerTotal) {
        gameState.result = 0; // Tie, no change in balance
        return "Tie!";
    } else if (playerTotal > dealerTotal) {
        gameState.result = bet; // Player wins
        return "Player wins!";
    } else {
        gameState.result = -bet; // Dealer wins
        return "Dealer wins!";
    }
}

/**
 * Builds an embed message to display the current game state.
 * @param {object} gameState The current state of the game.
 * @param {string} userId The ID of the player.
 * @param {boolean} showDealerHand Flag to show the dealer's full hand.
 * @returns {EmbedBuilder} The embed message.
 */
function buildEmbed(gameState, userId, showDealerHand) {
    const playerHand = gameState.playerHand;
    const dealerHand = gameState.dealerHand;
    const playerTotal = gameState.playerTotal;
    const dealerTotal = gameState.dealerTotal;
    const bet = gameState.bet;

    let playerHandString = playerHand.map(card => `${card.value}${card.suit}`).join(' ');
    let dealerHandString = showDealerHand
        ? dealerHand.map(card => `${card.value}${card.suit}`).join(' ')
        : `${dealerHand[0].value}${dealerHand[0].suit} X`; // Hide first card

    let title = 'Blackjack Game';
    let description = `Player: <@${userId}>\nBet: ${bet}₩\n\n`;

    description += `Player Hand: ${playerHandString} (${playerTotal})\n`;
    description += `Dealer Hand: ${dealerHandString} ${showDealerHand ? `(${dealerTotal})` : ''}\n\n`;

    if (gameState.gameOver) {
        description += `**${determineWinner(gameState)}**\n`;
        description += `Player Balance: ${gameState.result >= 0 ? '+' : ''}${gameState.result}₩\n`;
    } else {
        description += 'Hit (🇭), Stand (🇸), Double Down (🇩)'; //, Split ( ).
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description);

    return embed;
}
