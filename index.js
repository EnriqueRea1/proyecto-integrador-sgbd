const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();
require('dotenv').config();
const port = 3000;

// Middlewares de sesión
const ensureAuthenticated = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');

// Configurar el directorio de vistas y el motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware para procesar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, 
  saveUninitialized: false, 
  cookie: { secure: false } 
}));

// Middleware de flash para mensajes
app.use(flash());

// Middleware para mostrar mensajes de flash
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Middleware para asegurar que req.user esté disponible en cada solicitud
app.use((req, res, next) => {
  if (req.session.user) {
    req.user = req.session.user;
  }
  console.log("Usuario en sesión:", req.user); 
  next();
});

// Donde cargar los archivos estáticos
app.use(express.static(path.join(__dirname, 'web')));

// Importar las rutas
const userRouter = require('./rutas/user');

// Usar las rutas importadas
app.use('/', userRouter);

// Aplicar `ensureAuthenticated` solo en rutas que requieren autenticación
app.use('/ruta-protegida', ensureAuthenticated, (req, res) => {
  res.send('Esta es una ruta protegida');
});

// Aplicar `authorize` donde sea necesario
app.use('/admin', authorize('admin'), (req, res) => {
  res.send('Esta es una ruta solo para administradores');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

console.log('SESSION_SECRET:', process.env.SESSION_SECRET);
