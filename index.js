const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const connectDB = require("./src/db");
const express = require("express");
const app = express();
//import TuringTestManager from "./src/game/TuringTestManager.js";
const TuringTestManager = require("./src/game/TuringTestManager.js");

connectDB();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, "src/bot/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

client.once("ready", () => {
  console.log("Ready!");
});

const manager = new TuringTestManager(client);

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "start-test") {
    //     const session = await manager.startTest(interaction);
    // Handle the new session
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// client.on("interactionCreate", async (interaction) => {
//   if (interaction.commandName === "start-test") {
//     const session = await manager.startTest(interaction);
//     // Handle the new session
//   }
// });

client.login(process.env.DISCORD_TOKEN);

app.post("/", (req, res) => {
  res.json({ message: "Hello World" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
