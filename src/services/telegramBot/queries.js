const db = require("../../config/database");

async function createOrUpdateUser(telegramChatId, telegramUsername) {
  // 检查用户是否已存在
  const [existingUsers] = await db.query(
    "SELECT * FROM users WHERE user_id = ?",
    [`tg_${telegramChatId}`]
  );

  if (existingUsers.length === 0) {
    // 创建新用户
    await db.query(
      "INSERT INTO users (user_id, telegram_id, telegram_username) VALUES (?, ?, ?)",
      [`tg_${telegramChatId}`, telegramChatId, telegramUsername]
    );

    console.log(`新Telegram用户已创建: tg_${telegramChatId}`);
  } else {
    // 更新现有用户的Telegram信息
    await db.query(
      "UPDATE users SET telegram_id = ?, telegram_username = ? WHERE user_id = ?",
      [telegramChatId, telegramUsername, `tg_${telegramChatId}`]
    );

    console.log(`已更新Telegram用户: tg_${telegramChatId}`);
  }

  return true;
}

async function getUserStats(userId) {
  const [users] = await db.query("SELECT * FROM users WHERE user_id = ?", [
    userId,
  ]);

  if (users.length === 0) {
    return null;
  }

  const userInfo = users[0];

  // 获取订阅信息
  const [subscriptions] = await db.query(
    `SELECT * FROM user_subscriptions WHERE user_id = ?`,
    [userInfo.id]
  );

  // 获取系统统计数据
  const [announcementCount] = await db.query(
    "SELECT COUNT(*) as count FROM announcements"
  );

  let statusMessage = "<b>📊 系统状态</b>\n\n";
  statusMessage += `<b>用户ID:</b> ${userId}\n`;
  statusMessage += `<b>已注册:</b> ${new Date(
    userInfo.created_at
  ).toLocaleString("zh-CN")}\n`;
  statusMessage += `<b>订阅数量:</b> ${subscriptions.length}\n`;
  statusMessage += `<b>系统公告总数:</b> ${announcementCount[0].count}\n`;

  return {
    userInfo,
    subscriptions,
    announcementCount: announcementCount[0].count,
    message: statusMessage,
  };
}

async function getExchangesList() {
  const [exchanges] = await db.query(
    "SELECT DISTINCT exchange FROM announcements ORDER BY exchange"
  );
  return exchanges.map((e) => e.exchange);
}

async function getAnnouncementTypes() {
  const [types] = await db.query(
    "SELECT DISTINCT type FROM announcements WHERE type != '未分类' ORDER BY type"
  );
  return types.map((t) => t.type);
}

async function createSubscription(userDbId) {
  await db.query(
    `INSERT IGNORE INTO user_subscriptions 
     (user_id, exchange, token_name, project_name, announcement_type)
     VALUES (?, 'all', 'all', 'all', 'all')`,
    [userDbId]
  );
  return true;
}

module.exports = {
  createOrUpdateUser,
  getUserStats,
  getExchangesList,
  getAnnouncementTypes,
  createSubscription,
};
