const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
