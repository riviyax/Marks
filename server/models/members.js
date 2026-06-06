const mongoose = require("mongoose");

const mmuSchema = new mongoose.Schema({
  memberID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rank: { type: String, required: true },
  marks: { type: String, required: true },
  info: { type: String },
  whatsappNumber: { type: String, default: "" },
  grade: { type: String, default: "" },           // e.g. "Grade 11", "A/L"
  category: { type: String, default: "" },        // e.g. "Announcing", "Sound Balancing"
});

module.exports = Members = mongoose.model("Members", mmuSchema);