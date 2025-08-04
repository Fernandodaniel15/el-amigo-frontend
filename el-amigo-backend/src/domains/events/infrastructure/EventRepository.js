const EventModel = require('./EventModel');
class EventRepository {
  async create(data) {
    return await EventModel.create(data);
  }
  async listAll() {
    return await EventModel.find();
  }
  async addMission(eventId, mission) {
    return await EventModel.findByIdAndUpdate(eventId, { $push: { misiones: mission } }, { new: true });
  }
}
module.exports = EventRepository;
