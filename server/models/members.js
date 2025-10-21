const mongoose = require("mongoose");

const mmuSchema = new mongoose.Schema({
  memberID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rank: { type: String, required: true},
  marks: { type: String, required: true},
  info: { type: String},
});

module.exports = Members =  mongoose.model("Members", mmuSchema);
