
const mysql = require('mysql2/promise');
require("dotenv").config();

// Create a connection for the ai-bots database
const db = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.pass,
  database: process.env.dbname,
});

db.getConnection()
  .then(() => console.log('Connected to the database!'))
  .catch(err => console.error('Error connecting to the database:', err));


module.exports = db;
