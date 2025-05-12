const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const path = require('path');
const { nanoid } = require('nanoid');
const { sweepExpiredAuctions } = require('./utils/auctionUtils');
require('dotenv').config();

const cards = JSON.parse(fs.readFileSync('./cards.json'));

// Function to initialize the database using dynamic import
async function initializeDatabase() {
  const { Low, JSONFile } = await import('lowdb');
  const adapter = new JSONFile(path.join(__dirname, 'db.json'));
  const db = new Low(adapter, { users: {}, drops: {}, auctions: [] });
  await db.read();
  db.data ||= { users: {}, drops: {}, auctions: [] };
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
      await client.commands.get(command).execute(message, args, { cards, db, EmbedBuilder, nanoid });
    } catch (err) {
      console.error(err);
      message.reply('There was an error executing that command.');
    }
  });

  client.login(process.env.DISCORD_TOKEN);
})();
