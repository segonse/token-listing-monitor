const db = require("../config/database");

class AnnouncementToken {
  /**
   * 创建公告-代币关联
   * @param {number} announcementId - 公告ID
   * @param {number} tokenId - 代币ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async create(announcementId, tokenId) {
    try {
      await db.query(
        `INSERT IGNORE INTO announcement_tokens (announcement_id, token_id) 
         VALUES (?, ?)`,
        [announcementId, tokenId]
      );
      return true;
    } catch (error) {
      console.error("创建公告-代币关联失败:", error.message);
      return false;
    }
  }

  /**
   * 批量创建公告-代币关联
   * @param {number} announcementId - 公告ID
   * @param {number[]} tokenIds - 代币ID数组
   * @returns {Promise<boolean>} 是否成功
   */
  static async createBatch(announcementId, tokenIds) {
    if (!tokenIds || tokenIds.length === 0) {
      return true;
    }

    try {
      const values = tokenIds.map(tokenId => [announcementId, tokenId]);
      const placeholders = values.map(() => "(?, ?)").join(", ");
      const flatValues = values.flat();

      await db.query(
        `INSERT IGNORE INTO announcement_tokens (announcement_id, token_id) 
         VALUES ${placeholders}`,
        flatValues
      );
      return true;
    } catch (error) {
      console.error("批量创建公告-代币关联失败:", error.message);
      return false;
    }
  }

  /**
   * 获取公告关联的所有代币
   * @param {number} announcementId - 公告ID
   * @returns {Promise<Array>} 代币列表
   */
  static async getTokensByAnnouncementId(announcementId) {
    try {
      const [tokens] = await db.query(
        `SELECT t.* FROM tokens t
         INNER JOIN announcement_tokens at ON t.id = at.token_id
         WHERE at.announcement_id = ?`,
        [announcementId]
      );
      return tokens;
    } catch (error) {
      console.error("获取公告关联代币失败:", error.message);
      return [];
    }
  }

  /**
   * 获取代币关联的所有公告
   * @param {number} tokenId - 代币ID
   * @returns {Promise<Array>} 公告列表
   */
  static async getAnnouncementsByTokenId(tokenId) {
    try {
      const [announcements] = await db.query(
        `SELECT a.* FROM announcements a
         INNER JOIN announcement_tokens at ON a.id = at.announcement_id
         WHERE at.token_id = ?
         ORDER BY a.publishTime DESC`,
        [tokenId]
      );
      return announcements;
    } catch (error) {
      console.error("获取代币关联公告失败:", error.message);
      return [];
    }
  }

  /**
   * 删除公告的所有代币关联
   * @param {number} announcementId - 公告ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async deleteByAnnouncementId(announcementId) {
    try {
      await db.query(
        `DELETE FROM announcement_tokens WHERE announcement_id = ?`,
        [announcementId]
      );
      return true;
    } catch (error) {
      console.error("删除公告代币关联失败:", error.message);
      return false;
    }
  }

  /**
   * 删除代币的所有公告关联
   * @param {number} tokenId - 代币ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async deleteByTokenId(tokenId) {
    try {
      await db.query(
        `DELETE FROM announcement_tokens WHERE token_id = ?`,
        [tokenId]
      );
      return true;
    } catch (error) {
      console.error("删除代币公告关联失败:", error.message);
      return false;
    }
  }

  /**
   * 检查公告-代币关联是否存在
   * @param {number} announcementId - 公告ID
   * @param {number} tokenId - 代币ID
   * @returns {Promise<boolean>} 是否存在
   */
  static async exists(announcementId, tokenId) {
    try {
      const [rows] = await db.query(
        `SELECT 1 FROM announcement_tokens 
         WHERE announcement_id = ? AND token_id = ?`,
        [announcementId, tokenId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("检查公告代币关联失败:", error.message);
      return false;
    }
  }
}

module.exports = AnnouncementToken;
