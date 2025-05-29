var router = require("express")();
var db = require("./DBConnect");

// Đăng ký người dùng
const bcrypt = require("bcrypt");
router.post("/register", async (req, res) => {
  try {
    const { picture, fullName, password, emailAddress, phoneNumber, roleID } =
      req.body;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const query =
      "INSERT INTO Users (picture, fullName, passwordHash, emailAddress, phoneNumber, roleID, lastLogin, createdDate) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
    db.query(
      query,
      [picture, fullName, passwordHash, emailAddress, phoneNumber, roleID],
      (err, result) => {
        if (err) {
          console.error("Error executing query:", err);
          res.status(500).json({
            success: false,
            message: "Error executing query",
            details: err.message,
          });
        } else {
          res.json({
            success: true,
            message: "User registered successfully",
            userID: result.insertId,
          });
        }
      }
    );
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({
      success: false,
      message: "Error during registration",
      details: error.message,
    });
  }
});

// Đăng nhập người dùng và tạo token JWT
const jwt = require("jsonwebtoken");
router.post("/login", async (req, res) => {
  try {
    const { emailAddress, password } = req.body;
    const query = "SELECT * FROM Users WHERE emailAddress = ?";
    db.query(query, [emailAddress], async (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({
          success: false,
          message: "Error executing query",
          details: err.message,
        });
      } else {
        if (results.length > 0) {
          const user = results[0];
          const passwordMatch = await bcrypt.compare(
            password,
            user.passwordHash
          );
          if (passwordMatch) {
            const token = jwt.sign(
              { userID: user.userID, emailAddress: user.emailAddress },
              "your-secret-key",
              { expiresIn: "1h" }
            );
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
            res.json({
              success: true,
              message: "Login successful",
              token,
              user: userData,
              userID: user.userID,
            });
          } else {
            res
              .status(401)
              .json({ success: false, message: "Incorrect email or password" });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Incorrect email or password" });
        }
      }
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Error during login",
      details: error.message,
    });
  }
});

router.get("/userLogin/:userID", (req, res) => {
  const userId = req.params.userID;

  const userLoginQuery = `
    SELECT Users.*, Roles.roleName
    FROM Users
    JOIN Roles ON Users.roleID = Roles.roleID
    WHERE Users.userID = ?`;
  db.query(userLoginQuery, [userId], (userLoginErr, userLoginResult) => {
    try {
      if (userLoginErr) {
        throw new Error(
          `Lỗi thực hiện truy vấn UserLogin: ${userLoginErr.message}`
        );
      }
      res.json({ userLogin: userLoginResult });
    } catch (userLoginCatchErr) {
      res.status(500).json({
        error: "Lỗi truy vấn UserLogin",
        details: userLoginCatchErr.message,
      });
    }
  });
});

router.get("/", function (req, res) {
  var query = `
      SELECT Users.*, Roles.roleName 
      FROM Users 
      INNER JOIN Roles ON Users.roleID = Roles.roleID
  `;
  db.query(query, function (err, result) {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/get-user/:id", function (req, res) {
  var query = "select * from Users where userID = " + req.params.id;
  db.query(query, function (err, result) {
    if (err) res.status(500).send("Loi cau lenh truy van");
    res.json(result);
  });
});

router.get("/user/:id/tasks", (req, res) => {
  const query = `
    SELECT 
      t.taskID,
      t.projectID,
      t.taskType,
      t.summary,
      t.status,
      t.createdDate,
      t.endDate,
      t.priority,
      t.description,
      td.taskDescription,
      td.actualHoursSpent,
      t.userID
    FROM Tasks t
    LEFT JOIN TaskDetails td ON t.taskID = td.taskID
    WHERE t.userID = ?`;

  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).send("Lỗi câu lệnh truy vấn");
    }
    res.json(results);
  });
});

