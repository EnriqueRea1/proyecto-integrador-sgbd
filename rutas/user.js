const express = require('express');
const router = express.Router();
const createPool = require('../config/db');
const createUserPool = require('../config/sesion'); 
const { hashPassword, verifyPassword } = require('../utils/hash');
const ensureAuthenticated = require('../middleware/authenticate'); 
const authorize = require('../middleware/authorize'); 

let pool = null; // Pool para la base de datos gestionada por el usuario
const userPool = createUserPool(); // Pool para la base de datos de usuarios

router.get('/', (req, res) => {
  res.render('inicio'); // Página principal
});

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.redirect('/'); // Redirige al usuario a la página principal
  });
});

// Formulario de registro e inicio de sesión
router.get('/Sesion', (req, res) => {
  res.render('inicioSesion');
});

// Ruta para el registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      req.flash('error_msg', 'Por favor, complete todos los campos.');
      return res.redirect('/Sesion');
    }

    const checkUserQuery = 'SELECT * FROM usuarios WHERE email_usr = ?';
    const [results] = await userPool.query(checkUserQuery, [email]);

    if (results.length > 0) {
      req.flash('error_msg', 'El correo electrónico ya está registrado.');
      return res.redirect('/Sesion');
    }

    const hashedPassword = await hashPassword(password);
    const insertUserQuery = 'INSERT INTO usuarios (nombre_usr, email_usr, pas_usr, rol) VALUES (?, ?, ?, ?)';
    await userPool.query(insertUserQuery, [nombre, email, hashedPassword, 'admin']);

    req.flash('success_msg', 'Registro exitoso. Ahora puedes iniciar sesión.');
    res.redirect('/Sesion');
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    req.flash('error_msg', 'Error al registrar el usuario.');
    res.redirect('/Sesion');
  }
});


// Ruta para el inicio de sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Iniciando sesión con:', email, password);

    if (!email || !password) {
      req.flash('error_msg', 'Por favor, ingrese su correo electrónico y contraseña.');
      return res.redirect('/Sesion');
    }

    const query = 'SELECT * FROM usuarios WHERE email_usr = ?';
    const [results] = await userPool.query(query, [email]);

    if (results.length === 0) {
      console.log('No se encontró el usuario con ese correo electrónico.');
      req.flash('error_msg', 'Correo electrónico o contraseña incorrectos.');
      return res.redirect('/Sesion');
    }

    const user = results[0];
    console.log('Usuario encontrado:', user);

    // Verificar la contraseña
    const isPasswordValid = await verifyPassword(password, user.pas_usr);
    console.log('¿Contraseña válida?:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Contraseña incorrecta.');
      req.flash('error_msg', 'Correo electrónico o contraseña incorrectos.');
      return res.redirect('/Sesion');
    }

    console.log('Contraseña verificada, creando sesión...');

    req.session.user = {
      id: user.id_usr,
      nombre: user.nombre_usr,
      email: user.email_usr,
      rol: user.rol
    };

    console.log('Sesión creada:', req.session.user);

    req.flash('success_msg', 'Inicio de sesión exitoso.');
    return res.redirect('/configurar-db');

  } catch (error) {
    console.error('Error en el proceso de inicio de sesión:', error);
    req.flash('error_msg', 'Ocurrió un error al iniciar sesión.');
    return res.redirect('/Sesion');
  }
});

// Ruta para actualizar el rol del usuario
router.post('/actualizar-rol', async (req, res) => {
  const { userId, newRole } = req.body;
  try {
    // Actualiza el rol en la base de datos
    await userPool.query('UPDATE usuarios SET rol = ? WHERE id_usr = ?', [newRole, userId]);

    // Actualiza la sesión del usuario
    if (req.session && req.session.user && req.session.user.id === userId) {
      req.session.user.rol = newRole; // Actualiza el rol en la sesión
    }

    res.redirect('/bases-de-datos');
  } catch (err) {
    console.error('Error al actualizar el rol del usuario:', err);
    res.status(500).send('Error al actualizar el rol del usuario');
  }
});

// Configurar base de datos
router.get('/configurar-db', (req, res) => {
  res.render('formularioInicio'); 
});

