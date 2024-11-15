// main.js or index.js
const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();

//const TuringTestManager = require("./TuringTestManager");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const manager = new TuringTestManager(client);

client.login(process.env.DISCORD_TOKEN);

// Use the manager in your commands
const startTestCommand = {
  name: "start-test",
  async execute(interaction) {
    await manager.startTest(interaction);
  },
};

// Example usage in your bot
client.on("interactionCreate", async (interaction) => {
  if (interaction.commandName === "start-test") {
    const session = await manager.startTest(interaction);
    // Handle the new session
  }
});
