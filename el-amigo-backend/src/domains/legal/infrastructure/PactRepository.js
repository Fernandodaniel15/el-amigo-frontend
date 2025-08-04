const PactModel = require('./PactModel');
class PactRepository {
  async create(data) {
    return await PactModel.create(data);
  }
  async findById(id) {
    return await PactModel.findById(id);
  }
  // Otros métodos: actualizar, log, buscar por usuario
}
module.exports = PactRepository;
