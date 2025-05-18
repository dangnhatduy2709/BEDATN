var router = require("express")();
var db = require("./DBConnect");

// API lấy tất cả dữ liệu từ bảng Backlog
router.get("/", (req, res) => {
  const sql = `
            SELECT 
              b.backlogID,
              b.projectID,
              p.projectName,
              b.taskID,
              t.summary AS taskSummary,
              b.summary,
              b.userID,
              u.fullName AS userName,
              b.createdDate,
              b.description
            FROM 
              Backlog b
            JOIN 
              Projects p ON b.projectID = p.projectID
            JOIN 
              Tasks t ON b.taskID = t.taskID
            JOIN 
              Users u ON b.userID = u.userID
          `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
});

// API thêm một backlog mới
router.post("/", (req, res) => {
  const { projectID, taskID, summary, userID, createdDate, description } =
    req.body;

  if (
    !projectID ||
    !taskID ||
    !summary ||
    !userID ||
    !createdDate ||
    !description
  ) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
  }

  const sql = `
        INSERT INTO Backlog (projectID, taskID, summary, userID, createdDate, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

  db.query(
    sql,
    [projectID, taskID, summary, userID, createdDate, description],
    (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json({
        message: "Backlog mới đã được thêm",
        backlogID: result.insertId,
      });
    }
  );
});

router.get("/:id", (req, res) => {
  const backlogID = req.params.id;

  const sql = `
        SELECT 
            b.backlogID,
            b.projectID,
            p.projectName,
            b.taskID,
            t.summary AS taskSummary,
            b.summary,
            b.userID,
            u.fullName AS userName,
            b.createdDate,
            b.description
        FROM 
            Backlog b
        JOIN 
            Projects p ON b.projectID = p.projectID
        JOIN 
            Tasks t ON b.taskID = t.taskID
        JOIN 
            Users u ON b.userID = u.userID
        WHERE 
            b.backlogID = ?
    `;

  // Thực hiện truy vấn với backlogID
  db.query(sql, [backlogID], (err, results) => {
    if (err) {
      console.error("Error executing SQL query:", err); // Ghi log lỗi
      return res.status(500).json({ error: "Database query error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Backlog not found" });
    }
    // Trả về kết quả dưới dạng JSON
    res.json(results[0]);
  });
});

router.get("/project/:projectId/backlogs", (req, res) => {
  const projectID = req.params.projectId;

  // Câu truy vấn SQL để lấy danh sách backlog theo projectID
  const sql = `
        SELECT 
            b.backlogID,
            b.projectID,
            p.projectName,
            b.taskID,
            t.summary AS taskSummary,
            b.summary,
            b.userID,
            u.fullName AS userName,
            b.createdDate,
            b.description
        FROM 
            Backlog b
        JOIN 
            Projects p ON b.projectID = p.projectID
        JOIN 
            Tasks t ON b.taskID = t.taskID
        JOIN 
            Users u ON b.userID = u.userID
        WHERE 
            b.projectID = ?
    `;

  // Thực hiện truy vấn với projectID
  db.query(sql, [projectID], (err, results) => {
    if (err) {
      console.error("Error executing SQL query:", err); // Ghi log lỗi
      return res.status(500).json({ error: "Database query error" });
    }
    // Trả về kết quả dưới dạng JSON
    res.json(results);
  });
});

var path = require("path");
module.exports = router;
