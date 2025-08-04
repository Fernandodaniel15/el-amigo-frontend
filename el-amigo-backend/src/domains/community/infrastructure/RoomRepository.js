const RoomModel = require('./RoomModel');
class RoomRepository {
  async create(data) {
    return await RoomModel.create(data);
  }
  async listAll() {
    return await RoomModel.find();
  }
  async joinRoom(roomId, userId) {
    return await RoomModel.findByIdAndUpdate(roomId, { $addToSet: { users: userId } }, { new: true });
  }
}
module.exports = RoomRepository;
