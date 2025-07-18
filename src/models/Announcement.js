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
        const AnnouncementToken = require("./AnnouncementToken");
        const tokenIds = [];

        for (const tokenInfo of tokenInfoArray) {
          if (tokenInfo.name || tokenInfo.symbol) {
            // 查找或创建代币记录（支持渐进式数据完善）
            const token = await Token.findOrCreate(
              tokenInfo.name, // 代币完整名称
              tokenInfo.symbol // 代币符号
            );

            if (token && token.id) {
              tokenIds.push(token.id);
            }
          }
        }

        // 批量创建公告-代币关联
        if (tokenIds.length > 0) {
          await AnnouncementToken.createBatch(announcementId, tokenIds);
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
        symbol, // 可选的代币符号
        limit = 5, // 默认获取5条公告
      } = filters;

      // 构建基础查询
      let query = `
        SELECT DISTINCT a.* 
        FROM announcements a
      `;

      // 如果有代币名称或符号筛选，需要关联tokens表（使用新的关联表）
      if (tokenName || symbol) {
        query += `
          LEFT JOIN announcement_tokens at ON at.announcement_id = a.id
          LEFT JOIN tokens t ON t.id = at.token_id
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

      // 处理代币符号筛选
      if (symbol) {
        conditions.push(`(t.symbol = ? OR a.title LIKE ?)`);
        params.push(symbol, `%${symbol}%`);
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

      // 为每个公告添加代币信息（使用新的关联表）
      for (const announcement of announcements) {
        const AnnouncementToken = require("./AnnouncementToken");
        const tokens = await AnnouncementToken.getTokensByAnnouncementId(
          announcement.id
        );
        announcement.tokenInfoArray = tokens.map((token) => ({
          name: token.name, // 代币完整名称
          symbol: token.symbol, // 代币符号
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
