var router = require('express')();
var db = require('../database/DBConnect');


router.get('/projectteam/:projectID', (req, res) => {
  const projectId = req.params.projectID;
  const projectTeamQuery = `
    SELECT ProjectTeam.*, TeamMembers.*, Users.picture, Users.fullName, Users.roleID, Team.teamName
    FROM ProjectTeam
    JOIN TeamMembers ON ProjectTeam.teamID = TeamMembers.teamID
    JOIN Users ON TeamMembers.userID = Users.userID
    JOIN Team ON TeamMembers.teamID = Team.teamID
    WHERE ProjectTeam.projectID = ?`;
  db.query(projectTeamQuery, [projectId], (projectTeamErr, projectTeamResult) => {
    try {
      if (projectTeamErr) {
        throw new Error(`Lỗi thực hiện truy vấn ProjectTeam: ${projectTeamErr.message}`);
      }
      res.json({ projectTeam: projectTeamResult });
    } catch (projectTeamCatchErr) {
      res.status(500).json({ error: 'Lỗi truy vấn ProjectTeam', details: projectTeamCatchErr.message });
    }
  });
});

// Thêm dự án
router.post('/add', (req, res) => {
  const { projectName, projectKey, progress, createdDate, endDate, projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID } = req.body;
  db.beginTransaction((beginTransactionErr) => {
    try {
      if (beginTransactionErr) {
        throw new Error(`Lỗi bắt đầu giao dịch: ${beginTransactionErr.message}`);
      }
      const projectQuery = `
        INSERT INTO project (projectName, projectKey, progress, createdDate, endDate) 
        VALUES ('${projectName}', '${projectKey}', '${progress}','${createdDate}','${endDate}')`;
      db.query(projectQuery, [projectName, projectKey, progress, createdDate, endDate], (projectErr, projectResult) => {
        try {
          if (projectErr) {
            throw new Error(`Lỗi thực hiện truy vấn dự án: ${projectErr.message}`);
          }
          const projectId = projectResult.insertId;
          const projectDetailsQuery = `
            INSERT INTO projectDetails (projectID, projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID) 
            VALUES (${projectId},'${projectDescription}','${clientContactName}', '${clientContactEmail}','${clientContactPhone}', '${teamID}', '${userID}')`;
          db.query(projectDetailsQuery, [projectId, projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID], (detailsErr, projectDetailsResult) => {
            try {
              if (detailsErr) {
                throw new Error(`Lỗi thực hiện truy vấn projectDetails: ${detailsErr.message}`);
              }
              const projectTeamQuery = `
                INSERT INTO ProjectTeam (projectID, teamID, userID) 
                VALUES (${projectId}, ${teamID}, ${userID})`;
              db.query(projectTeamQuery, [projectId, teamID, userID], (projectTeamErr, projectTeamResult) => {
                try {
                  if (projectTeamErr) {
                    throw new Error(`Lỗi thực hiện truy vấn ProjectTeam: ${projectTeamErr.message}`);
                  }
                  db.commit((commitErr) => {
                    try {
                      if (commitErr) {
                        throw new Error(`Lỗi commit giao dịch: ${commitErr.message}`);
                      }
                      res.json({
                        project: projectResult,
                        projectDetails: projectDetailsResult,
                        projectTeam: projectTeamResult
                      });
                    } catch (commitCatchErr) {
                      db.rollback(() => res.status(500).json({ error: 'Lỗi commit giao dịch', details: commitCatchErr.message }));
                    }
                  });
                } catch (projectTeamCatchErr) {
                  db.rollback(() => res.status(500).json({ error: 'Lỗi thực hiện truy vấn ProjectTeam', details: projectTeamCatchErr.message }));
                }
              });
            } catch (detailsCatchErr) {
              db.rollback(() => res.status(500).json({ error: 'Lỗi thực hiện truy vấn projectDetails', details: detailsCatchErr.message }));
            }
          });
        } catch (projectCatchErr) {
          db.rollback(() => res.status(500).json({ error: 'Lỗi thực hiện truy vấn dự án', details: projectCatchErr.message }));
        }
      });
    } catch (beginTransactionCatchErr) {
      res.status(500).json({ error: 'Lỗi bắt đầu giao dịch', details: beginTransactionCatchErr.message });
    }
  });
});

