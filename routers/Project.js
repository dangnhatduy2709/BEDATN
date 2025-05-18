var router = require("express")();
var db = require("./DBConnect");

router.get("/projectteam/:projectID", (req, res) => {
  const projectId = req.params.projectID;
  const projectTeamQuery = `
    SELECT ProjectTeam.*, TeamMembers.*, Users.picture, Users.fullName, Users.roleID, Teams.teamName
    FROM ProjectTeam
    JOIN TeamMembers ON ProjectTeam.teamID = TeamMembers.teamID
    JOIN Users ON TeamMembers.userID = Users.userID
    JOIN Teams ON TeamMembers.teamID = Teams.teamID
    WHERE ProjectTeam.projectID = ?`;
  db.query(
    projectTeamQuery,
    [projectId],
    (projectTeamErr, projectTeamResult) => {
      try {
        if (projectTeamErr) {
          throw new Error(
            `Lỗi thực hiện truy vấn ProjectTeam: ${projectTeamErr.message}`
          );
        }
        res.json({ projectTeam: projectTeamResult });
      } catch (projectTeamCatchErr) {
        res.status(500).json({
          error: "Lỗi truy vấn ProjectTeam",
          details: projectTeamCatchErr.message,
        });
      }
    }
  );
});

// Thêm dự án
router.post("/add", (req, res) => {
  const {
    projectName,
    projectKey,
    progress,
    createdDate,
    endDate,
    projectDescription,
    clientContactName,
    clientContactEmail,
    clientContactPhone,
    teamID,
    userID,
  } = req.body;
  db.beginTransaction((beginTransactionErr) => {
    try {
      if (beginTransactionErr) {
        throw new Error(
          `Lỗi bắt đầu giao dịch: ${beginTransactionErr.message}`
        );
      }
      const projectQuery = `
        INSERT INTO projects (projectName, projectKey, progress, createdDate, endDate) 
        VALUES ('${projectName}', '${projectKey}', '${progress}','${createdDate}','${endDate}')`;
      db.query(
        projectQuery,
        [projectName, projectKey, progress, createdDate, endDate],
        (projectErr, projectResult) => {
          try {
            if (projectErr) {
              throw new Error(
                `Lỗi thực hiện truy vấn dự án: ${projectErr.message}`
              );
            }
            const projectId = projectResult.insertId;
            const projectDetailsQuery = `
            INSERT INTO projectDetails (projectID, projectDescription, clientContactName, clientContactEmail, clientContactPhone, teamID, userID) 
            VALUES (${projectId},'${projectDescription}','${clientContactName}', '${clientContactEmail}','${clientContactPhone}', '${teamID}', '${userID}')`;
            db.query(
              projectDetailsQuery,
              [
                projectId,
                projectDescription,
                clientContactName,
                clientContactEmail,
                clientContactPhone,
                teamID,
                userID,
              ],
              (detailsErr, projectDetailsResult) => {
                try {
                  if (detailsErr) {
                    throw new Error(
                      `Lỗi thực hiện truy vấn projectDetails: ${detailsErr.message}`
                    );
                  }
                  const projectTeamQuery = `
                INSERT INTO ProjectTeam (projectID, teamID, userID) 
                VALUES (${projectId}, ${teamID}, ${userID})`;
                  db.query(
                    projectTeamQuery,
                    [projectId, teamID, userID],
                    (projectTeamErr, projectTeamResult) => {
                      try {
                        if (projectTeamErr) {
                          throw new Error(
                            `Lỗi thực hiện truy vấn ProjectTeam: ${projectTeamErr.message}`
                          );
                        }
                        db.commit((commitErr) => {
                          try {
                            if (commitErr) {
                              throw new Error(
                                `Lỗi commit giao dịch: ${commitErr.message}`
                              );
                            }
                            res.json({
                              project: projectResult,
                              projectDetails: projectDetailsResult,
                              projectTeam: projectTeamResult,
                            });
                          } catch (commitCatchErr) {
                            db.rollback(() =>
                              res.status(500).json({
                                error: "Lỗi commit giao dịch",
                                details: commitCatchErr.message,
                              })
                            );
                          }
                        });
                      } catch (projectTeamCatchErr) {
                        db.rollback(() =>
                          res.status(500).json({
                            error: "Lỗi thực hiện truy vấn ProjectTeam",
                            details: projectTeamCatchErr.message,
                          })
                        );
                      }
                    }
                  );
                } catch (detailsCatchErr) {
                  db.rollback(() =>
                    res.status(500).json({
                      error: "Lỗi thực hiện truy vấn projectDetails",
                      details: detailsCatchErr.message,
                    })
                  );
                }
              }
            );
          } catch (projectCatchErr) {
            db.rollback(() =>
              res.status(500).json({
                error: "Lỗi thực hiện truy vấn dự án",
                details: projectCatchErr.message,
              })
            );
          }
        }
      );
    } catch (beginTransactionCatchErr) {
      res.status(500).json({
        error: "Lỗi bắt đầu giao dịch",
        details: beginTransactionCatchErr.message,
      });
    }
  });
});

