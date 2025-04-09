const db = require("../config/database");

// 初始化数据库表
const initDatabase = async () => {
  try {
    console.log("开始初始化数据库...");

    // 创建公告表（保持原状，不添加token_name和project_name字段）
    await db.query(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          exchange VARCHAR(50) NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          url VARCHAR(255) NOT NULL,
          publishTime TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_announcement (url, type)
        )
      `);

    // 创建代币表（增加announcement_id字段）
    await db.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        project_name VARCHAR(255),
        announcement_id INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL,
        UNIQUE KEY unique_token (name, project_name)
      )
    `);

    // 创建用户表
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        telegram_id VARCHAR(100) NULL,
        telegram_username VARCHAR(100) NULL
      )
    `);

    // 创建用户订阅表
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        exchange VARCHAR(50) DEFAULT 'all',
        token_name VARCHAR(100) DEFAULT 'all',
        project_name VARCHAR(255) DEFAULT 'all',
        announcement_type VARCHAR(50) DEFAULT 'all',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_subscription (user_id, exchange, token_name, project_name, announcement_type)
      )
    `);

    // 创建已发送通知记录表
    await db.query(`
      CREATE TABLE IF NOT EXISTS sent_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        announcement_id INT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_notification (user_id, announcement_id)
      )
    `);

    // 插入默认的@all用户
    await db.query(`
      INSERT IGNORE INTO users (user_id) VALUES ('@all')
    `);

    // 获取@all用户ID
    const [allUserResult] = await db.query(`
      SELECT id FROM users WHERE user_id = '@all'
    `);

    if (allUserResult.length > 0) {
      const allUserId = allUserResult[0].id;

      // 为@all用户添加全部订阅
      await db.query(
        `
        INSERT IGNORE INTO user_subscriptions (user_id, exchange, token_name, project_name, announcement_type) 
        VALUES (?, 'all', 'all', 'all', 'all')
      `,
        [allUserId]
      );
    }

    console.log("数据库初始化完成");
    return true;
  } catch (error) {
    console.error("数据库初始化失败:", error.message);
    return false;
  }
};

module.exports = { initDatabase };
