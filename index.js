const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const path = require('path');
//const { nanoid } = require('nanoid'); // REMOVE THIS LINE
const { sweepExpiredAuctions } = require('./utils/auctionUtils');
require('dotenv').config();

const cards = JSON.parse(fs.readFileSync('./cards.json'));

// Function to initialize the database using dynamic import
async function initializeDatabase() {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node'); // Import JSONFile from lowdb/node

  // CHANGE IS HERE:  Use /mnt/data/db.json
  const adapter = new JSONFile('/mnt/data/db.json');
  const defaultData = { users: {}, drops: {}, auctions: [] };
  const db = new Low(adapter, defaultData);
  await db.read();
  await db.write();
  return db;
}

(async () => {
  // Initialize the database
  const db = await initializeDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
  });

  client.commands = new Collection();

  // Load commands
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const cmd = require(`./commands/${file}`);
    client.commands.set(cmd.name, cmd);
  }

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Start auction sweeper every 60 seconds
    setInterval(() => sweepExpiredAuctions(client, db), 60_000);
  });

  client.on('messageCreate', async message => {
    if (!message.content.startsWith('!') || message.author.bot) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (!client.commands.has(command)) return;
    try {
      const { nanoid } = await import('nanoid');
      await client.commands.get(command).execute(message, args, { cards, db, EmbedBuilder, nanoid });
    } catch (err) {
      console.error(err);
      message.reply('There was an error executing that command.');
    }
  });

  client.login(process.env.DISCORD_TOKEN);
})();
