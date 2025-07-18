const mysql = require("mysql2/promise");
require("dotenv").config();

// 资金费率数据库配置
const fundingRateDbConfig = {
  host: process.env.FUNDING_RATE_DB_HOST,
  port: parseInt(process.env.FUNDING_RATE_DB_PORT),
  user: process.env.FUNDING_RATE_DB_USER,
  password: process.env.FUNDING_RATE_DB_PASSWORD,
  database: process.env.FUNDING_RATE_DB_NAME,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
};

// 创建连接池
const fundingRatePool = mysql.createPool(fundingRateDbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await fundingRatePool.getConnection();
    console.log("资金费率数据库连接已建立:", connection.threadId);
    connection.release();
    return true;
  } catch (error) {
    console.error("资金费率数据库连接失败:", error.message);
    return false;
  }
}

// 执行查询
async function query(sql, params) {
  try {
    const [results] = await fundingRatePool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("资金费率数据库查询失败:", error.message);
    throw error;
  }
}

module.exports = {
  fundingRatePool,
  testConnection,
  query,
};
