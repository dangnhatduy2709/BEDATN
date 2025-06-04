var router = require("express")();
var db = require("./DBConnect");
const exceljs = require("exceljs");

// Lấy danh sách công việc
router.get("/", function (req, res) {
  var query =
    "SELECT Tasks.*, Projects.projectName, Users.fullName " +
    "FROM Tasks " +
    "JOIN Projects ON Tasks.projectID = Projects.projectID " +
    "JOIN Users ON Tasks.userID = Users.userID";
  db.query(query, function (err, result) {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/thongke", (req, res) => {
  var query = `SELECT * FROM Tasks`;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Lỗi truy vấn MySQL:", err);
      return res.status(500).json({ message: "Lỗi máy chủ", error: err });
    }
    res.status(200).json(result);
  });
});

// Lấy ra công việc của dự án
router.get("/:projectId", (req, res) => {
  const projectId = req.params.projectId;

  const query = `
      SELECT taskID
      FROM Tasks
      WHERE projectID = ?;
    `;

  db.query(query, [projectId], (error, results) => {
    if (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const taskIDs = results.map((result) => result.taskID);
      res.status(200).json({ taskIDs });
    }
  });
});

//Lấy công việc liên quan đến dự án
router.get("/tasks/:id", (req, res) => {
  const projectId = req.params.id;

  const query = `
    SELECT
      p.*,
      pd.*,
      t.*,
      td.*,
      u.*,
      f.*
    FROM
      Projects p
    LEFT JOIN
      ProjectDetails pd ON p.projectID = pd.projectID
    LEFT JOIN
      Tasks t ON p.projectID = t.projectID
    LEFT JOIN
      TaskDetails td ON t.taskID = td.taskID
    LEFT JOIN
      Users u ON pd.userID = u.userID
    LEFT JOIN
      Teams f ON pd.teamID = f.teamID
    WHERE
      p.projectID = ?;
  `;

  db.query(query, [projectId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    } else {
      res.status(200).json(result);
    }
  });
});

// Sửa dánh sách công việc
router.put("/updatetask/:id", (req, res) => {
  const taskId = req.params.id;
  const updatedData = req.body;

  const updateTaskQuery = `
    UPDATE Tasks
    SET
      status = ?
    WHERE taskID = ?;
  `;

  db.query(
    updateTaskQuery,
    [updatedData.status, taskId],
    (errTask, resultTask) => {
      if (errTask) {
        console.error(errTask);
        res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
      } else {
        res
          .status(200)
          .json({ message: "Cập nhật trạng thái công việc thành công" });
      }
    }
  );
});

// Xóa công việc từ cả hai bảng Task và TaskDetails
router.delete("/deletetask/:id", (req, res) => {
  const taskId = req.params.id;
  const deleteTaskDetailsQuery = `
    DELETE FROM TaskDetails
    WHERE taskID = ?;
  `;

  db.query(
    deleteTaskDetailsQuery,
    [taskId],
    (errTaskDetails, resultTaskDetails) => {
      if (errTaskDetails) {
        console.error(errTaskDetails);
        res
          .status(500)
          .json({ error: "Lỗi máy chủ nội bộ khi xóa TaskDetails" });
      } else {
        const deleteTaskQuery = `
        DELETE FROM Tasks
        WHERE taskID = ?;
      `;
        db.query(deleteTaskQuery, [taskId], (errTask, resultTask) => {
          if (errTask) {
            console.error(errTask);
            res.status(500).json({ error: "Lỗi máy chủ nội bộ khi xóa Task" });
          } else {
            res.status(200).json({ message: "Xóa công việc thành công" });
          }
        });
      }
    }
  );
});

