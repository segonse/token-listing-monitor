const db = require("../config/database");

class ExchangeDataCache {
  static cache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  static get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  static set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  static clear() {
    this.cache.clear();
  }
}

class ExchangeDataService {
  /**
   * 获取所有有数据的交易所
   * @returns {Promise<Array>} 交易所列表
   */
  static async getAvailableExchanges() {
    const cacheKey = "available_exchanges";
    const cached = ExchangeDataCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [exchanges] = await db.query(`
        SELECT DISTINCT exchange 
        FROM announcements 
        ORDER BY exchange
      `);

      const result = exchanges.map((e) => e.exchange);
      ExchangeDataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("获取可用交易所失败:", error.message);
      // 返回默认交易所列表作为后备
      return [
        "Binance",
        "OKX",
        "Bitget",
        "Bybit",
        "Kucoin",
        "HTX",
        "Gate",
        "XT",
      ];
    }
  }

  /**
   * 根据交易所获取公告类型
   * @param {Array} exchanges - 交易所数组
   * @returns {Promise<Array>} 公告类型列表
   */
  static async getAnnouncementTypesByExchanges(exchanges) {
    if (!exchanges || exchanges.length === 0) {
      return [];
    }

    const cacheKey = `announcement_types_${exchanges.sort().join("_")}`;
    const cached = ExchangeDataCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const placeholders = exchanges.map(() => "?").join(",");
      const [types] = await db.query(
        `
        SELECT DISTINCT type 
        FROM announcements 
        WHERE exchange IN (${placeholders}) AND type != '未分类'
        ORDER BY type
      `,
        exchanges
      );

      const result = types.map((t) => t.type);
      ExchangeDataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("获取公告类型失败:", error.message);
      // 返回默认公告类型列表作为后备
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
  }

  /**
   * 获取所有公告类型（不限交易所）
   * @returns {Promise<Array>} 公告类型列表
   */
  static async getAllAnnouncementTypes() {
    const cacheKey = "all_announcement_types";
    const cached = ExchangeDataCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [types] = await db.query(`
        SELECT DISTINCT type 
        FROM announcements 
        WHERE type != '未分类'
        ORDER BY type
      `);

      const result = types.map((t) => t.type);
      ExchangeDataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("获取所有公告类型失败:", error.message);
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
  }

  /**
   * 获取交易所统计信息
   * @returns {Promise<Array>} 交易所统计信息
   */
  static async getExchangeStats() {
    const cacheKey = "exchange_stats";
    const cached = ExchangeDataCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [stats] = await db.query(`
        SELECT 
          exchange,
          COUNT(*) as announcement_count,
          COUNT(DISTINCT type) as type_count
        FROM announcements 
        WHERE type != '未分类'
        GROUP BY exchange 
        ORDER BY announcement_count DESC
      `);

      ExchangeDataCache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error("获取交易所统计失败:", error.message);
      return [];
    }
  }

  /**
   * 验证交易所和公告类型组合是否存在
   * @param {string} exchange - 交易所名称
   * @param {string} announcementType - 公告类型
   * @returns {Promise<boolean>} 是否存在该组合
   */
  static async validateExchangeTypeCombo(exchange, announcementType) {
    const cacheKey = `validate_${exchange}_${announcementType}`;
    const cached = ExchangeDataCache.get(cacheKey);

    if (cached !== null) {
      return cached;
    }

    try {
      const [result] = await db.query(
        `
        SELECT COUNT(*) as count
        FROM announcements
        WHERE exchange = ? AND type = ?
        LIMIT 1
      `,
        [exchange, announcementType]
      );

      const exists = result[0].count > 0;
      ExchangeDataCache.set(cacheKey, exists);
      return exists;
    } catch (error) {
      console.error("验证交易所和公告类型组合失败:", error.message);
      return false;
    }
  }

  /**
   * 批量验证交易所和公告类型组合
   * @param {Array} exchanges - 交易所数组
   * @param {Array} announcementTypes - 公告类型数组
   * @returns {Promise<Array>} 有效的组合数组 [{exchange, type}]
   */
  static async validateBatchCombos(exchanges, announcementTypes) {
    const validCombos = [];

    for (const exchange of exchanges) {
      for (const type of announcementTypes) {
        const isValid = await this.validateExchangeTypeCombo(exchange, type);
        if (isValid) {
          validCombos.push({ exchange, type });
        }
      }
    }

    return validCombos;
  }

  /**
   * 清除缓存
   */
  static clearCache() {
    ExchangeDataCache.clear();
    console.log("交易所数据缓存已清除");
  }
}

module.exports = ExchangeDataService;
