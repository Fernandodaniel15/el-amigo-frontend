const SendNotification = require('../application/SendNotification');
const MarkRead = require('../application/MarkRead');
const NotificationRepository = require('./NotificationRepository');
const notificationRepo = new NotificationRepository();
const sendNotification = new SendNotification(notificationRepo);
const markRead = new MarkRead(notificationRepo);

exports.send = async (req, res) => {
  try {
    const notification = await sendNotification.execute(req.body);
    res.status(201).json({ notification });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const notifications = await notificationRepo.listByUser(req.query.userId);
    res.json({ notifications });
  } catch (err) {
    res.status(404).json({ error: "No encontrado" });
  }
};

exports.mark = async (req, res) => {
  try {
    const notification = await markRead.execute({ id: req.body.id });
    res.json({ notification });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
