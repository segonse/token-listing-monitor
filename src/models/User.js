const db = require("../config/database");

class User {
  static async findAll() {
    try {
      const [users] = await db.query(`
        SELECT u.id, u.user_id, u.telegram_id, u.telegram_username,
          GROUP_CONCAT(DISTINCT us.exchange) as exchanges,
          GROUP_CONCAT(DISTINCT us.token_name) as tokens,
          GROUP_CONCAT(DISTINCT us.symbol) as symbols,
          GROUP_CONCAT(DISTINCT us.announcement_type) as types
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id
        GROUP BY u.id, u.user_id, u.telegram_id, u.telegram_username
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
      // 使用新的订阅服务检查匹配
      const SubscriptionService = require("../services/subscriptionService");

      // 获取用户数据库ID
      const [users] = await db.query("SELECT id FROM users WHERE user_id = ?", [
        userId,
      ]);

      if (users.length === 0) return false;

      return await SubscriptionService.checkAnnouncementMatch(
        users[0].id,
        announcement
      );
    } catch (error) {
      console.error(`检查用户 ${userId} 订阅匹配失败:`, error.message);
      return false;
    }
  }
}

module.exports = User;
