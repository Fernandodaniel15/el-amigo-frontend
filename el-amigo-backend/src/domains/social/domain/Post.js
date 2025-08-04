class Post {
  constructor({ id, userId, content, type, media, createdAt, likes, comments }) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.type = type || "text"; // text, voice, image, video
    this.media = media || null; // url o blob
    this.createdAt = createdAt || new Date();
    this.likes = likes || [];
    this.comments = comments || [];
  }
}
module.exports = Post;
