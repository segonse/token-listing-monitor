const db = require("../config/database");

// 初始化数据库表
const initDatabase = async () => {
  try {
    console.log("开始初始化数据库...");

    // 创建代币表
    await db.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    // 创建公告表
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exchange VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL,
        url VARCHAR(255) NOT NULL UNIQUE,
        publishTime TIMESTAMP NOT NULL,
        token_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
      )
    `);

    console.log("数据库初始化完成");
    return true;
  } catch (error) {
    console.error("数据库初始化失败:", error.message);
    return false;
  }
};

module.exports = { initDatabase };
