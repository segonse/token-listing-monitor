const db = require("../config/database");

class Announcement {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM announcements");
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM announcements WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  static async findByURL(url) {
    try {
      const [announcements] = await db.query(
        `SELECT * FROM announcements WHERE url = ?`,
        [url]
      );
      return announcements.length > 0 ? announcements[0] : null;
    } catch (error) {
      console.error("根据URL查找公告失败:", error.message);
      return null;
    }
  }

  static async create(announcementData) {
    try {
      const {
        exchange,
        title,
        description,
        type,
        url,
        publishTime,
        tokenInfoArray = [], // 获取代币信息数组
      } = announcementData;

      // 创建公告记录
      const [result] = await db.query(
        `INSERT INTO announcements 
        (exchange, title, description, type, url, publishTime, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [exchange, title, description, type, url, publishTime]
      );

      const announcementId = result.insertId;

      // 创建成功后，处理所有提取到的代币信息
      if (tokenInfoArray && tokenInfoArray.length > 0) {
        const Token = require("./Token");

        for (const tokenInfo of tokenInfoArray) {
          if (tokenInfo.tokenName || tokenInfo.projectName) {
            // 每个代币信息都创建一条记录，并关联到当前公告
            await Token.findOrCreate(
              tokenInfo.tokenName,
              tokenInfo.projectName,
              announcementId
            );
          }
        }
      }

      return {
        id: announcementId,
        ...announcementData,
      };
    } catch (error) {
      console.error("创建公告失败:", error.message);
      return null;
    }
  }

  static async update(id, announcement) {
    const now = new Date();
    await db.query(
      "UPDATE announcements SET exchange = ?, title = ?, description = ?, type = ?, url = ?, publishTime = ?, token_id = ?, updated_at = ? WHERE id = ?",
      [
        announcement.exchange,
        announcement.title,
        announcement.description,
        announcement.type,
        announcement.url,
        announcement.publishTime,
        announcement.token_id,
        now,
        id,
      ]
    );
  }

  static async delete(id) {
    await db.query("DELETE FROM announcements WHERE id = ?", [id]);
  }

  static async markAsSentToUser(userId, announcementId) {
    try {
      await db.query(
        `INSERT INTO sent_notifications (user_id, announcement_id, sent_at)
        VALUES (?, ?, NOW())`,
        [userId, announcementId]
      );
      return true;
    } catch (error) {
      console.error("标记公告为已发送失败:", error.message);
      return false;
    }
  }

  static async hasBeenSentToUser(userId, announcementId) {
    try {
      const [records] = await db.query(
        `SELECT * FROM sent_notifications 
        WHERE user_id = ? AND announcement_id = ?`,
        [userId, announcementId]
      );
      return records.length > 0;
    } catch (error) {
      console.error("检查公告是否已发送失败:", error.message);
      return false;
    }
  }
}

module.exports = Announcement;
