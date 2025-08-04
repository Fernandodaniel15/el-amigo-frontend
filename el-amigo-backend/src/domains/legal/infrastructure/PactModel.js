const mongoose = require('mongoose');
const PactSchema = new mongoose.Schema({
  userA: String,
  userB: String,
  terms: String,
  firmaA: String,
  firmaB: String,
  fecha: Date,
  status: String
});
module.exports = mongoose.model('Pact', PactSchema);
