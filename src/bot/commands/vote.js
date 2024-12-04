const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Vote for who you think is the AI")
    .addUserOption((option) =>
      option
        .setName("participant")
        .setDescription("The participant you think is the AI")
        .setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const participant = interaction.options.getUser("participant");

    // Access the session manager through the client
    const sessionManager = interaction.client.sessionManager;

    // Check if the user has the "judge" role
    const isJudge = sessionManager.hasRole(userId, "judge");
    if (!isJudge) {
      await interaction.reply({
        content: "You must be a judge to vote.",
        ephemeral: true,
      });
      return;
    }

    // Handle the judge's vote
    await interaction.client.turingManager.handleJudgeVote(
      interaction,
      participant
    );
  },
};
