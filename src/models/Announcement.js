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
      "UPDATE announcements SET exchange = ?, title = ?, description = ?, type = ?, url = ?, publishTime = ?, updated_at = ? WHERE id = ?",
      [
        announcement.exchange,
        announcement.title,
        announcement.description,
        announcement.type,
        announcement.url,
        announcement.publishTime,
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

  static async getFilteredAnnouncements(filters) {
    try {
      const {
        exchanges, // 交易所数组或"all"
        types, // 公告类型数组或"all"
        tokenName, // 可选的代币名称
        projectName, // 可选的项目名称
        limit = 5, // 默认获取5条公告
      } = filters;

      // 构建基础查询
      let query = `
        SELECT DISTINCT a.* 
        FROM announcements a
      `;

      // 如果有代币名称或项目名称筛选，需要关联tokens表
      if (tokenName || projectName) {
        query += `
          LEFT JOIN tokens t ON t.announcement_id = a.id
        `;
      }

      // 构建WHERE子句
      const conditions = [];
      const params = [];

      // 处理交易所筛选
      if (
        exchanges &&
        exchanges !== "all" &&
        Array.isArray(exchanges) &&
        exchanges.length > 0
      ) {
        const placeholders = exchanges.map(() => "?").join(",");
        conditions.push(`a.exchange IN (${placeholders})`);
        params.push(...exchanges);
      }

      // 处理公告类型筛选
      if (
        types &&
        types !== "all" &&
        Array.isArray(types) &&
        types.length > 0
      ) {
        const placeholders = types.map(() => "?").join(",");
        conditions.push(`a.type IN (${placeholders})`);
        params.push(...types);
      }

      // 处理代币名称筛选
      if (tokenName) {
        conditions.push(`(t.name = ? OR a.title LIKE ?)`);
        params.push(tokenName, `%${tokenName}%`);
      }

      // 处理项目名称筛选
      if (projectName) {
        conditions.push(`(t.project_name = ? OR a.title LIKE ?)`);
        params.push(projectName, `%${projectName}%`);
      }

      // 添加WHERE子句
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      // 添加排序和限制
      query += `
        ORDER BY a.publishTime DESC
        LIMIT ?
      `;
      params.push(parseInt(limit));

      // 执行查询
      const [announcements] = await db.query(query, params);

      // 为每个公告添加代币信息
      for (const announcement of announcements) {
        const [tokens] = await db.query(
          `SELECT * FROM tokens WHERE announcement_id = ?`,
          [announcement.id]
        );
        announcement.tokenInfoArray = tokens.map((token) => ({
          tokenName: token.name,
          projectName: token.project_name,
        }));
      }

      return announcements;
    } catch (error) {
      console.error("获取筛选公告失败:", error.message);
      return [];
    }
  }
}

module.exports = Announcement;
