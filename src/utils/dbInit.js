const db = require("../config/database");

// 初始化数据库表
const initDatabase = async () => {
  try {
    console.log("开始初始化数据库...");

    // 创建公告表（保持原状，不添加token_name和symbol字段）
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
        symbol VARCHAR(255),
        announcement_id INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL,
        UNIQUE KEY unique_token (name, symbol)
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

    // 创建用户订阅表 - 支持分类订阅
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        exchange VARCHAR(50) NOT NULL,
        announcement_type VARCHAR(50) NOT NULL,
        token_filter VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_active (user_id, is_active),
        INDEX idx_exchange_type (exchange, announcement_type)
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

    // 插入默认的@all用户（用于微信推送）
    await db.query(`
      INSERT IGNORE INTO users (user_id) VALUES ('@all')
    `);

    // 获取@all用户ID
    const [allUserResult] = await db.query(`
      SELECT id FROM users WHERE user_id = '@all'
    `);

    if (allUserResult.length > 0) {
      const allUserId = allUserResult[0].id;

      // 为@all用户添加默认订阅（所有交易所的所有类型，除未分类）
      const defaultSubscriptions = [
        { exchange: "all", announcement_type: "all" },
      ];

      for (const sub of defaultSubscriptions) {
        // 检查是否已存在相同订阅
        const [existing] = await db.query(
          `SELECT id FROM user_subscriptions
           WHERE user_id = ? AND exchange = ? AND announcement_type = ?
           AND token_filter IS NULL`,
          [allUserId, sub.exchange, sub.announcement_type]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO user_subscriptions (user_id, exchange, announcement_type, token_filter)
             VALUES (?, ?, ?, NULL)`,
            [allUserId, sub.exchange, sub.announcement_type]
          );
          console.log(
            `为@all用户创建默认订阅: ${sub.exchange} - ${sub.announcement_type}`
          );
        }
      }
    }

    console.log("数据库初始化完成");
    return true;
  } catch (error) {
    console.error("数据库初始化失败:", error.message);
    return false;
  }
};

module.exports = { initDatabase };
