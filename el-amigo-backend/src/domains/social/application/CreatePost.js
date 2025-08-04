class CreatePost {
  constructor(postRepo) {
    this.postRepo = postRepo;
  }
  async execute(data) {
    // Validar data, tipo de post, media
    const post = await this.postRepo.create(data);
    return post;
  }
}
module.exports = CreatePost;
