const db = require("../config/database");

class FeedbackService {
  /**
   * 检查用户是否为管理员
   * @param {string} telegramUserId - Telegram用户ID
   * @returns {Promise<boolean>} 是否为管理员
   */
  static async isAdmin(telegramUserId) {
    try {
      const [admins] = await db.query(
        "SELECT id FROM admins WHERE user_id = ?",
        [telegramUserId]
      );
      return admins.length > 0;
    } catch (error) {
      console.error("检查管理员身份失败:", error.message);
      return false;
    }
  }

  /**
   * 创建用户反馈
   * @param {Object} feedbackData - 反馈数据
   * @returns {Promise<number|null>} 反馈ID
   */
  static async createFeedback(feedbackData) {
    try {
      const { userDbId, telegramUserId, type, title, content } = feedbackData;
      
      const [result] = await db.query(
        `INSERT INTO user_feedback (user_id, telegram_user_id, type, title, content) 
         VALUES (?, ?, ?, ?, ?)`,
        [userDbId, telegramUserId, type, title, content]
      );
      
      return result.insertId;
    } catch (error) {
      console.error("创建反馈失败:", error.message);
      return null;
    }
  }

  /**
   * 获取用户的反馈列表
   * @param {number} userDbId - 用户数据库ID
   * @returns {Promise<Array>} 反馈列表
   */
  static async getUserFeedbacks(userDbId) {
    try {
      const [feedbacks] = await db.query(
        `SELECT id, type, title, status, created_at, updated_at, admin_reply
         FROM user_feedback 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userDbId]
      );
      
      return feedbacks;
    } catch (error) {
      console.error("获取用户反馈失败:", error.message);
      return [];
    }
  }

  /**
   * 获取反馈详情
   * @param {number} feedbackId - 反馈ID
   * @param {number} userDbId - 用户数据库ID（用于权限验证）
   * @returns {Promise<Object|null>} 反馈详情
   */
  static async getFeedbackDetail(feedbackId, userDbId) {
    try {
      const [feedbacks] = await db.query(
        `SELECT f.*, u.user_id as telegram_user_id
         FROM user_feedback f
         JOIN users u ON f.user_id = u.id
         WHERE f.id = ? AND f.user_id = ?`,
        [feedbackId, userDbId]
      );
      
      return feedbacks.length > 0 ? feedbacks[0] : null;
    } catch (error) {
      console.error("获取反馈详情失败:", error.message);
      return null;
    }
  }

  /**
   * 获取所有反馈（管理员用）
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 反馈列表
   */
  static async getAllFeedbacks(filters = {}) {
    try {
      let query = `
        SELECT f.*, u.user_id as telegram_user_id, a.name as admin_name
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN admins a ON f.admin_id = a.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += " AND f.status = ?";
        params.push(filters.status);
      }

      if (filters.type) {
        query += " AND f.type = ?";
        params.push(filters.type);
      }

      query += " ORDER BY f.created_at DESC";

      if (filters.limit) {
        query += " LIMIT ?";
        params.push(parseInt(filters.limit));
      }

      const [feedbacks] = await db.query(query, params);
      return feedbacks;
    } catch (error) {
      console.error("获取所有反馈失败:", error.message);
      return [];
    }
  }

  /**
   * 更新反馈状态
   * @param {number} feedbackId - 反馈ID
   * @param {string} status - 新状态
   * @param {number} adminId - 管理员ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async updateFeedbackStatus(feedbackId, status, adminId = null) {
    try {
      const [result] = await db.query(
        "UPDATE user_feedback SET status = ?, admin_id = ?, updated_at = NOW() WHERE id = ?",
        [status, adminId, feedbackId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error("更新反馈状态失败:", error.message);
      return false;
    }
  }

  /**
   * 添加管理员回复
   * @param {number} feedbackId - 反馈ID
   * @param {string} reply - 回复内容
   * @param {number} adminId - 管理员ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async addAdminReply(feedbackId, reply, adminId) {
    try {
      const [result] = await db.query(
        `UPDATE user_feedback 
         SET admin_reply = ?, admin_id = ?, status = 'resolved', updated_at = NOW() 
         WHERE id = ?`,
        [reply, adminId, feedbackId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error("添加管理员回复失败:", error.message);
      return false;
    }
  }

  /**
   * 获取反馈统计
   * @returns {Promise<Object>} 统计数据
   */
  static async getFeedbackStats() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN type = 'bug' THEN 1 END) as bugs,
          COUNT(CASE WHEN type = 'feature' THEN 1 END) as features,
          COUNT(CASE WHEN type = 'improvement' THEN 1 END) as improvements,
          COUNT(CASE WHEN type = 'other' THEN 1 END) as others
        FROM user_feedback
      `);
      
      return stats[0] || {
        total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0,
        bugs: 0, features: 0, improvements: 0, others: 0
      };
    } catch (error) {
      console.error("获取反馈统计失败:", error.message);
      return {
        total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0,
        bugs: 0, features: 0, improvements: 0, others: 0
      };
    }
  }

  /**
   * 获取管理员信息
   * @param {string} telegramUserId - Telegram用户ID
   * @returns {Promise<Object|null>} 管理员信息
   */
  static async getAdminInfo(telegramUserId) {
    try {
      const [admins] = await db.query(
        "SELECT id, name FROM admins WHERE user_id = ?",
        [telegramUserId]
      );
      
      return admins.length > 0 ? admins[0] : null;
    } catch (error) {
      console.error("获取管理员信息失败:", error.message);
      return null;
    }
  }
}

module.exports = FeedbackService;
