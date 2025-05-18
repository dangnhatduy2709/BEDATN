const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const ExcelJS = require("exceljs");
const connection = require("./routers/DBConnect");

app.use(morgan("dev"));
const port = 3000;
app.use(cors());
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

var projectRouter = require("./routers/Project");
app.use("/project", projectRouter);

var taskRouter = require("./routers/Task");
app.use("/task", taskRouter);

var userRouter = require("./routers/User");
app.use("/user", userRouter);

var teamRouter = require("./routers/team");
app.use("/team", teamRouter);

var rolesRouter = require("./routers/Roles");
app.use("/roles", rolesRouter);

var commentRouter = require("./routers/Comment");
app.use("/comment", commentRouter);

var notificationsRouter = require("./routers/notifications");
app.use("/notifications", notificationsRouter);

var backlogRouter = require("./routers/backlog");
app.use("/backlog", backlogRouter);
connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
