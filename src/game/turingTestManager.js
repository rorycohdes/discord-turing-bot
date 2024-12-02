const SessionManager = require("../session");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  uniqueNamesGenerator,
  adjectives,
  nouns,
} = require("unique-names-generator");

const usedNicknames = new Set();

function generateUniqueNickname() {
  let nickname;
  do {
    nickname = uniqueNamesGenerator({
      dictionaries: [adjectives, nouns],
      separator: "",
      length: 2,
    });
  } while (usedNicknames.has(nickname));

  usedNicknames.add(nickname);
  return nickname;
}

class TuringTestManager {
  constructor(client) {
    this.client = client;
    this.sessionManager = new SessionManager();
  }

  async startTest(interaction, participants) {
    try {
      const duration = interaction.options.getInteger("duration");

      await this.sessionManager.initializeChannels(interaction.guild);

      const { channel, session } = await this.sessionManager.createSession(
        { guild: interaction.guild },
        {
          duration,
          maxParticipants: 3, // Now including a judge
          sessionType: "1v1-with-judge",
        }
      );

      // Assign unique nicknames to participants
      participants.forEach((p) => {
        p.nickname = generateUniqueNickname();
      });

      // Randomly assign roles
      const roles = ["judge", "human"];
      for (const participant of participants) {
        const roleIndex = Math.floor(Math.random() * roles.length);
        participant.role = roles.splice(roleIndex, 1)[0];
      }

      // Apply nicknames and roles
      for (const participant of participants) {
        try {
          await interaction.guild.members
            .fetch(participant.userId)
            .then((member) => member.setNickname(participant.nickname));
        } catch (nicknameError) {
          console.error(
            `Could not set nickname for ${participant.userId}:`,
            nicknameError
          );
        }

        // Assign the "judge" role to the judge
        if (participant.role === "judge") {
          this.sessionManager.assignRole(participant.userId, "judge");
        }
      }

      // Send a private DM to the participant
      const user = await guild.members.fetch(participant.userId);
      await user.send(
        `You have been assigned the role of ${participant.role} in the Turing test. Please join the channel: ${channel.name}`
      );

      // Create judge voting buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`judge_vote:${participants[0].userId}`)
          .setLabel(participants[0].nickname)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`judge_vote:${participants[1].userId}`)
          .setLabel(participants[1].nickname)
          .setStyle(ButtonStyle.Danger)
      );

      // Send voting message
      await channel.send({
        content: "Judge, please determine which participant is the AI:",
        components: [row],
      });

      // Set up auto-cleanup
      setTimeout(() => this.endTest(channel.id), duration * 60 * 1000);

      return {
        channelId: channel.id,
        duration,
        participants,
      };
    } catch (error) {
      console.error("Error starting test:", error);
      throw error;
    }
  }

  async handleJudgeVote(interaction) {
    const [, votedUserId] = interaction.customId.split(":");

    // Store the vote
    this.judgeVotes.set(interaction.user.id, votedUserId);

    // Acknowledge the vote
    await interaction.reply({
      content: `You've voted that ${
        interaction.guild.members.cache.get(votedUserId).displayName
      } is the AI.`,
      ephemeral: true,
    });
  }

  async endTest(channelId) {
    try {
      const sessionData =
        this.sessionManager.activeSessionsCache.get(channelId);
      if (sessionData) {
        const { channel, session } = sessionData;

        // Capture archived messagesK
        const archivedMessages =
          await this.sessionManager.clearChannelForNewSession(channel);

        // Remove nicknames
        for (const participant of session.participants) {
          try {
            await channel.guild.members
              .fetch(participant.userId)
              .then((member) => member.setNickname(null));
          } catch (error) {
            console.error(
              `Could not reset nickname for ${participant.userId}:`,
              error
            );
          }
        }

        // Determine judge's conclusion
        const judgeConclusion = this.determineJudgeConclusion(session);

        // Find results announcement channel
        const resultsChannel = channel.guild.channels.cache.find(
          (ch) =>
            ch.name === "turing-test-results" &&
            ch.type === ChannelType.GuildAnnouncement
        );

        if (resultsChannel) {
          await resultsChannel.send({
            embeds: [
              {
                color: judgeConclusion.correct ? 0x00ff00 : 0xff0000,
                title: "Turing Test Session Completed",
                description: judgeConclusion.correct
                  ? "The judge successfully identified the AI!"
                  : "The AI successfully deceived the judge!",
                fields: [
                  {
                    name: "Session Duration",
                    value: `${session.duration} minutes`,
                    inline: true,
                  },
                  {
                    name: "Judge's Determination",
                    value: judgeConclusion.correct ? "Correct" : "Incorrect",
                    inline: true,
                  },
                ],
              },
              {
                description: archivedMessages || "No messages to archive",
                color: 0x808080,
              },
            ],
          });
        }

        // Mark session as completed
        session.status = "completed";
        await session.save();

        // Release the channel back to available channels
        this.sessionManager.releaseChannel(channelId);
        this.sessionManager.activeSessionsCache.delete(channelId);
      }
      return true;
    } catch (error) {
      console.error("Error ending test:", error);
      return false;
    }
  }

  determineJudgeConclusion(session) {
    // Use the stored judge votes to determine correctness
    const votes = Array.from(this.judgeVotes.values());
    const aiParticipant = session.participants.find((p) => p.role === "ai");

    // If judge voted for the AI's user ID, they were correct
    return {
      correct: votes.includes(aiParticipant.userId),
      reasoning: "Based on judge's button selection",
    };
  }
}

module.exports = TuringTestManager;
