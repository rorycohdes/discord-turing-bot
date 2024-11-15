const { SlashCommandBuilder } = require("discord.js");

/*

I want to be able to create multiple sessions simultaneously
Sessions are threads 
Sessions in play will be private
Sessions out of play should be archived

Bonus:
Session discovery

*/

class SessionManager {
  constructor() {
    // Cache active sessions for quick access
    this.activeSessionsCache = new Map();
    this.categoryName = "Turing Tests";
  }

  async createSession(interaction, options) {
    /**
     * It would be good to use typescript right here so I know the shape of the options object
     */
    const { duration, maxParticipants = 2, sessionType = "1v1" } = options;

    try {
      // Create a session category if it doesn't exist
      let category = await this.getOrCreateCategory(interaction.guild);

      // Create a unique session identifier
      const sessionId = `session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create thread for the session
      const { thread, parentMessage } = await this.createSessionThread(
        interaction.guild,
        category,
        sessionId,
        duration
      );

      // Create session in database
      const session = await Session.create({
        sessionId,
        threadId: thread.id,
        creatorId: interaction.user.id,
        duration,
        maxParticipants,
        sessionType,
        startTime: new Date(),
        participants: [
          {
            userId: interaction.user.id,
            role: "unknown",
            joinedAt: new Date(),
          },
        ],
      });

      // Cache the session
      this.activeSessionsCache.set(sessionId, {
        thread,
        parentMessage,
        session,
      });

      return { thread, session };
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  async getOrCreateCategory(guild) {
    let category = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === this.categoryName
    );

    if (!category) {
      category = await guild.channels.create({
        name: this.categoryName,
        type: ChannelType.GuildCategory,
      });
    }

    return category;
  }

  async listAvailableSessions(interaction) {
    try {
      const availableSessions = await Session.find({
        status: "waiting",
        "participants.0": { $exists: true },
        "participants.1": { $exists: false },
      }).sort({ startTime: -1 });

      return availableSessions.map((session) => ({
        id: session.sessionId,
        creator:
          interaction.guild.members.cache.get(session.creatorId)?.user
            .username || "Unknown",
        duration: session.duration,
        type: session.sessionType,
        participants: `${session.participants.length}/${session.maxParticipants}`,
      }));
    } catch (error) {
      console.error("Error listing sessions:", error);
      throw error;
    }
  }

  async joinSession(interaction, sessionId = null) {
    try {
      // If no sessionId provided, find the oldest available session
      let session;
      if (sessionId) {
        session = await Session.findOne({ sessionId });
      } else {
        session = await Session.findOne({
          status: "waiting",
          "participants.0": { $exists: true },
          "participants.1": { $exists: false },
        }).sort({ startTime: 1 });
      }

      if (!session) {
        return {
          success: false,
          message: "No available sessions found. Try creating a new one!",
        };
      }

      // Check if user is already in a session
      const existingSession = await Session.findOne({
        status: { $in: ["waiting", "active"] },
        "participants.userId": interaction.user.id,
      });

      if (existingSession) {
        return {
          success: false,
          message: "You are already in an active session!",
        };
      }

      // Add participant to session
      session.participants.push({
        userId: interaction.user.id,
        role: "unknown",
        joinedAt: new Date(),
      });

      // Update session status if full
      if (session.participants.length >= session.maxParticipants) {
        session.status = "active";
        // Randomly assign roles once session is full
        this.assignRoles(session);
      }

      await session.save();

      // Get thread from cache or fetch it
      const cachedSession = this.activeSessionsCache.get(session.sessionId);
      const thread =
        cachedSession?.thread ||
        (await interaction.guild.channels.threads.fetch(session.threadId));

      // Add user to thread
      await thread.members.add(interaction.user.id);

      return { success: true, thread, session };
    } catch (error) {
      console.error("Error joining session:", error);
      throw error;
    }
  }

  // assignRoles(session) {
  //   const participants = [...session.participants];
  //   // Shuffle participants
  //   for (let i = participants.length - 1; i > 0; i--) {
  //     const j = Math.floor(Math.random() * (i + 1));
  //     [participants[i], participants[j]] = [participants[j], participants[i]];
  //   }

  //   // Assign roles
  //   participants.forEach((participant, index) => {
  //     participant.role = index < participants.length / 2 ? "human" : "ai";
  //   });

  //   session.participants = participants;
  // }
}

// Slash Commands Implementation
const commands = {
  createSession: new SlashCommandBuilder()
    .setName("create-session")
    .setDescription("Create a new Turing test session")
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Session duration in minutes")
        .setRequired(true)
        .addChoices(
          { name: "5 minutes", value: 5 },
          { name: "10 minutes", value: 10 },
          { name: "15 minutes", value: 15 }
        )
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Session type")
        .setRequired(true)
        .addChoices(
          { name: "1v1", value: "1v1" },
          { name: "Group (3-4 participants)", value: "group" }
        )
    ),

  listSessions: new SlashCommandBuilder()
    .setName("list-sessions")
    .setDescription("List all available Turing test sessions"),

  joinSession: new SlashCommandBuilder()
    .setName("join-session")
    .setDescription("Join a Turing test session")
    .addStringOption((option) =>
      option
        .setName("session-id")
        .setDescription("Specific session ID to join")
        .setRequired(false)
    ),
};

// Command Handler Example
module.exports = {
  data: commands.listSessions,
  async execute(interaction) {
    const sessionManager = new SessionManager();

    try {
      const availableSessions = await sessionManager.listAvailableSessions(
        interaction
      );

      if (availableSessions.length === 0) {
        await interaction.reply({
          content:
            "No available sessions found. Create one with /create-session!",
          ephemeral: true,
        });
        return;
      }

      const sessionList = availableSessions
        .map(
          (session) =>
            `• Session ${session.id.slice(-6)}\n` +
            `  Created by: ${session.creator}\n` +
            `  Duration: ${session.duration} minutes\n` +
            `  Type: ${session.type}\n` +
            `  Participants: ${session.participants}\n`
        )
        .join("\n");

      await interaction.reply({
        embeds: [
          {
            title: "Available Turing Test Sessions",
            description: sessionList,
            color: 0x00ff00,
          },
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Failed to list sessions!",
        ephemeral: true,
      });
    }
  },
};

module.exports = SessionManager;
