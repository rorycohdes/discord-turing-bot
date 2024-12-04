const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const Session = require("../models/session");

class SessionManager {
  constructor() {
    this.activeSessionsCache = new Map();
    this.categoryName = "Turing Tests";
    this.totalChannels = 5;
    this.availableChannels = new Set();
    this.customRoles = new Map();
    this.queue = [];
  }

  assignRole(userId, role) {
    if (!this.customRoles.has(role)) {
      this.customRoles.set(role, new Set());
    }
    this.customRoles.get(role).add(userId);
    console.log(`Assigned role ${role} to user ${userId}`);
  }

  hasRole(userId, role) {
    return this.customRoles.has(role) && this.customRoles.get(role).has(userId);
  }

  removeRole(userId, role) {
    if (this.customRoles.has(role)) {
      this.customRoles.get(role).delete(userId);
    }
  }

  async initializeChannels(guild) {
    const category = await this.getOrCreateCategory(guild);

    for (let i = 1; i <= this.totalChannels; i++) {
      const channelName = `turing-test-${i}`;
      let channel = guild.channels.cache.find(
        (ch) => ch.parent?.id === category.id && ch.name === channelName
      );

      if (!channel) {
        channel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.SendMessages],
            },
          ],
        });
      }

      this.availableChannels.add(channel.id);
    }
  }

  async clearChannelForNewSession(channel) {
    const messagesToArchive = await channel.messages.fetch({ limit: 100 });

    const archiveMessages = messagesToArchive
      .filter((msg) => !msg.system && !msg.author.bot)
      .map((msg) => `**${msg.author.username}**: ${msg.content}`)
      .join("\n");

    // Bulk delete messages
    await channel.bulkDelete(messagesToArchive);

    // Reset channel permissions to default
    await channel.permissionOverwrites.set([
      {
        id: channel.guild.id,
        deny: [PermissionFlagsBits.SendMessages],
      },
    ]);

    return archiveMessages;
  }

  async createSession(interaction, options) {
    if (this.availableChannels.size === 0) {
      throw new Error("No available channels for new sessions");
    }

    const channelId = Array.from(this.availableChannels)[0];
    console.log(`Attempting to get channel with ID: ${channelId}`);
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      console.error(`Channel with ID ${channelId} not found`);
      throw new Error(`Channel with ID ${channelId} not found`);
    }

    this.availableChannels.delete(channelId);

    if (!interaction.user || !interaction.user.id) {
      throw new Error("Interaction user or user ID is undefined");
    }

    const session = await Session.create({
      channelId: channel.id,
      creatorId: interaction.user.id,
      ...options,
      startTime: new Date(),
      status: "waiting",
      participants: options.participants, // Use participants from options
    });

    this.activeSessionsCache.set(channel.id, {
      channel,
      session,
    });

    return { channel, session };
  }

  async releaseChannel(channelId) {
    this.availableChannels.add(channelId);
  }

  // Existing methods like getOrCreateCategory remain the same

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

  getRemainingTime(channelId) {
    const session = this.getSession(channelId);
    if (!session) return 0;

    const remaining = session.endTime - Date.now();
    return Math.max(0, remaining);
  }
}

module.exports = SessionManager;
