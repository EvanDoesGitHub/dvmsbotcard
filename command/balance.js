module.exports = {
  name: 'balance',
  description: 'Check your coin balance.',
  async execute(message, args, { db }) {
    const userId = message.author.id;

    // Make sure the user exists in the DB
    db.data.users[userId] ||= { inventory: [], balance: 0 };

    const balance = db.data.users[userId].balance;

    await db.write();

    message.reply(`💰 Your current balance is **${balance}₩**.`);
  }
};
