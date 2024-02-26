var mysql = require('mysql2');
var connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password: '241202',
    database: 'clonejira'
});

module.exports = connection;
  
  
  