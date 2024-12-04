// index.js
const {
  Client,
  GatewayIntentBits,
  Collection,
  ChannelType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const connectDB = require("./src/db");
const express = require("express");
const TuringTestManager = require("./src/game/TuringTestManager");
const SessionManager = require("./src/session");
const ollama = require("ollama");

// Initialize express app
const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Initialize Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

const chatBotClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const sessionManager = new SessionManager();
//const turingManager = new TuringTestManager(client);

// Initialize managers
client.sessionManager = sessionManager;
chatBotClient.sessionManager = sessionManager;
client.turingManager = new TuringTestManager(client);

// Set up commands collection
client.commands = new Collection();
const commandsPath = path.join(__dirname, "src/bot/commands");

// Load commands
console.log("Loading commands from:", commandsPath);
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    console.log(`Loading command: ${command.data.name}`);
    client.commands.set(command.data.name, command);
    console.log(
      ` ${command.data.name} :${client.commands.has(command.data.name)}`
    );
  } else {
    console.log(`[WARNING] Command at ${filePath} missing required properties`);
  }
}

// Discord event handlers
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log("Loaded commands:", Array.from(client.commands.keys()));

  // Initialize Turing Test channels
  const guild = client.guilds.cache.first(); // Or specify a specific guild
  if (guild) {
    await client.sessionManager.initializeChannels(guild);

    // Ensure results announcement channel exists
    let resultsChannel = guild.channels.cache.find(
      (ch) =>
        ch.name === "turing-test-results" &&
        ch.type === ChannelType.GuildAnnouncement
    );

    if (!resultsChannel) {
      const category = await client.sessionManager.getOrCreateCategory(guild);
      resultsChannel = await guild.channels.create({
        name: "turing-test-results",
        type: ChannelType.GuildAnnouncement,
        parent: category,
      });
    }
  }
  const botMember = guild.members.cache.get(client.user.id);

  if (botMember) {
    console.log("Bot Permissions:", botMember.permissions.toJSON());
    console.log("Permission Integer:", botMember.permissions.bitfield);
  }
});

// Command handling
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  console.log(`Received command: ${interaction.commandName}`);
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.log(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    // Pass the managers through the client
    await command.execute(interaction);
  } catch (error) {
    console.error("Error executing command:", error);
    const errorMessage =
      error.message || "There was an error while executing this command!";

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }
    } catch (followUpError) {
      console.error("Error sending error message:", followUpError);
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("judge_vote:")) {
      try {
        await interaction.client.turingManager.handleJudgeVote(interaction);
      } catch (error) {
        console.error("Error handling judge vote:", error);
        await interaction.reply({
          content: "There was an error processing your vote.",
          ephemeral: true,
        });
      }
    }
  }
});

// Error handling
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

chatBotClient.commands = new Collection();
const chatBotCommandsPath = path.join(__dirname, "src/bot/commands");

// Load commands for chatBotClient
console.log("Loading commands for chatBotClient from:", chatBotCommandsPath);
const chatBotCommandFiles = fs
  .readdirSync(chatBotCommandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of chatBotCommandFiles) {
  const filePath = path.join(chatBotCommandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    console.log(`Loading command for chatBotClient: ${command.data.name}`);
    chatBotClient.commands.set(command.data.name, command);
    console.log(
      ` ${command.data.name} :${chatBotClient.commands.has(command.data.name)}`
    );
  } else {
    console.log(`[WARNING] Command at ${filePath} missing required properties`);
  }
}

chatBotClient.once("ready", async () => {
  console.log(`Chatbot logged in as ${chatBotClient.user.tag}`);

  // Optional: Perform any initialization for the chat bot
  const guild = chatBotClient.guilds.cache.first();
  if (guild) {
    // Any specific setup for the chat bot
    console.log(`Chatbot is in guild: ${guild.name}`);
  }
});

chatBotClient.on("messageCreate", async (message) => {
  // Ignore messages from the bot itself
  if (message.author.bot) return;

  console.log(
    `Received message from ${message.author.username}: ${message.content}`
  );

  // Check if the user has the "judge" role
  const isJudge = chatBotClient.sessionManager.hasRole(
    message.author.id,
    "judge"
  );
  console.log(`Is judge: ${isJudge}`);
  if (!isJudge) return;

  // Check if the message is in a Turing Test channel
  const isTuringTestChannel =
    chatBotClient.sessionManager.availableChannels.has(message.channel.id);
  console.log(`Is Turing Test channel: ${isTuringTestChannel}`);
  if (!isTuringTestChannel) return;

  // Get Ollama response
  const prompt = `User: ${message.content}`;
  console.log(`Prompt: ${prompt}`);
  const reply = await getOllamaResponse(prompt);
  console.log(`Ollama response: ${reply}`);

  // Send reply as Turing Test Chat-Bot
  message.channel.send(reply);
});

chatBotClient.on("error", (error) => {
  console.error("Chatbot client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Function to call Ollama's API using the Ollama JavaScript library
async function getOllamaResponse(prompt) {
  try {
    const response = await ollama.chat({
      model: "llama3.1",
      messages: [{ role: "user", content: prompt }],
    });
    console.log("Ollama API response:", response);
    return response?.data?.response || "Something went wrong.";
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    return "Something went wrong.";
  }
}

// Express routes
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    commands: Array.from(client.commands.keys()),
    activeSessions: client.sessionManager.activeSessionsCache.size,
  });
});

// Start both Discord bot and Express server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Login to Discord with each bot
    await Promise.all([
      client.login(process.env.DISCORD_TOKEN),
      chatBotClient.login(process.env.DISCORD_TOKEN_TURING_TEST_CHANNEL),
    ]);
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();
