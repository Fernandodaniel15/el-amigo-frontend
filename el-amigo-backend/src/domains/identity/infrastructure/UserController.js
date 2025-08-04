// Controlador express
const RegisterUser = require('../application/RegisterUser');
const UserRepository = require('./UserRepository');
const userRepo = new UserRepository();
const registerUser = new RegisterUser(userRepo);

exports.register = async (req, res) => {
  try {
    const user = await registerUser.execute(req.body);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
