const CreateRoom = require('../application/CreateRoom');
const RoomRepository = require('./RoomRepository');
const roomRepo = new RoomRepository();
const createRoom = new CreateRoom(roomRepo);

exports.create = async (req, res) => {
  const room = await createRoom.execute(req.body);
  res.status(201).json({ room });
};

exports.list = async (req, res) => {
  const rooms = await roomRepo.listAll();
  res.json({ rooms });
};

exports.join = async (req, res) => {
  const { roomId, userId } = req.body;
  const room = await roomRepo.joinRoom(roomId, userId);
  res.json({ room });
};
