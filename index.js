
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const db = require("./DB/db.js");
const admin_router = require("./routes/admin_routes.js");
const teachers_router = require("./routes/teachers_routes.js");
const students_router = require("./routes/students_routes.js");


// const conn = require("./conn/conn");
require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.use(express.json());
app.use(cookieParser());
app.use(helmet())

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const port = 3000;

app.use("/api/admin/", admin_router);
app.use("/api/teachers/", teachers_router);
app.use("/api/students/", students_router);


app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
