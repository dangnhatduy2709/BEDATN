const express = require("express");
const router = express.Router();
var db = require("./DBConnect");

// Lấy danh sách team
router.get("/", (req, res) => {
  const query = `
        SELECT 
            Teams.teamID,
            Teams.teamName,
            Teams.createdDate,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'teamMemberID', TeamMembers.teamMemberID,
                    'userID', TeamMembers.userID,
                    'fullName', Users.fullName,
                    'roleID', TeamMembers.roleID,
                    'joinDate', TeamMembers.joinDate
                )
            ) AS members
        FROM Teams
        LEFT JOIN TeamMembers ON Teams.teamID = TeamMembers.teamID
        LEFT JOIN Users ON TeamMembers.userID = Users.userID
        GROUP BY Teams.teamID;
    `;

  db.query(query, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).json(result);
    }
  });
});

//Lấy ra các thành viên trong nhóm
router.get("/team-menber", function (req, res) {
  var query = `
        SELECT 
            Teams.teamID, 
            Teams.teamName, 
            Teams.createdDate,
            TeamMembers.teamMemberID,
            Users.userID,
            Users.fullName,
            TeamMembers.roleID,
            TeamMembers.joinDate
        FROM Teams
        LEFT JOIN TeamMembers ON Teams.teamID = TeamMembers.teamID
        LEFT JOIN Users ON TeamMembers.userID = Users.userID
        WHERE Teams.isDeleted = 0`;

  db.query(query, function (err, result) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).json(result);
      console.log(result);
    }
  });
});

router.get("/getUserByProject/:userId", function (req, res) {
  const userId = req.params.userId;

     var query = `
        SELECT COUNT(DISTINCT TeamMembers.teamID) AS teamCount FROM TeamMembers where TeamMembers.userID = ${userId}`;

  db.query(query, function (err, result) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).json(result);
      console.log(result);
    }
  });
});

// Xóa thành viên khỏi nhóm
router.delete("/team-member/:teamMemberID", function (req, res) {
  const teamMemberID = req.params.teamMemberID;

  if (!teamMemberID) {
    return res.status(400).send("Missing teamMemberID parameter");
  }

  const query = `
    DELETE FROM TeamMembers 
    WHERE teamMemberID = ?
  `;

  db.query(query, [teamMemberID], function (err, result) {
    if (err) {
      return res.status(500).send(err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Team member not found");
    }

    res.status(200).send("Team member deleted successfully");
  });
});

// Tạo API để thêm thành viên mới vào nhóm
router.post("/add_team_member", async (req, res) => {
  const { teamID, userIDs, joinDate } = req.body;

  try {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    const addUserPromises = userIDs.map(userID => {
      return new Promise((resolve, reject) => {
        const getRoleQuery = `
          SELECT u.roleID, r.roleName 
          FROM Users u 
          JOIN Roles r ON u.roleID = r.roleID 
          WHERE u.userID = ?`;

        db.query(getRoleQuery, [userID], (roleErr, roleResult) => {
          if (roleErr) return reject("Error fetching role for userID: " + userID);

          if (roleResult.length === 0) return reject("Role not found for userID: " + userID);

          const { roleID, roleName } = roleResult[0];

          const addMemberQuery = `
            INSERT INTO TeamMembers (teamID, userID, roleID, joinDate, create_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`;

          db.query(
            addMemberQuery,
            [teamID, userID, roleID, joinDate, now, now],
            (insertErr, result) => {
              if (insertErr) return reject("Insert failed for userID: " + userID);

              resolve({ userID, roleName });
            }
          );
        });
      });
    });

    const results = await Promise.all(addUserPromises);

    res.json({
      message: "All team members added successfully",
      members: results,
    });

  } catch (error) {
    console.error("Error adding team members:", error);
    res.status(500).json({ error: error.toString() });
  }
});

router.post("/add_team", (req, res) => {
  const { teamName } = req.body;
  const createdDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const sql = "INSERT INTO Teams (teamName, createdDate) VALUES (?, ?)";

  db.query(sql, [teamName, createdDate], (err, result) => {
    if (err) {
      console.error("Error adding team:", err);
      res.status(500).send("Error adding team");
      return;
    }
    res.status(200).send("Team added successfully");
  });
});

router.delete("/delete_team/:teamId", (req, res) => {
  const teamId = req.params.teamId;
  const sql = "DELETE FROM Teams WHERE teamID = ?";

  db.query(sql, [teamId], (err, result) => {
    if (err) {
      console.error("Error deleting team:", err);
      res.status(500).send("Error deleting team");
      return;
    }
    res.status(200).send("Team deleted successfully");
  });
});

// Sửa team
router.put("/:teamID", async (req, res) => {
  const { teamID } = req.params;
  const { teamName, createdDate } = req.body;

  try {
    const [result] = await db
      .promise()
      .query(
        "UPDATE Teams SET teamName = ?, createdDate = ? WHERE teamID = ?",
        [teamName, createdDate, teamID]
      );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Team not found or already deleted" });
    }

    res.status(200).json({ message: "Team updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the team" });
  }
});

var path = require("path");
module.exports = router;