// Lấy danh sách dự án
router.get('/', function(req, res) {
  const query = `
    SELECT project.*, projectDetails.*,
     user.fullName AS leadFullName ,
     user.picture AS imgUser ,
    team.teamName AS teamFullName
    FROM project
    LEFT JOIN projectDetails ON project.projectID = projectDetails.projectID
    LEFT JOIN Users AS user ON projectDetails.userID = user.userID
    LEFT JOIN Team AS team ON projectDetails.teamID = team.teamID
  `;
  db.query(query, function(err, result) {
      if (err) {
          console.error(err);
          res.status(500).send("Lỗi Server Nội Bộ");
      } else {
          res.status(200).json(result);
      }
  });
});

router.get('/get-project/:id', (req, res) => {
  const projectId = req.params.id;
  const query = `
  SELECT
  p.*,
  pd.*,
  u.fullName AS projectManagerName
FROM
  Project p
LEFT JOIN
  ProjectDetails pd ON p.projectID = pd.projectID
LEFT JOIN
  Users u ON pd.userID = u.userID
WHERE
  p.projectID = ?;

  `;

  db.query(query, [projectId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});

// Xóa danh sách
const util = require('util');
const query = util.promisify(db.query).bind(db);
router.delete('/remove/:id', async (req, res) => {
  const projectId = req.params.id;
  try {
    const result1 = await query("DELETE FROM project WHERE projectID = ?", [projectId]);
    console.log('Deleted from project:', result1);
    const result2 = await query("DELETE FROM projectDetails WHERE projectID = ?", [projectId]);
    console.log('Deleted from projectDetails:', result2);
    res.status(200).json({ message: 'Đã xóa dự án và chi tiết của dự án' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Lỗi xóa dự án', details: error.message });
  }
});

// Sửa thông tin dự án và chi tiết dự án
router.put('/projects/:projectID', async (req, res) => {
  const { projectID } = req.params;
  const { projectName, projectKey, progress, createdDate, endDate, projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID } = req.body;
  try {
    await query('START TRANSACTION');
    await query(
      'UPDATE Project SET projectName=?, projectKey=?, progress=?, createdDate=?, endDate=? WHERE projectID=?',
      [projectName, projectKey, progress, createdDate, endDate, projectID]
    );
    await query(
      'UPDATE ProjectDetails SET projectDescription=?, clientContactName=?, clientContactEmail=?, clientContactPhone=?, teamID=?, userID=? WHERE projectID=?',
      [projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID, projectID]
    );
    await query('COMMIT');
    res.status(200).json({ message: 'Thông tin dự án và chi tiết dự án đã được cập nhật thành công' });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Lỗi cập nhật dự án và chi tiết dự án:', error.message);
    res.status(500).json({ error: 'Lỗi cập nhật dự án và chi tiết dự án', details: error.message });
  }
});

// Tìm kiếm project
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.query;
    const [results, fields] = await query(`
      SELECT
        Project.projectID,
        Project.projectName,
        Project.projectKey,
        Users.fullName AS projectLeadName,
        Team.teamName
      FROM
        Project
      JOIN Users ON Project.projectLead = Users.userID
      JOIN ProjectTeam ON Project.projectID = ProjectTeam.projectID
      JOIN Team ON ProjectTeam.teamID = Team.teamID
      WHERE
        (Project.projectName LIKE ? OR
        Users.fullName LIKE ? OR
        Team.teamName LIKE ?)
        AND Project.isDeleted = 0
    `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

    res.json({ results });
  } catch (error) {
    console.error('Lỗi truy vấn:', error.message);
    res.status(500).json({ error: 'Lỗi truy vấn', details: error.message });
  }
});



var path = require('path');
module.exports = router;