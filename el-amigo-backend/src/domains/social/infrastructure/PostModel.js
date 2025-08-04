const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  userId: String,
  content: String,
  type: String,
  media: String,
  createdAt: Date,
  likes: [String],
  comments: [
    {
      userId: String,
      text: String,
      createdAt: Date
    }
  ]
});
module.exports = mongoose.model('Post', PostSchema);
