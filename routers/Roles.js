var router = require('express')();
var db = require('./DBConnect');

//Tạo roles
const util = require('util');
const query = util.promisify(db.query).bind(db);
router.post('/addrole', async (req, res) => {
  try {
    const rolename = req.body.roleName;
    const result = await query("INSERT INTO Roles (roleName) VALUES (?)", [rolename]);
    res.json(result);
  } catch (error) {
    console.error('Lỗi truy vấn:', error.message);
    res.status(500).json({ error: 'Lỗi truy vấn', details: error.message });
  }
});

// Lấy danh sách roles
router.get('/',function(req,res){
    var query = "select * from Roles";
    db.query(query,function(err,result){
        if(err) throw err;
        res.status(200).json(result);
    });
})


// Trong file server
router.get('/roles/:roleID', async (req, res) => {
    const roleID = req.params.roleID;
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM Roles WHERE roleID = ?', [roleID]);
      connection.release();
  
      if (rows.length > 0) {
        res.json(rows[0]);
      } else {
        res.status(404).json({ error: 'Role not found' });
      }
    } catch (error) {
      console.error('Error: ', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

var path = require('path');
module.exports = router;