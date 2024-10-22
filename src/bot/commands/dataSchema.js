const { SlashCommandBuilder } = require("discord.js");
const testSchema = require("../../models/test");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("read-schema")
    .setDescription("Test the data schema"),
  async execute(interaction) {
    const data = await testSchema.find();

    let values = [];
    await data.forEach(async (d) => {
      values.push(d.name);
    });
    await interaction.reply({ content: `${values.join("\n")}` });
  },
};
