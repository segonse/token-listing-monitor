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
  acquireTimeout: 60000, // 60秒获取连接超时
  timeout: 60000, // 60秒查询超时
  reconnect: true, // 自动重连
  idleTimeout: 300000, // 5分钟空闲超时
  maxIdle: 10, // 最大空闲连接数
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
  await pool.end();
  console.log("数据库连接池已关闭");
});

process.on("SIGTERM", async () => {
  console.log("正在关闭数据库连接池...");
  await pool.end();
  console.log("数据库连接池已关闭");
});

module.exports = pool;
