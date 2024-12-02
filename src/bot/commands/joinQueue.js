const { SlashCommandBuilder } = require("discord.js");

//manager classes are initialized in the client in the index file so no need to import them here

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join-queue")
    .setDescription("Join the queue for a Turing test"),
  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Access the session manager through the client
    const sessionManager = interaction.client.sessionManager;

    // Add user to the queue
    sessionManager.queue.push({ userId, username });

    // Reply to the user
    await interaction.reply({
      content: `You have been added to the queue for a Turing test. Please wait for further instructions.`,
      ephemeral: true,
    });

    // Check if there are enough participants to start a test
    if (sessionManager.queue.length >= 2) {
      const participants = sessionManager.queue.splice(0, 2);
      await interaction.client.turingManager.startTest(
        interaction,
        participants
      );
    }
  },
};
