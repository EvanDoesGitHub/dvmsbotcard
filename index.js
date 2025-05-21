const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const path = require('path');
const { sweepExpiredAuctions } = require('./utils/auctionUtils');
require('dotenv').config();

const cards = JSON.parse(fs.readFileSync('./cards.json'));

// Function to initialize the database using dynamic import
async function initializeDatabase() {
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');

    const adapter = new JSONFile('/mnt/data/db.json');
    // CORRECTED: Removed 'drops: {}' from defaultData.
    // User-specific 'drops' will be initialized within the user object by commands.
    const defaultData = { users: {}, auctions: [] };
    const db = new Low(adapter, defaultData);
    
    await db.read();
    
    // Ensure db.data is initialized with the correct structure if the file was empty
    db.data = db.data || { users: {}, auctions: [] };
    
    await db.write(); // Write the default structure if the file was just created
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
    client.db = db; // Store the db in the client object

    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        client.commands.set(cmd.name, cmd);
    }

    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
        // Start auction sweeper every 60 seconds
        setInterval(() => sweepExpiredAuctions(client, client.db), 60_000);
    });

    client.on('messageCreate', async message => {
        if (!message.content.startsWith('!') || message.author.bot) return;
        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);

        if (!command) return;

        try {
            // Import nanoid dynamically where needed if not globally available
            const { nanoid } = await import('nanoid');
            await command.execute(message, args, { cards, db: client.db, EmbedBuilder, nanoid });
        } catch (err) {
            console.error(err);
            message.reply('There was an error executing that command.');
        }
    });

    client.login(process.env.DISCORD_TOKEN);
})();
