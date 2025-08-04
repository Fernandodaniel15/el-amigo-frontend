class CreateRoom {
  constructor(roomRepo) {
    this.roomRepo = roomRepo;
  }
  async execute(data) {
    return await this.roomRepo.create(data);
  }
}
module.exports = CreateRoom;
