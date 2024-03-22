
var router = require('express')();
var db = require('../database/DBConnect');

// Lấy danh sách team
router.get('/',function(req,res){
    var query = "select * from Team";
    db.query(query,function(err,result){
        if(err) throw err;
        res.status(200).json(result);
    });
})

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