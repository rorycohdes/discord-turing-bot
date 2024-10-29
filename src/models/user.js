const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  testsTaken: { type: Number, default: 0 },
  correctGuesses: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);