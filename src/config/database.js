const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// 监听连接池事件
pool.on("connection", (connection) => {
  console.log(`数据库连接已建立: ${connection.threadId}`);
});

pool.on("error", (err) => {
  console.error("数据库连接池错误:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("数据库连接丢失，将自动重连");
  }
});

// 优雅关闭连接池
process.on("SIGINT", async () => {
  console.log("正在关闭数据库连接池...");
  try {
    await pool.end();
    console.log("数据库连接池已关闭");
  } catch (error) {
    console.error("关闭数据库连接池时出错:", error.message);
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("正在关闭数据库连接池...");
  try {
    await pool.end();
    console.log("数据库连接池已关闭");
  } catch (error) {
    console.error("关闭数据库连接池时出错:", error.message);
  }
  process.exit(0);
});

module.exports = pool;
