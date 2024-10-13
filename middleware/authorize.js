// middlewares/authorize.js
function authorize(roles = []) {
    if (typeof roles === 'string') {
      roles = [roles];
    }
  
    return (req, res, next) => {
      console.log(req.user); // Depurar
      const user = req.user; // Suponiendo que el usuario está almacenado en req.user después de la autenticación
  
      if (!user || !roles.includes(user.rol)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
  
      next();
    };
  }
  
  module.exports = authorize;
  