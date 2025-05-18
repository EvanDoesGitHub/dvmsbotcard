module.exports = {
  name: 'balance',
  description: 'Check your coin balance.',
  async execute(message, args, { db }) {
    const userId = message.author.id;

    await db.read(); // Ensure the latest data is read

    // Make sure the user exists in the DB
    if (!db.data.users[userId]) {
      db.data.users[userId] = { inventory: [], balance: 0, balanceLockExpiry: null }; // Initialize with balanceLockExpiry
    }

    const user = db.data.users[userId];
    const balance = user.balance;
    const now = Date.now();
    const isBalanceLocked = user.balanceLockExpiry && user.balanceLockExpiry > now;

    await db.write();

    let replyText = `💰 Your current balance is **${balance}₩**.`;
    if (isBalanceLocked) {
      const timeLeft = (user.balanceLockExpiry - now) / 1000;
      replyText += ` 🔒 Your balance is currently locked for ${timeLeft.toFixed(0)} seconds.`;
    }

    message.reply(replyText);
  }
};
