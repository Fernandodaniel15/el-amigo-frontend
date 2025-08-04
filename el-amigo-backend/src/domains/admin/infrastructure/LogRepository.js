const LogModel = require('./LogModel');
class LogRepository {
  async create(data) {
    return await LogModel.create(data);
  }
  async listByModulo(modulo) {
    return await LogModel.find({ modulo });
  }
}
module.exports = LogRepository;
