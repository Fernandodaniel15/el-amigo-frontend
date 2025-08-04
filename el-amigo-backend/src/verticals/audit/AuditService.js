class AuditService {
  async logAction({ userId, action, details }) {
    // Guardar registro en audit logs y opcionalmente en blockchain
  }
  async listActions({ userId, from, to }) {
    // Buscar logs por filtros
  }
}
module.exports = AuditService;
