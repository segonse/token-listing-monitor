const db = require("../config/database");

class SubscriptionService {
  /**
   * 获取用户的所有订阅
   * @param {number} userId - 用户数据库ID
   * @returns {Promise<Array>} 订阅列表
   */
  static async getUserSubscriptions(userId) {
    try {
      const [subscriptions] = await db.query(
        `SELECT * FROM user_subscriptions 
         WHERE user_id = ? AND is_active = TRUE 
         ORDER BY exchange, announcement_type, token_filter`,
        [userId]
      );
      return subscriptions;
    } catch (error) {
      console.error("获取用户订阅失败:", error.message);
      return [];
    }
  }

  /**
   * 添加订阅
   * @param {number} userId - 用户数据库ID
   * @param {string} exchange - 交易所
   * @param {string} announcementType - 公告类型
   * @param {string|null} tokenFilter - 代币筛选（可选）
   * @returns {Promise<boolean>} 是否成功
   */
  static async addSubscription(
    userId,
    exchange,
    announcementType,
    tokenFilter = null
  ) {
    try {
      // 检查是否已存在相同订阅
      const [existing] = await db.query(
        `SELECT id FROM user_subscriptions 
         WHERE user_id = ? AND exchange = ? AND announcement_type = ? 
         AND (token_filter = ? OR (token_filter IS NULL AND ? IS NULL))`,
        [userId, exchange, announcementType, tokenFilter, tokenFilter]
      );

      if (existing.length > 0) {
        // 如果存在但被禁用，则重新激活
        await db.query(
          `UPDATE user_subscriptions SET is_active = TRUE, updated_at = NOW() 
           WHERE id = ?`,
          [existing[0].id]
        );
        return true;
      }

      // 创建新订阅
      await db.query(
        `INSERT INTO user_subscriptions (user_id, exchange, announcement_type, token_filter) 
         VALUES (?, ?, ?, ?)`,
        [userId, exchange, announcementType, tokenFilter]
      );
      return true;
    } catch (error) {
      console.error("添加订阅失败:", error.message);
      return false;
    }
  }

  /**
   * 删除订阅
   * @param {number} userId - 用户数据库ID
   * @param {number} subscriptionId - 订阅ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async removeSubscription(userId, subscriptionId) {
    try {
      const [result] = await db.query(
        `UPDATE user_subscriptions SET is_active = FALSE, updated_at = NOW() 
         WHERE id = ? AND user_id = ?`,
        [subscriptionId, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("删除订阅失败:", error.message);
      return false;
    }
  }

  /**
   * 批量添加订阅（使用事务保护）
   * @param {number} userId - 用户数据库ID
   * @param {Array} subscriptions - 订阅数组 [{exchange, announcementType, tokenFilter}]
   * @returns {Promise<boolean>} 是否成功
   */
  static async addBatchSubscriptions(userId, subscriptions) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      let successCount = 0;

      for (const sub of subscriptions) {
        // 检查是否已存在相同订阅
        const [existing] = await connection.query(
          `SELECT id FROM user_subscriptions
           WHERE user_id = ? AND exchange = ? AND announcement_type = ?
           AND (token_filter = ? OR (token_filter IS NULL AND ? IS NULL))`,
          [
            userId,
            sub.exchange,
            sub.announcementType,
            sub.tokenFilter,
            sub.tokenFilter,
          ]
        );

        if (existing.length > 0) {
          // 如果存在但被禁用，则重新激活
          await connection.query(
            `UPDATE user_subscriptions SET is_active = TRUE, updated_at = NOW()
             WHERE id = ?`,
            [existing[0].id]
          );
        } else {
          // 创建新订阅
          await connection.query(
            `INSERT INTO user_subscriptions (user_id, exchange, announcement_type, token_filter)
             VALUES (?, ?, ?, ?)`,
            [userId, sub.exchange, sub.announcementType, sub.tokenFilter]
          );
        }

        successCount++;
      }

