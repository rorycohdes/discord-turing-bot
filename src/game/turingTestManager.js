const SessionManager = require("../session");

class TuringTestManager {
  constructor(client) {
    this.client = client;
    this.sessionManager = new SessionManager();
  }

  async startTest(interaction) {
    try {
      const duration = interaction.options.getInteger("duration");

      await this.sessionManager.initializeChannels(interaction.guild);

      const { channel, session } = await this.sessionManager.createSession(
        interaction,
        {
          duration,
          maxParticipants: 2,
          sessionType: "1v1",
        }
      );

      // Set up auto-cleanup
      setTimeout(() => this.endTest(channel.id), duration * 60 * 1000);

      return {
        channelId: channel.id,
        duration,
      };
    } catch (error) {
      console.error("Error starting test:", error);
      throw error;
    }
  }

  async endTest(channelId) {
    try {
      const sessionData =
        this.sessionManager.activeSessionsCache.get(channelId);
      if (sessionData) {
        const { channel, session } = sessionData;

        // Capture archived messages
        const archivedMessages =
          await this.sessionManager.clearChannelForNewSession(channel);

        // Find results channel
        const resultsChannel = channel.guild.channels.cache.find(
          (ch) => ch.name === "turing-test-results"
        );

        // Determine judge's conclusion (placeholder logic)
        const judgeConclusion = this.determineJudgeConclusion(session);

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

        // Lock the channel
        await channel.permissionOverwrites.edit(channel.guild.id, {
          SendMessages: false,
        });

        // Mark session as completed
        session.status = "completed";
        await session.save();

        // Release the channel back to available channels
        this.sessionManager.releaseChannel(channelId);

        // Remove from active sessions
        this.sessionManager.activeSessionsCache.delete(channelId);
      }
      return true;
    } catch (error) {
      console.error("Error ending test:", error);
      return false;
    }
  }

  determineJudgeConclusion(session) {
    // Placeholder logic for judge's determination
    return {
      correct: Math.random() > 0.5,
      reasoning: "Random determination for demonstration",
    };
  }
}

module.exports = TuringTestManager;
