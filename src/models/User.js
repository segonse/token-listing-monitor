const db = require("../config/database");

class User {
  static async findAll() {
    try {
      const [users] = await db.query(`
        SELECT u.id, u.user_id, 
          GROUP_CONCAT(DISTINCT us.exchange) as exchanges,
          GROUP_CONCAT(DISTINCT us.token_name) as tokens,
          GROUP_CONCAT(DISTINCT us.project_name) as projects,
          GROUP_CONCAT(DISTINCT us.announcement_type) as types
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id
        GROUP BY u.id, u.user_id
      `);
      return users;
    } catch (error) {
      console.error("获取所有用户失败:", error.message);
      return [];
    }
  }

  static async getSubscriptions(userId) {
    try {
      const [subscriptions] = await db.query(
        `
        SELECT * FROM user_subscriptions 
        WHERE user_id = ?
      `,
        [userId]
      );
      return subscriptions;
    } catch (error) {
      console.error(`获取用户 ${userId} 的订阅失败:`, error.message);
      return [];
    }
  }

  static async checkMatchingSubscription(userId, announcement) {
    try {
      // 获取用户的所有订阅
      const [subscriptions] = await db.query(
        `SELECT us.* FROM user_subscriptions us
        JOIN users u ON us.user_id = u.id
        WHERE u.user_id = ?`,
        [userId]
      );

      if (!subscriptions.length) return false;

      // 如果公告类型为未分类，则不匹配（暂时）
      if (announcement.type === "未分类") return false;

      // 查找与该公告关联的所有代币
      const [associatedTokens] = await db.query(
        `SELECT * FROM tokens WHERE announcement_id = ?`,
        [announcement.id]
      );

      // 检查每个订阅是否匹配当前公告
      for (const sub of subscriptions) {
        const exchangeMatch =
          sub.exchange === "all" || sub.exchange === announcement.exchange;
        const typeMatch =
          sub.announcement_type === "all" ||
          announcement.type.includes(sub.announcement_type);

        // 如果exchange或type不匹配，跳过此订阅
        if (!exchangeMatch || !typeMatch) continue;

        // 检查代币和项目匹配
        if (sub.token_name === "all" || sub.project_name === "all") {
          return true; // 通配符匹配所有
        }

        // 检查标题中是否包含订阅的代币名称或项目名称
        if (
          announcement.title.includes(sub.token_name) ||
          announcement.title.includes(sub.project_name)
        ) {
          return true;
        }

        // 检查关联的代币是否匹配订阅
        for (const token of associatedTokens) {
          if (
            (token.name && token.name === sub.token_name) ||
            (token.project_name && token.project_name === sub.project_name)
          ) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error(`检查用户 ${userId} 订阅匹配失败:`, error.message);
      return false;
    }
  }
}

module.exports = User;
