// middlewares/authenticate.js
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { // Dependiendo de tu configuración de autenticación
      return next();
    }
    res.redirect('/login'); // O devuelve un error, según tu necesidad
  }
  
  module.exports = ensureAuthenticated;
  