const StartCampaign = require('../application/StartCampaign');
const GetMetrics = require('../application/GetMetrics');
const InfluencerRepository = require('./InfluencerRepository');
const influencerRepo = new InfluencerRepository();
const startCampaign = new StartCampaign(influencerRepo);
const getMetrics = new GetMetrics(influencerRepo);

exports.campaign = async (req, res) => {
  try {
    const inf = await startCampaign.execute(req.body);
    res.json({ influencer: inf });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.metrics = async (req, res) => {
  try {
    const metrics = await getMetrics.execute({ influencerId: req.params.id });
    res.json({ metrics });
  } catch (err) {
    res.status(404).json({ error: "No encontrado" });
  }
};
