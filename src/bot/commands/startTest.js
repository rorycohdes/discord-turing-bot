const { SlashCommandBuilder } = require("discord.js");

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

  async execute(interaction, turingManager) {
    try {
      const duration = interaction.options.getInteger("duration");
      const session = await turingManager.startTest(interaction, duration);

      await interaction.reply({
        embeds: [
          {
            title: "Test Session Created",
            description: `Channel: <#${session.channelId}>\nDuration: ${duration} minutes`,
            color: 0x00ff00,
          },
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in start-test command:", error);
      await interaction.reply({
        content: `Failed to start test: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
