const CreatePost = require('../application/CreatePost');
const PostRepository = require('./PostRepository');
const postRepo = new PostRepository();
const createPost = new CreatePost(postRepo);

exports.create = async (req, res) => {
  try {
    const post = await createPost.execute(req.body);
    res.status(201).json({ post });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const posts = await postRepo.getAll();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
