var router = require('express')();
var db = require('../database/DBConnect');


// Đăng ký người dùng
const bcrypt = require('bcrypt');
router.post('/register', async (req, res) => {
  try {
    const { picture, fullName, password, emailAddress, phoneNumber, roleID } = req.body;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const query = "INSERT INTO Users (picture, fullName, passwordHash, emailAddress, phoneNumber, roleID, lastLogin, createdDate) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
    db.query(query, [picture, fullName, passwordHash, emailAddress, phoneNumber, roleID], (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ success: false, message: 'Error executing query', details: err.message });
      } 
      else {
        res.json({ success: true, message: 'User registered successfully', userID: result.insertId });
      }
      });
    } 
    catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ success: false, message: 'Error during registration', details: error.message });
    }
});

// Đăng nhập người dùng và tạo token JWT
const jwt = require('jsonwebtoken');
router.post('/login', async (req, res) => {
  try {
    const { emailAddress, password } = req.body;
    const query = "SELECT * FROM Users WHERE emailAddress = ?";
    db.query(query, [emailAddress], async (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ success: false, message: 'Error executing query', details: err.message });
      } else {
        if (results.length > 0) {
          const user = results[0];
          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (passwordMatch) {
            const token = jwt.sign({ userID: user.userID, emailAddress: user.emailAddress }, 'your-secret-key', { expiresIn: '1h' });
            const userData = {
              userID: user.userID,
              picture: user.picture,
              fullName: user.fullName,
              emailAddress: user.emailAddress,
              phoneNumber: user.phoneNumber,
              roleID: user.roleID,
              lastLogin: user.lastLogin,
              createdDate: user.createdDate,
            };
            res.json({ success: true, message: 'Login successful', token, user: userData, userID: user.userID});
          } else {
            res.status(401).json({ success: false, message: 'Incorrect email or password' });
          }
        } else {
          res.status(401).json({ success: false, message: 'Incorrect email or password' });
        }
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Error during login', details: error.message });
  }
});
router.get('/userLogin/:userID', (req, res) => {
  const userId = req.params.userID;

  const userLoginQuery = `
    SELECT Users.*, Roles.roleName
    FROM Users
    JOIN Roles ON Users.roleID = Roles.roleID
    WHERE Users.userID = ?`;
  db.query(userLoginQuery, [userId], (userLoginErr, userLoginResult) => {
    try {
      if (userLoginErr) {
        throw new Error(`Lỗi thực hiện truy vấn UserLogin: ${userLoginErr.message}`);
      }
      res.json({ userLogin: userLoginResult });
    } catch (userLoginCatchErr) {
      res.status(500).json({ error: 'Lỗi truy vấn UserLogin', details: userLoginCatchErr.message });
    }
  });
});


router.get('/', function(req, res) {
    // var query = ` SELECT U.userID, U.picture, U.fullName, PT.teamID, PT.teamName FROM Users U INNER JOIN Team PT ON U.userID = PT.teamID `;
        var query = ` SELECT* FROM Users`;
    db.query(query, function(err, result) {
    if (err) throw err;
    res.status(200).json(result);
    });
});
  
router.get('/get-user/:id', function(req, res){
    var query = 'select * from Users where userID = '+ req.params.id ;
    db.query(query, function(err, result) {
      if(err) res.status(500).send('Loi cau lenh truy van');
      res.json(result);
    })
});


// Tạo API để thêm thành viên mới vào nhóm
router.post('/add_team_member', (req, res) => {
  const { teamID, userID, joinDate } = req.body;
  const getRoleQuery = `SELECT u.roleID, r.roleName FROM Users u JOIN Roles r ON u.roleID = r.roleID WHERE u.userID = ${userID}`;
  db.query(getRoleQuery, (roleErr, roleResult) => {
      if (roleErr) {
          console.error('Error executing role query:', roleErr);
          return res.status(500).json({ error: 'An error occurred while fetching user roles' });
      }
      if (roleResult.length > 0) {
          const { roleID, roleName } = roleResult[0];
          const addMemberQuery = `
              INSERT INTO TeamMembers (teamID, userID, roleID, joinDate)
              VALUES ('${teamID}', '${userID}', '${roleID}', '${joinDate}')`;
          db.query(addMemberQuery, (err, result) => {
              if (err) {
                  console.error('Error executing query:', err);
                  return res.status(500).json({ error: 'An error occurred while adding team member' });
              }
              return res.json({ message: 'Team member added successfully', roleName });
          });
      } else {
          return res.status(404).json({ error: 'User roles not found' });
      }
  });
});


var path = require('path');
module.exports = router;