// Tạo API để thêm thành viên mới vào nhóm
router.post("/add_team_member", (req, res) => {
  const { teamID, userID, joinDate } = req.body;
  const getRoleQuery = `SELECT u.roleID, r.roleName FROM Users u JOIN Roles r ON u.roleID = r.roleID WHERE u.userID = ${userID}`;
  db.query(getRoleQuery, (roleErr, roleResult) => {
    if (roleErr) {
      console.error("Error executing role query:", roleErr);
      return res
        .status(500)
        .json({ error: "An error occurred while fetching user roles" });
    }
    if (roleResult.length > 0) {
      const { roleID, roleName } = roleResult[0];
      const addMemberQuery = `
              INSERT INTO TeamMembers (teamID, userID, roleID, joinDate)
              VALUES ('${teamID}', '${userID}', '${roleID}', '${joinDate}')`;
      db.query(addMemberQuery, (err, result) => {
        if (err) {
          console.error("Error executing query:", err);
          return res
            .status(500)
            .json({ error: "An error occurred while adding team member" });
        }
        return res.json({
          message: "Team member added successfully",
          roleName,
        });
      });
    } else {
      return res.status(404).json({ error: "User roles not found" });
    }
  });
});

// Xóa thành viên: projectdetails, projectdetailsnew, tasklist -> rồi mới xóa Users
router.delete("/delete_user/:userID", (req, res) => {
  const userID = req.params.userID;

  // 1. Xóa trong bảng tasklist
  const deleteTasklist = "DELETE FROM tasklist WHERE assigneeID = ?";
  db.query(deleteTasklist, [userID], (errTasklist, resultTasklist) => {
    if (errTasklist) {
      console.error("Lỗi khi xóa từ tasklist:", errTasklist);
      return res.status(500).send("Lỗi khi xóa user khỏi tasklist");
    }

    // 2. Xóa trong projectdetails
    const deleteProjectDetails = "DELETE FROM projectdetails WHERE userID = ?";
    db.query(deleteProjectDetails, [userID], (err1, result1) => {
      if (err1) {
        console.error("Lỗi khi xóa từ projectdetails:", err1);
        return res.status(500).send("Lỗi khi xóa user khỏi projectdetails");
      }

      // 3. Xóa trong projectdetailsnew
      const deleteProjectDetailsNew =
        "DELETE FROM projectdetailsnew WHERE userID = ?";
      db.query(deleteProjectDetailsNew, [userID], (err2, result2) => {
        if (err2) {
          console.error("Lỗi khi xóa từ projectdetailsnew:", err2);
          return res
            .status(500)
            .send("Lỗi khi xóa user khỏi projectdetailsnew");
        }

        const deleteTeamMember =
        "DELETE FROM teammembers WHERE userID = ?";
        db.query(deleteTeamMember, [userID], (err3, result3) => {
          if (err3) {
            console.error("Lỗi khi xóa từ teammembers:", err3);
            return res
              .status(500)
              .send("Lỗi khi xóa user khỏi teammembers");
          }
          // 4. Cuối cùng xóa user
          const deleteUser = "DELETE FROM Users WHERE userID = ?";
          db.query(deleteUser, [userID], (err3, result3) => {
            if (err3) {
              console.error("Lỗi khi xóa user:", err3);
              return res.status(500).send("Lỗi khi xóa user khỏi bảng Users");
            }
  
            res.status(200).send("Xóa user thành công");
          });
        })
      });
    });
  });
});

// Xem chi tiết người dùng
router.get("/:userID", async (req, res) => {
  const userID = req.params.userID;

  try {
    const [rows] = await db.promise().query(
      `
      SELECT u.*, r.roleName 
      FROM Users u 
      JOIN Roles r ON u.roleID = r.roleID 
      WHERE u.userID = ?
    `,
      [userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching user details" });
  }
});

// Sửa người dùng
router.put("/:userID", async (req, res) => {
  const { userID } = req.params;
  const {
    picture,
    fullName,
    passwordHash,
    emailAddress,
    phoneNumber,
    roleID,
  } = req.body;
  
  try {
    const [result] = await db.promise().query(
      "UPDATE Users SET picture = ?, fullName = ?, passwordHash = ?, emailAddress = ?, phoneNumber = ?, roleID = ?, lastLogin = ? WHERE userID = ?",
      [
        picture,
        fullName,
        passwordHash,
        emailAddress,
        phoneNumber,
        roleID,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
        userID,
      ]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User not found or already deleted" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the user" });
  }
});

var path = require("path");
module.exports = router;