// Lấy danh sách dự án
router.get("/", function (req, res) {
  const query = `
    SELECT projects.*, projectDetails.*,
     user.fullName AS leadFullName ,
     user.picture AS imgUser ,
    team.teamName AS teamFullName
    FROM projects
    LEFT JOIN projectDetails ON projects.projectID = projectDetails.projectID
    LEFT JOIN Users AS user ON projectDetails.userID = user.userID
    LEFT JOIN Teams AS team ON projectDetails.teamID = team.teamID
  `;
  db.query(query, function (err, result) {
    if (err) {
      console.error(err);
      res.status(500).send("Lỗi Server Nội Bộ");
    } else {
      res.status(200).json(result);
    }
  });
});

router.get("/get-project/:id", (req, res) => {
  const projectId = req.params.id;
  const query = `
  SELECT
  p.*,
  pd.*,
  t.teamName AS projectTeamName,
  u.fullName AS projectManagerName
FROM
  Projects p
LEFT JOIN
  ProjectDetails pd ON p.projectID = pd.projectID
LEFT JOIN
  Users u ON pd.userID = u.userID
LEFT JOIN
  Teams t ON pd.teamID = t.teamID
WHERE
  p.projectID = ?;

  `;

  db.query(query, [projectId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(200).json(result);
    }
  });
});

const util = require("util");
const query = util.promisify(db.query).bind(db);

router.delete("/remove/:id", async (req, res) => {
  const projectId = req.params.id;

  try {
    // 1. Lấy danh sách taskID theo projectID
    const tasks = await query("SELECT taskID FROM tasks WHERE projectID = ?", [
      projectId,
    ]);
    const taskIDs = tasks.map((task) => task.taskID);

    if (taskIDs.length > 0) {
      // 2. Xóa taskdetails trước (phụ thuộc vào tasks)
      await query("DELETE FROM taskdetails WHERE taskID IN (?)", [taskIDs]);
      console.log("Đã xóa taskdetails");

      // 3. Xóa tasks
      await query("DELETE FROM tasks WHERE projectID = ?", [projectId]);
      console.log("Đã xóa tasks");
    }

    // 4. Xóa projectDetails
    await query("DELETE FROM projectDetails WHERE projectID = ?", [projectId]);
    console.log("Đã xóa projectDetails");

    // 5. Xóa project
    await query("DELETE FROM projects WHERE projectID = ?", [projectId]);
    console.log("Đã xóa project");

    res
      .status(200)
      .json({ message: "Đã xóa toàn bộ project và dữ liệu liên quan." });
  } catch (error) {
    console.error("Lỗi khi xóa project:", error);
    res
      .status(500)
      .json({ error: "Lỗi khi xóa project", details: error.message });
  }
});

// Sửa thông tin dự án và chi tiết dự án
router.put("/projects/:projectID", async (req, res) => {
  const { projectID } = req.params;
  const {
    projectName,
    projectKey,
    progress,
    createdDate,
    endDate,
    projectDescription,
    clientContactName,
    clientContactEmail,
    clientContactPhone,
    teamID,
    userID,
  } = req.body;
  try {
    await query("START TRANSACTION");
    await query(
      "UPDATE Projects SET projectName=?, projectKey=?, progress=?, createdDate=?, endDate=? WHERE projectID=?",
      [projectName, projectKey, progress, createdDate, endDate, projectID]
    );
    await query(
      "UPDATE ProjectDetails SET projectDescription=?, clientContactName=?, clientContactEmail=?, clientContactPhone=?, teamID=?, userID=? WHERE projectID=?",
      [
        projectDescription,
        clientContactName,
        clientContactEmail,
        clientContactPhone,
        teamID,
        userID,
        projectID,
      ]
    );
    await query("COMMIT");
    res.status(200).json({
      message: "Thông tin dự án và chi tiết dự án đã được cập nhật thành công",
    });
  } catch (error) {
    await query("ROLLBACK");
    console.error("Lỗi cập nhật dự án và chi tiết dự án:", error.message);
    res.status(500).json({
      error: "Lỗi cập nhật dự án và chi tiết dự án",
      details: error.message,
    });
  }
});

// Tìm kiếm project
router.get("/search", async (req, res) => {
  try {
    const searchQuery = req.query.query;
    const [results, fields] = await query(
      `
      SELECT
        Projects.projectID,
        Projects.projectName,
        Projects.projectKey,
        Users.fullName AS projectLeadName,
        Teams.teamName
      FROM
        Projects
      JOIN Users ON Projects.projectLead = Users.userID
      JOIN ProjectTeam ON Projects.projectID = ProjectTeam.projectID
      JOIN Teams ON ProjectTeam.teamID = Teams.teamID
      WHERE
        (Projects.projectName LIKE ? OR
        Users.fullName LIKE ? OR
        Teams.teamName LIKE ?)
    `,
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );

    res.json({ results });
  } catch (error) {
    console.error("Lỗi truy vấn:", error.message);
    res.status(500).json({ error: "Lỗi truy vấn", details: error.message });
  }
});

var path = require("path");
module.exports = router;
