// scripts/fixUserData.js
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

// Path to your db.json
const file = path.join(__dirname, '../db.json');
const adapter = new JSONFile(file);

// ✅ Provide defaultData directly to the Low constructor
const defaultData = { users: {}, trades: {}, activeTrades: {}, drops: {} };
const db = new Low(adapter, defaultData);

(async () => {
  await db.read();

  const users = db.data.users;

  if (!users || Object.keys(users).length === 0) {
    console.log('⚠️ No users found in db.json.');
    return;
  }

  for (const [userId, user] of Object.entries(users)) {
    user.inventory ||= [];
    user.collected ||= [];

    const ownedCardIds = new Set(user.inventory.map(c => c.id));
    for (const id of ownedCardIds) {
      if (!user.collected.includes(id)) {
        user.collected.push(id);
      }
    }

    console.log(`✅ Updated user ${userId}: collected ${user.collected.length} cards.`);
  }

  await db.write();
  console.log('✅ All user data updated and saved.');
})();
