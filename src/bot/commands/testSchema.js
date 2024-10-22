const { SlashCommandBuilder } = require("discord.js");
const testSchema = require("../../models/test");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test-schema")
    .setDescription("Test the test schema")
    .addStringOption((option) =>
      option
        .setName("schema-input")
        .setDescription("The name of the test")
        .setRequired(true)
    ),
  async execute(interaction) {
    const { options } = interaction;
    const string = options.getString("schema-input");

    await testSchema.create({
      name: string,
    });
    await interaction.reply(`Test schema created with name: ${string}`);
  },
};
