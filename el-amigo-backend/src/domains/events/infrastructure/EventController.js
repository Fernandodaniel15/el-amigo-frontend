const CreateEvent = require('../application/CreateEvent');
const EventRepository = require('./EventRepository');
const eventRepo = new EventRepository();
const createEvent = new CreateEvent(eventRepo);

exports.create = async (req, res) => {
  try {
    const event = await createEvent.execute(req.body);
    res.status(201).json({ event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const events = await eventRepo.listAll();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
