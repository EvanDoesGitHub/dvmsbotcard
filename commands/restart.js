module.exports = {
  name: 'restart',
  description: 'Restarts the bot (Admin only)',
  async execute(message) {
    // Check if the user is an admin (change the condition to your bot's admin role or user ID)
    const adminId = '722463127782031400';  // Replace with your Discord user ID
    if (message.author.id !== adminId) {
      return message.reply("You do not have permission to restart the bot.");
    }

    await message.reply('Restarting bot...').then(() => {
      // Use process.exit(1) to trigger a restart (works when running the bot through PM2, Docker, or similar setups)
      process.exit(1);
    });
  }
};
