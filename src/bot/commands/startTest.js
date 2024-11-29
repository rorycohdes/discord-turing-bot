const { SlashCommandBuilder, Client } = require("discord.js");
//const turingTestManager = require("../../game/TuringTestManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start-test")
    .setDescription("Start a new Turing test session")
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Test duration in minutes")
        .setRequired(true)
        .setMinValue(5)
        .setMaxValue(30)
    ),

  async execute(interaction) {
    try {
      // Access the manager through the client
      const manager = interaction.client.turingManager;
      const result = await manager.startTest(interaction);

      await interaction.reply({
        embeds: [
          {
            title: "Test Session Created",
            description: `Thread: <#${result.threadId}>\nDuration: ${result.duration} minutes`,
            color: 0x00ff00,
          },
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in start-test command:", error);
      throw error; // Main error handler will catch this
    }
  },
};