//Thêm công việc
router.post("/addtask", (req, res) => {
  const taskData = req.body;

  const insertTaskQuery = `
    INSERT INTO Tasks (projectID, taskType, summary, userID, status, createdDate, endDate, priority, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  db.query(
    insertTaskQuery,
    [
      taskData.projectID,
      taskData.taskType,
      taskData.summary,
      taskData.taskManagerID,
      taskData.status,
      taskData.createdDate,
      taskData.endDate,
      taskData.priority,
      taskData.description,
    ],
    (errTask, resultTask) => {
      if (errTask) {
        console.error(errTask);
        res
          .status(500)
          .json({ error: "Lỗi máy chủ nội bộ khi thêm công việc" });
      } else {
        const insertedTaskId = resultTask.insertId;

        const insertTaskDetailsQuery = `
          INSERT INTO TaskDetails (taskID, taskDescription, actualHoursSpent, taskManagerID)
          VALUES (?, ?, ?, ?);
        `;

        db.query(
          insertTaskDetailsQuery,
          [
            insertedTaskId,
            taskData.taskDescription,
            taskData.actualHoursSpent,
            taskData.taskManagerID,
          ],
          (errTaskDetails, resultTaskDetails) => {
            if (errTaskDetails) {
              console.error(errTaskDetails);
              res.status(500).json({
                error: "Lỗi máy chủ nội bộ khi thêm chi tiết công việc",
              });
            } else {
              res.status(201).json({ message: "Thêm công việc thành công" });
            }
          }
        );
      }
    }
  );
});

// Tạo API để lấy thông tin công việc dựa trên ID
router.get("/gettaskbyid/:id", (req, res) => {
  const taskId = req.params.id;

  const query = `
    SELECT Tasks.*, TaskDetails.taskDescription, TaskDetails.actualHoursSpent, Users.fullName AS taskManagerName
    FROM Tasks
    LEFT JOIN TaskDetails ON Tasks.taskID = TaskDetails.taskID
    LEFT JOIN Users ON TaskDetails.taskManagerID = Users.userID
    WHERE Tasks.taskID = ?;
  `;

  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (result.length === 0) {
        res
          .status(404)
          .json({ error: "Không tìm thấy công việc với ID cung cấp" });
      } else {
        res.status(200).json(result[0]);
      }
    }
  });
});

router.put("/edittaskanddetails/:taskId", (req, res) => {
  const taskId = req.params.taskId;
  const updatedTaskData = req.body;

  // Sửa công việc
  const updateTaskQuery = `
    UPDATE Tasks
    SET status = ?
    WHERE taskID = ?;
  `;

  db.beginTransaction((err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Lỗi máy chủ nội bộ khi bắt đầu transaction" });
    }

    // Sửa công việc
    db.query(
      updateTaskQuery,
      [updatedTaskData.status, taskId],
      (errTask, resultTask) => {
        if (errTask) {
          console.error(errTask);
          return db.rollback(() => {
            res
              .status(500)
              .json({ error: "Lỗi máy chủ nội bộ khi sửa công việc" });
          });
        }

        db.commit((commitErr) => {
          if (commitErr) {
            console.error(commitErr);
            return db.rollback(() => {
              res
                .status(500)
                .json({ error: "Lỗi máy chủ nội bộ khi commit transaction" });
            });
          }

          res
            .status(200)
            .json({ message: "Sửa trạng thái công việc thành công" });
        });
      }
    );
  });
});

router.get("/api/downloadExcel", async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT 
        Tasks.*,
        TaskDetails.*
      FROM 
        Tasks
      JOIN 
        TaskDetails ON Tasks.taskID = TaskDetails.taskID;
    `);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");
    const columns = Object.keys(rows[0]);
    worksheet.columns = columns.map((column) => ({
      header: column,
      key: column,
      width: 20,
    }));
    worksheet.addRows(rows);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=tasks.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Download Excel Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

router.put("/updatetaskdata/:taskID", (req, res) => {
  const taskID = req.params.taskID;
  const taskData = req.body;
  const updateTaskQuery = `
    UPDATE Tasks
    SET projectID = ?, taskType = ?, summary = ?, userID = ?, status = ?, createdDate = ?, endDate = ?, priority = ?, description = ?
    WHERE taskID = ?;
  `;

  db.query(
    updateTaskQuery,
    [
      taskData.projectID,
      taskData.taskType,
      taskData.summary,
      taskData.taskManagerID,
      taskData.status,
      formatDateForMySQL(taskData.createdDate),
      formatDateForMySQL(taskData.endDate),
      taskData.priority,
      taskData.description,
      taskID,
    ],
    (errTask, resultTask) => {
      if (errTask) {
        console.error(errTask);
        res.status(500).json({ error: "Lỗi máy chủ khi cập nhật công việc" });
      } else {
        const updateTaskDetailsQuery = `
          UPDATE TaskDetails
          SET taskDescription = ?, actualHoursSpent = ?, taskManagerID = ?
          WHERE taskID = ?;
        `;

        db.query(
          updateTaskDetailsQuery,
          [
            taskData.taskDescription,
            taskData.actualHoursSpent,
            taskData.taskManagerID,
            taskID,
          ],
          (errDetails, resultDetails) => {
            if (errDetails) {
              console.error(errDetails);
              res.status(500).json({ error: "Lỗi khi cập nhật chi tiết công việc" });
            } else {
              res.status(200).json({ message: "Cập nhật công việc thành công" });
            }
          }
        );
      }
    }
  );
});

function formatDateForMySQL(dateString) {
  const d = new Date(dateString);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

var path = require("path");
module.exports = router;
