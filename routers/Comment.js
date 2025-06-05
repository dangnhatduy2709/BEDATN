var router = require('express')();
var db = require('./DBConnect');

// tạo chức năng đăng nhập
router.post('/add', function (req, res) {
    const { userID, taskID, message } = req.body;

    var query = "INSERT INTO comments (task_id, user_id, message, attachment_path, is_read) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [taskID, userID, message, null, 0], function (err, result) {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Error executing query', details: err.message });
        } else {
            res.json(result);
        }
    });
});

// Lấy danh sách đăng nhập
router.get('/getCommentByTaskID/:id', function (req, res) {
  var query = `
    SELECT c.*, t.*, u.* 
    FROM comments c
    LEFT JOIN tasks t ON c.task_id = t.taskID
    LEFT JOIN users u ON c.user_id = u.userID
    WHERE c.task_id = ?
    ORDER BY c.sent_at DESC`;
  
  db.query(query, [req.params.id], function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.status(200).json(result);
  });
});

router.get('/', function (req, res) {
    var query = "select * from Comments ";
    db.query(query, function (err, result) {
        if (err) throw err;
        res.status(200).json(result);
    });
})

router.get('/get-comment/:id', function (req, res) {
    var query = 'select * from Comments where commentID = ' + req.params.id;
    db.query(query, function (err, result) {
        if (err) res.status(500).send('Loi cau lenh truy van');
        res.json(result);
    })
});

var path = require('path');
module.exports = router;