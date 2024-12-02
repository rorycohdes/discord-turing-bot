const mongooose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  status: {
    type: String,
    enum: ["waiting", "active", "completed", "archived"],
    default: "waiting",
  },
  channelId: String,
  archiveChannelId: String,
  startTime: Date,
  endTime: Date,
  creatorId: String,
  maxParticipants: {
    type: Number,
    default: 3, // Including a judge
  },
  participants: [
    {
      userId: String,
      role: {
        type: String,
        enum: ["human", "ai", "judge"],
        required: true,
      },
      nickname: String,
      joinedAt: Date,
    },
  ],
  duration: Number,
  sessionType: {
    type: String,
    enum: ["1v1", "1v1-with-judge"],
    default: "1v1-with-judge",
  },
  judgeVotes: [
    {
      judgeId: String,
      votedUserId: String,
    },
  ],
});

module.exports = mongoose.model("Session", sessionSchema);
