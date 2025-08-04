// Mongoose Schema (o Sequelize, ajustá a tu ORM)
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  nombre: String,
  password: String,
  avatar: String,
  reputacion: Number,
  kycStatus: String,
  roles: [String]
});
module.exports = mongoose.model('User', UserSchema);
