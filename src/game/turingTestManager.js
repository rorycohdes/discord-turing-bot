const SessionManager = require("../session");

class TuringTestManager {
  constructor(client) {
    this.client = client;
    this.sessionManager = new SessionManager();
  }

  async startTest(interaction) {
    try {
      const duration = interaction.options.getInteger("duration");

      // Create session with proper options
      const { thread, session } = await this.sessionManager.createSession(
        interaction,
        { duration }
      );

      // Set up auto-cleanup
      setTimeout(() => this.endTest(thread.id), duration * 60 * 1000);

      return {
        threadId: thread.id,
        channelId: thread.parentId,
        duration,
      };
    } catch (error) {
      console.error("Error starting test:", error);
      throw error;
    }
  }

  async endTest(threadId) {
    try {
      const sessionData = this.sessionManager.getSession(threadId);
      if (sessionData) {
        const { thread, session } = sessionData;
        await thread.setLocked(true);
        session.status = "completed";
        await session.save();
        this.sessionManager.activeSessionsCache.delete(threadId);
      }
      return true;
    } catch (error) {
      console.error("Error ending test:", error);
      return false;
    }
  }
}
module.exports = TuringTestManager;
