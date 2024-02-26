var router = require('express')();
var db = require('./DBConnect');

// tạo chức năng đăng nhập
router.post('/add', function(req, res){
    var taskid = req.body.taskID;
    var userid = req.body.userID;
    var commenttext = req.body.commentText;
    var attachmentdata = req.body.attachmentData;
    var createddate = req.body.createdDate;
    var query = "INSERT INTO Comments (taskID, userID, commentText, attachmentData, createdDate, isDeleted) VALUES (?, ?, ?, ?, ?, 0)";
    db.query(query, [taskid, userid, commenttext, attachmentdata, createddate], function(err, result) {
        if(err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Error executing query', details: err.message });
        } else {
            res.json(result);
        }
    });
});

// Lấy danh sách đăng nhập
router.get('/',function(req,res){
    var query = "select * from Comments";
    db.query(query,function(err,result){
        if(err) throw err;
        res.status(200).json(result);
    });
})
  
router.get('/get-comment/:id', function(req, res){
    var query = 'select * from Comments where commentID = '+ req.params.id ;
    db.query(query, function(err, result) {
        if(err) res.status(500).send('Loi cau lenh truy van');
        res.json(result);
    })
});

var path = require('path');
module.exports = router;