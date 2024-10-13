
const mysql = require('mysql2');

function createPool(config) {
  return mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database || '', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }).promise();
}

module.exports = createPool;
