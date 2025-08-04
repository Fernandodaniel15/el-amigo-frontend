class CreateEvent {
  constructor(eventRepo) {
    this.eventRepo = eventRepo;
  }
  async execute(data) {
    // Validar fecha, nombre, organizador
    const event = await this.eventRepo.create(data);
    return event;
  }
}
module.exports = CreateEvent;
