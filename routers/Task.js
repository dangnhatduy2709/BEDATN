var router = require('express')();
var db = require('../database/DBConnect');
const exceljs = require('exceljs');


// Lấy danh sách công việc
router.get('/', function (req, res) {
    var query = 
    "SELECT Task.*, Project.projectName, Users.fullName " +
    "FROM Task " +
    "JOIN Project ON Task.projectID = Project.projectID " +
    "JOIN Users ON Task.userID = Users.userID";
    db.query(query, function (err, result) {
        if (err) throw err;
        res.status(200).json(result);
    });
});
  
// Lấy ra công việc của dự án
router.get('/:projectId', (req, res) => {
    const projectId = req.params.projectId;
  
    const query = `
      SELECT taskID
      FROM Task
      WHERE projectID = ?;
    `;
  
    connection.query(query, [projectId], (error, results) => {
      if (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const taskIDs = results.map((result) => result.taskID);
        res.status(200).json({ taskIDs });
      }
    });
  });

//Lấy công việc liên quan đến dự án
router.get('/tasks/:id', (req, res) => {
  const projectId = req.params.id;

  const query = `
    SELECT
      p.*,
      pd.*,
      t.*,
      td.*,
      u.fullName
    FROM
      Project p
    LEFT JOIN
      ProjectDetails pd ON p.projectID = pd.projectID
    LEFT JOIN
      Task t ON p.projectID = t.projectID
    LEFT JOIN
      TaskDetails td ON t.taskID = td.taskID
    LEFT JOIN
      Users u ON pd.userID = u.userID
    WHERE
      p.projectID = ?;
  `;

  db.query(query, [projectId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    } else {
      res.status(200).json(result);
    }
  });
});

// Sửa dánh sách công việc
router.put('/updatetask/:id', (req, res) => {
  const taskId = req.params.id;
  const updatedData = req.body;

  const updateTaskQuery = `
    UPDATE Task
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
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
      } else {
        res.status(200).json({ message: 'Cập nhật trạng thái công việc thành công' });
      }
    }
  );
});

// Xóa công việc từ cả hai bảng Task và TaskDetails
router.delete('/deletetask/:id', (req, res) => {
  const taskId = req.params.id;
  const deleteTaskDetailsQuery = `
    DELETE FROM TaskDetails
    WHERE taskID = ?;
  `;

  db.query(deleteTaskDetailsQuery, [taskId], (errTaskDetails, resultTaskDetails) => {
    if (errTaskDetails) {
      console.error(errTaskDetails);
      res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi xóa TaskDetails' });
    } else {
      const deleteTaskQuery = `
        DELETE FROM Task
        WHERE taskID = ?;
      `;
      db.query(deleteTaskQuery, [taskId], (errTask, resultTask) => {
        if (errTask) {
          console.error(errTask);
          res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi xóa Task' });
        } else {
          res.status(200).json({ message: 'Xóa công việc thành công' });
        }
      });
    }
  });
});


//Thêm công việc
router.post('/addtask', (req, res) => {
  const taskData = req.body;

  const insertTaskQuery = `
    INSERT INTO Task (projectID, taskType, summary, userID, status, createdDate, endDate, priority, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  db.query(
    insertTaskQuery,
    [
      taskData.projectID,
      taskData.taskType,
      taskData.summary,
      taskData.userID,
      taskData.status,
      taskData.createdDate,
      taskData.endDate,
      taskData.priority,
      taskData.description,
    ],
    (errTask, resultTask) => {
      if (errTask) {
        console.error(errTask);
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi thêm công việc' });
      } else {
        const insertedTaskId = resultTask.insertId;

        const insertTaskDetailsQuery = `
          INSERT INTO TaskDetails (taskID, taskDescription, actualHoursSpent, taskManagerID)
          VALUES (?, ?, ?, ?);
        `;

        db.query(
          insertTaskDetailsQuery,
          [insertedTaskId, taskData.taskDescription, taskData.actualHoursSpent, taskData.taskManagerID],
          (errTaskDetails, resultTaskDetails) => {
            if (errTaskDetails) {
              console.error(errTaskDetails);
              res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi thêm chi tiết công việc' });
            } else {
              res.status(201).json({ message: 'Thêm công việc thành công' });
            }
          }
        );
      }
    }
  );
});


// Tạo API để lấy thông tin công việc dựa trên ID
router.get('/gettaskbyid/:id', (req, res) => {
  const taskId = req.params.id;

  const query = `
    SELECT Task.*, TaskDetails.taskDescription, TaskDetails.actualHoursSpent, Users.fullName AS taskManagerName
    FROM Task
    LEFT JOIN TaskDetails ON Task.taskID = TaskDetails.taskID
    LEFT JOIN Users ON TaskDetails.taskManagerID = Users.userID
    WHERE Task.taskID = ?;
  `;

  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (result.length === 0) {
        res.status(404).json({ error: 'Không tìm thấy công việc với ID cung cấp' });
      } else {
        res.status(200).json(result[0]);
      }
    }
  });
});

router.put('/edittaskanddetails/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  const updatedTaskData = req.body;

  // Sửa công việc
  const updateTaskQuery = `
    UPDATE Task
    SET status = ?
    WHERE taskID = ?;
  `;

  db.beginTransaction((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi bắt đầu transaction' });
    }

    // Sửa công việc
    db.query(
      updateTaskQuery,
      [
        updatedTaskData.status,
        taskId,
      ],
      (errTask, resultTask) => {
        if (errTask) {
          console.error(errTask);
          return db.rollback(() => {
            res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi sửa công việc' });
          });
        }

        db.commit((commitErr) => {
          if (commitErr) {
            console.error(commitErr);
            return db.rollback(() => {
              res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi commit transaction' });
            });
          }

          res.status(200).json({ message: 'Sửa trạng thái công việc thành công' });
        });
      }
    );
  });
});


router.get('/api/downloadExcel', async (req, res) => {
  try {
    // Thực hiện truy vấn để lấy dữ liệu từ cả hai bảng công việc và chi tiết công việc
    const [rows] = await db.promise().execute(`
      SELECT 
        Task.*,
        TaskDetails.*
      FROM 
        Task
      JOIN 
        TaskDetails ON Task.taskID = TaskDetails.taskID;
    `);
    
    // Kiểm tra xem có dữ liệu không
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Tạo workbook và worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');

    // Lấy tên cột từ thông tin trường trong dữ liệu
    const columns = Object.keys(rows[0]);

    // Định nghĩa các cột
    worksheet.columns = columns.map(column => ({ header: column, key: column, width: 20 }));

    // Thêm dữ liệu vào worksheet
    worksheet.addRows(rows);

    // Thiết lập header cho response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.xlsx');

    // Ghi workbook vào response và kết thúc response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download Excel Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


var path = require('path');
module.exports = router;