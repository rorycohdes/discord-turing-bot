const mongooose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  status: {
    type: String,
    enum: ["waiting", "active", "completed", "archived"],
    default: "waiting",
  },
  threadId: String,
  archiveThreadId: String,
  startTime: Date,
  endTime: Date,
  creatorId: String,
  maxParticipants: {
    type: Number,
    default: 2,
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
    enum: ["1v1", "group"],
    default: "1v1",
  },
});

module.exports = mongoose.model("Session", sessionSchema);
