const bcrypt = require('bcrypt');
const saltRounds = 10; // Número de rondas de sal

async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    throw new Error('Error al crear el hash de la contraseña');
  }
}

async function verifyPassword(plainTextPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error al comparar la contraseña');
  }
}

module.exports = {
  hashPassword,
  verifyPassword
};
