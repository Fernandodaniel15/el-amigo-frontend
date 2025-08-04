const TranscribeVoice = require('../application/TranscribeVoice');
const RecommendFeed = require('../application/RecommendFeed');
const transcribeVoice = new TranscribeVoice();
const recommendFeed = new RecommendFeed();

exports.transcribe = async (req, res) => {
  const { audio } = req.body;
  const texto = await transcribeVoice.execute(audio);
  res.json({ texto });
};

exports.recommend = async (req, res) => {
  const { userId } = req.body;
  const posts = await recommendFeed.execute(userId);
  res.json({ posts });
};
