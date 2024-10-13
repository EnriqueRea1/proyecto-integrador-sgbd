const mysql = require('mysql2');

const createUserPool = () => {
  return mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Omen190905',
    database: 'dbms',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }).promise();
};

module.exports = createUserPool;
