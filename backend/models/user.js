const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  // Lower-cased copy used for the uniqueness check, so "Sam" and "sam" collide
  usernameLower: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  // The shared demo account anyone can log into
  isDemo: { type: Boolean, default: false },
  // Demo only: when its data was last wiped/re-seeded
  demoResetAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
