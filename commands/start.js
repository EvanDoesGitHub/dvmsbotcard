const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'start',
  description: 'Initializes your profile in the database.',
  async execute(message, args, { db }) {
    try {
      await db.read();

      const userId = message.author.id;

      // Check if the user already exists
      if (db.data.users[userId]) {
        return message.reply('You already have a profile!');
      }

      // Initialize the user's data based on the provided structure.  Important to match the structure you provided.
      db.data.users[userId] = {
        inventory: [],
        lastDrops: [],
        cooldownEnd: 0,
        collected: [],  // Added collected array
        balance: 0,
        lastGroupId: null, // added null
        lastDaily: 0,     //  added 0
        dailyStreak: 0,    // added 0
      };

      try {
        await db.write();
        message.reply('Your profile has been created!');
      } catch (error) {
        console.error('Error writing to database:', error);
        message.reply('Failed to create your profile. Please try again.');
        return; // Important: Exit the command execution on error
      }
    } catch (error) {
      console.error('Error in !start command:', error);
      message.reply('An error occurred while processing the command.');
    }
  },
};
