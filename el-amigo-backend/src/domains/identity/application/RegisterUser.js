// Caso de uso de registro de usuario
class RegisterUser {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }
  async execute(data) {
    // Validar email, password, etc.
    // Crear user
    const user = await this.userRepo.create(data);
    return user;
  }
}
module.exports = RegisterUser;