      await connection.commit();
      console.log(`成功批量添加 ${successCount} 个订阅`);
      return true;
    } catch (error) {
      await connection.rollback();
      console.error("批量添加订阅失败:", error.message);
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * 清空用户所有订阅
   * @param {number} userId - 用户数据库ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async clearUserSubscriptions(userId) {
    try {
      await db.query(
        `UPDATE user_subscriptions SET is_active = FALSE, updated_at = NOW() 
         WHERE user_id = ?`,
        [userId]
      );
      return true;
    } catch (error) {
      console.error("清空用户订阅失败:", error.message);
      return false;
    }
  }

  /**
   * 检查公告是否匹配用户订阅
   * @param {number} userId - 用户数据库ID
   * @param {Object} announcement - 公告对象
   * @returns {Promise<boolean>} 是否匹配
   */
  static async checkAnnouncementMatch(userId, announcement) {
    try {
      // 排除"未分类"类型的公告
      if (announcement.type === "未分类") return false;

      const [subscriptions] = await db.query(
        `SELECT * FROM user_subscriptions 
         WHERE user_id = ? AND is_active = TRUE`,
        [userId]
      );

      for (const sub of subscriptions) {
        // 检查交易所匹配
        if (sub.exchange !== "all" && sub.exchange !== announcement.exchange) {
          continue;
        }

        // 检查公告类型匹配
        if (
          sub.announcement_type !== "all" &&
          !announcement.type.includes(sub.announcement_type)
        ) {
          continue;
        }

        // 检查代币筛选
        if (sub.token_filter) {
          // 检查标题中是否包含代币筛选条件
          if (
            announcement.title
              .toLowerCase()
              .includes(sub.token_filter.toLowerCase())
          ) {
            return true;
          }

          // 检查关联的代币信息
          if (
            announcement.tokenInfoArray &&
            announcement.tokenInfoArray.length > 0
          ) {
            for (const token of announcement.tokenInfoArray) {
              if (
                (token.name &&
                  token.name
                    .toLowerCase()
                    .includes(sub.token_filter.toLowerCase())) ||
                (token.symbol &&
                  token.symbol
                    .toLowerCase()
                    .includes(sub.token_filter.toLowerCase()))
              ) {
                return true;
              }
            }
          }
        } else {
          // 没有代币筛选，直接匹配
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`检查用户 ${userId} 订阅匹配失败:`, error.message);
      return false;
    }
  }

  /**
   * 获取支持的交易所列表
   * @returns {Array} 交易所列表
   */
  static getSupportedExchanges() {
    return ["Binance", "OKX", "Bitget", "Bybit", "Kucoin", "HTX", "Gate", "XT"];
  }

  /**
   * 获取支持的公告类型列表
   * @returns {Array} 公告类型列表
   */
  static getSupportedAnnouncementTypes() {
    return [
      "上新",
      "盘前",
      "合约",
      "下架",
      "launchpool",
      "launchpad",
      "创新",
      "HODLer",
      "Megadrop",
      "Alpha",
      "活动",
      "空投",
      "维护",
    ];
  }

  /**
   * 获取订阅统计信息
   * @param {number} userId - 用户数据库ID
   * @returns {Promise<Object>} 统计信息
   */
  static async getSubscriptionStats(userId) {
    try {
      const [stats] = await db.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN token_filter IS NOT NULL THEN 1 END) as with_token_filter,
           COUNT(DISTINCT exchange) as exchanges_count,
           COUNT(DISTINCT announcement_type) as types_count
         FROM user_subscriptions 
         WHERE user_id = ? AND is_active = TRUE`,
        [userId]
      );

      return (
        stats[0] || {
          total: 0,
          with_token_filter: 0,
          exchanges_count: 0,
          types_count: 0,
        }
      );
    } catch (error) {
      console.error("获取订阅统计失败:", error.message);
      return {
        total: 0,
        with_token_filter: 0,
        exchanges_count: 0,
        types_count: 0,
      };
    }
  }
}

module.exports = SubscriptionService;
