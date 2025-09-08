const mongoose = require("mongoose");

const lastUpdateSchema = new mongoose.Schema({
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("LastUpdate", lastUpdateSchema);
