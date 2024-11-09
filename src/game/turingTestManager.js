class TuringTestManager {
    constructor(client) {
        this.client = client;
        this.sessionManager = new SessionManager();
        this.testDuration = 10 * 60 * 1000; // 10 minutes
    }

    async startTest(interaction) {
        try {
            // Get category using session manager
            const category = await this.sessionManager.getOrCreateCategory(interaction.guild);

            // Create channel
            const channel = await interaction.guild.channels.create({
                name: `test-${Date.now()}`,
                type: ChannelType.GuildText,
                parent: category
            });

            // Create session using session manager
            const session = await this.sessionManager.createSession(channel, interaction.user);

            // Set up auto-cleanup
            setTimeout(() => this.endTest(channel.id), this.testDuration);

            return session;
        } catch (error) {
            console.error('Error starting test:', error);
            throw error;
        }
    }

    async addParticipant(channelId, userId) {
        const session = this.sessionManager.getSession(channelId);
        if (!session || !session.isActive) return false;

        session.participants.add(userId);
        return true;
    }

    async endTest(channelId) {
        try {
            const session = await this.sessionManager.endSession(channelId);
            if (session) {
                const channel = await this.client.channels.fetch(channelId);
                if (channel) {
                    await channel.delete();
                }
            }
            return true;
        } catch (error) {
            console.error('Error ending test:', error);
            return false;
        }
    }
}