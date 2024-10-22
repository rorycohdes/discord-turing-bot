const { SlashCommandBuilder } = require("discord.js");
const testSchema = require("../../models/test");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete-schema")
    .setDescription("Delete the test schema"),
  async execute(interaction) {
    const data = await testSchema.find();

    await data.forEach(async (d) => {
      await testSchema.findByIdAndDelete({ name: d.name });
    });
    await interaction.reply({ content: `Deleted all test schema` });
  },
};
