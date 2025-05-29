var mysql = require('mysql2');
var connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root', 
    password: '123456',
    database: 'datn1',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


module.exports = connection;
  
  
  