router.post('/configurar-db', (req, res) => {
  const { dbHost, dbUser, dbPassword } = req.body;

  pool = createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: '' 
  });

  pool.getConnection()
    .then(connection => {
      console.log('Conexión exitosa');
      connection.release();
      res.redirect('/bases-de-datos');
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).send('Error de conexión a la base de datos');
    });
});

// Ruta para listar bases de datos
router.get('/bases-de-datos', ensureAuthenticated, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).send('No se ha configurado la conexión a la base de datos.');
    }
    const user = req.session.user || { rol: 'user' }; // Valor predeterminado en caso de que req.session.user sea undefined
    const [rows] = await pool.query('SHOW DATABASES');
    res.render('listadb', { databases: rows, user: user }); // Pasa el objeto user a la vista
  } catch (err) {
    console.error('Error al obtener la lista de bases de datos:', err);
    res.status(500).send('Error al obtener la lista de bases de datos');
  }
});

// Ruta para ver las tablas de una base de datos
router.get('/ver-db', ensureAuthenticated, async (req, res) => {
  const { dbName } = req.query;
  if (!dbName) {
    return res.status(400).send('El nombre de la base de datos es requerido.');
  }
  try {
    if (!pool) {
      return res.status(500).send('No se ha configurado la conexión a la base de datos.');
    }
    const [tables] = await pool.query('SHOW TABLES FROM ??', [dbName]);
    const user = req.user || null;
    res.render('verdb', { dbName, tables, user });
  } catch (err) {
    console.error(`Error al obtener las tablas de la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener las tablas de la base de datos ${dbName}`);
  }
});


// Ruta para borrar una base de datos
router.post('/borrar-db', ensureAuthenticated, authorize('admin'), async (req, res) => {
  const { dbName } = req.body;
  try {
    await pool.query('DROP DATABASE ??', [dbName]);
    res.redirect('/bases-de-datos');
  } catch (err) {
    console.error(`Error al borrar la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al borrar la base de datos ${dbName}`);
  }
});


// Ruta para crear una nueva base de datos (Solo para administradores)
router.post('/crear-db', authorize('admin'), async (req, res) => {
  const { dbName } = req.body;

  // Validación básica de la entrada
  if (!dbName || typeof dbName !== 'string' || dbName.length === 0) {
    req.flash('error_msg', 'El nombre de la base de datos es inválido.');
    return res.redirect('/bases-de-datos');
  }

  try {
    await pool.query(`CREATE DATABASE ??`, [dbName]);
    req.flash('success_msg', `La base de datos ${dbName} se ha creado correctamente.`);
    res.redirect('/bases-de-datos');
  } catch (err) {
    console.error(`Error al crear la base de datos ${dbName}:`, err);
    req.flash('error_msg', `Error al crear la base de datos ${dbName}.`);
    res.redirect('/bases-de-datos');
  }
});

