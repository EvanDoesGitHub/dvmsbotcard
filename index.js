const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const path = require('path');
//const { nanoid } = require('nanoid');
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
    client.db = db; // Store the db in the client object

    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        client.commands.set(cmd.name, cmd); // Use cmd.name
    }

    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
        // Start auction sweeper every 60 seconds
        setInterval(() => sweepExpiredAuctions(client, client.db), 60_000); // Pass client.db
    });

    client.on('messageCreate', async message => { // messageCreate event
        if (!message.content.startsWith('!') || message.author.bot) return;
        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase(); // Get command name
        const command = client.commands.get(commandName);

        if (!command) return;

        try {
            const { nanoid } = await import('nanoid');
            await command.execute(message, args, { cards, db: client.db, EmbedBuilder, nanoid }); // Pass message and args
        } catch (err) {
            console.error(err);
            message.reply('There was an error executing that command.'); // Use message.reply
        }
    });

    client.login(process.env.DISCORD_TOKEN);
})();