// Ruta para crear una tabla en una base de datos
router.post('/crear-tabla',authorize('admin'), async (req, res) => {
  const { dbName, tableName, campos } = req.body;

  let query = `CREATE TABLE ${dbName}.${tableName} (`;
  campos.forEach((campo, index) => {
    query += `${campo.nombre} ${campo.tipo}`;
    if (campo.llave) query += ' PRIMARY KEY';
    if (index < campos.length - 1) query += ', ';
  });
  query += ')';

  try {
    await pool.query(query);
    res.redirect(`/ver-db?dbName=${dbName}`);
  } catch (err) {
    console.error(`Error al crear la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al crear la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para mostrar el formulario de creación de tablas
router.get('/agregar-tabla',authorize('admin'), (req, res) => {
  const { dbName } = req.query;
  res.render('agregartabla', { dbName });
});


// Ruta para mostrar el formulario de agregar datos
router.get('/agregar-datos', async (req, res) => {
  const { dbName, tableName } = req.query;
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    const columnNames = columns.map(column => column.Field);
    res.render('agregarDatos', { dbName, tableName, columns: columnNames });
  } catch (err) {
    console.error(`Error al obtener las columnas de la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener las columnas de la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

//ruta para insertar en tabla nuevo registro
router.post('/agregar-datos', async (req, res) => {
  const { dbName, tableName, data } = req.body;

  if (!data) {
    return res.status(400).send('No se proporcionaron datos.');
  }

  const columns = Object.keys(data).join(',');
  const values = Object.values(data).map(value => `'${value}'`).join(',');

  try {
    await pool.query(`INSERT INTO ${dbName}.${tableName} (${columns}) VALUES (${values})`);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error(`Error al agregar datos a la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al agregar datos a la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para ver el contenido de una tabla
router.get('/ver-tabla', ensureAuthenticated, async (req, res) => {
  const { dbName, tableName } = req.query;
  try {
    const [rows] = await pool.query(`SELECT * FROM ${dbName}.${tableName}`);
    res.render('vertabla', { dbName, tableName, rows, user: req.user });
  } catch (err) {
    console.error(`Error al obtener el contenido de la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener el contenido de la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para borrar una tabla
router.post('/borrar-tabla',authorize('admin'), async (req, res) => {
  const { dbName, tableName } = req.body;

  try {
    await pool.query(`DROP TABLE ${dbName}.${tableName}`);
    res.redirect(`/ver-db?dbName=${dbName}`);
  } catch (err) {
    console.error(`Error al borrar la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al borrar la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para mostrar el formulario de edición
router.get('/editar-registro',authorize('admin'), async (req, res) => {
  const { dbName, tableName, id } = req.query;

  try {
    // Obtener los detalles del registro a editar
    const [rows] = await pool.query(`SELECT * FROM ${dbName}.${tableName} WHERE id = ?`, [id]);
    const record = rows[0];

    if (!record) {
      return res.status(404).send('Registro no encontrado');
    }

    // Renderizar el formulario de edición
    res.render('editarregistro', { dbName, tableName, record });
  } catch (err) {
    console.error('Error al obtener el registro para editar:', err);
    res.status(500).send('Error al obtener el registro para editar, verifique el ID de su tabla');
  }
});

// Ruta para actualizar el registro
router.post('/actualizar-registro',authorize('admin'), async (req, res) => {
  const { dbName, tableName, id, ...fields } = req.body;

  // Generar la consulta de actualización
  const setClause = Object.keys(fields).map(field => `${field} = ?`).join(', ');
  const values = Object.values(fields);

  try {
    await pool.query(`UPDATE ${dbName}.${tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al actualizar el registro:', err);
    res.status(500).send('Error al actualizar el registro');
  }
});

// Ruta para eliminar un registro
router.post('/eliminar-registro',authorize('admin'), async (req, res) => {
  const { dbName, tableName, id } = req.body;

  try {
    await pool.query(`DELETE FROM ${dbName}.${tableName} WHERE id = ?`, [id]);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al eliminar el registro:', err);
    res.status(500).send('Error al eliminar el registro');
  }
});

// Ruta para mostrar el formulario de modificación de una tabla
router.get('/modificar-tabla',authorize('admin'), async (req, res) => {
  const { dbName, tableName } = req.query;

  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    res.render('modificarTabla', { dbName, tableName, columns });
  } catch (err) {
    console.error('Error al obtener las columnas de la tabla:', err);
    res.status(500).send('Error al obtener las columnas de la tabla');
  }
});


// Ruta para agregar un campo a una tabla
router.post('/agregar-campo',authorize('admin'), async (req, res) => {
  const { dbName, tableName, campoNombre, campoTipo } = req.body;

  try {
    await pool.query(`ALTER TABLE ${dbName}.${tableName} ADD COLUMN ${campoNombre} ${campoTipo}`);
    res.redirect(`/modificar-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al agregar el campo:', err);
    res.status(500).send('Error al agregar el campo');
  }
});

// Ruta para eliminar un campo de una tabla
router.post('/borrar-campo',authorize('admin'), async (req, res) => {
  const { dbName, tableName, campoNombre } = req.body;

  try {
    // Verificar si el campo es una clave primaria
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    const column = columns.find(col => col.Field === campoNombre);

    if (column.Key === 'PRI') {
      return res.status(400).send('No se puede eliminar un campo que es clave primaria.');
    }

    await pool.query(`ALTER TABLE ${dbName}.${tableName} DROP COLUMN ${campoNombre}`);
    res.redirect(`/modificar-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al borrar el campo:', err);
    res.status(500).send('Error al borrar el campo');
  }
});


  
  module.exports = router;
  