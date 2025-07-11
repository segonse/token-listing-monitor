const db = require("../config/database");

class TokenSearchService {
  /**
   * 搜索代币（支持name和symbol）
   * @param {string} query - 搜索关键词
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 搜索结果
   */
  static async searchTokens(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = `%${query.trim()}%`;

      // 分别搜索name和symbol，避免重复
      const [results] = await db.query(
        `(
          SELECT DISTINCT name as value, 'name' as type, name, symbol
          FROM tokens 
          WHERE name LIKE ? AND name IS NOT NULL
          ORDER BY 
            CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
            LENGTH(name),
            name
          LIMIT ?
        )
        UNION ALL
        (
          SELECT DISTINCT symbol as value, 'symbol' as type, name, symbol
          FROM tokens 
          WHERE symbol LIKE ? AND symbol IS NOT NULL
          ORDER BY 
            CASE WHEN symbol LIKE ? THEN 1 ELSE 2 END,
            LENGTH(symbol),
            symbol
          LIMIT ?
        )
        ORDER BY 
          CASE WHEN value LIKE ? THEN 1 ELSE 2 END,
          LENGTH(value),
          value
        LIMIT ?`,
        [
          searchTerm,
          `${query.trim()}%`,
          limit, // name搜索
          searchTerm,
          `${query.trim()}%`,
          limit, // symbol搜索
          `${query.trim()}%`, // 最终排序
          limit * 2, // 最终限制
        ]
      );

      // 去重并格式化结果
      const uniqueResults = [];
      const seen = new Set();

      for (const result of results) {
        const key = `${result.value}_${result.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push({
            value: result.value,
            type: result.type,
            name: result.name,
            symbol: result.symbol,
            display:
              result.type === "name"
                ? `${result.value} (名称)`
                : `${result.value} (符号)`,
          });
        }
      }

      return uniqueResults.slice(0, limit);
    } catch (error) {
      console.error("搜索代币失败:", error.message);
      return [];
    }
  }

  /**
   * 获取最近添加的代币
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 最近代币列表
   */
  static async getRecentTokens(limit = 20) {
    try {
      const [results] = await db.query(
        `SELECT DISTINCT
           t.name, 
           t.symbol, 
           MAX(t.created_at) as latest_created
         FROM tokens t
         WHERE t.name IS NOT NULL AND t.symbol IS NOT NULL
         GROUP BY t.name, t.symbol
         ORDER BY latest_created DESC
         LIMIT ?`,
        [limit]
      );

      return results.map((token) => ({
        name: token.name,
        symbol: token.symbol,
        createdAt: token.latest_created,
        display: `${token.symbol} - ${token.name}`,
      }));
    } catch (error) {
      console.error("获取最近代币失败:", error.message);
      return [];
    }
  }

  /**
   * 按交易所获取代币列表
   * @param {string} exchange - 交易所名称
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 代币列表
   */
  static async getTokensByExchange(exchange, limit = 50) {
    try {
      const [results] = await db.query(
        `SELECT DISTINCT
           t.name, 
           t.symbol,
           COUNT(DISTINCT a.id) as announcement_count
         FROM tokens t
         JOIN announcements a ON t.announcement_id = a.id
         WHERE a.exchange = ? AND t.name IS NOT NULL AND t.symbol IS NOT NULL
         GROUP BY t.name, t.symbol
         ORDER BY announcement_count DESC, t.symbol
         LIMIT ?`,
        [exchange, limit]
      );

      return results.map((token) => ({
        name: token.name,
        symbol: token.symbol,
        announcementCount: token.announcement_count,
        display: `${token.symbol} - ${token.name}`,
      }));
    } catch (error) {
      console.error(`获取${exchange}代币列表失败:`, error.message);
      return [];
    }
  }

  /**
   * 验证代币是否存在
   * @param {string} value - 代币名称或符号
   * @returns {Promise<Object|null>} 代币信息或null
   */
  static async validateToken(value) {
    try {
      const [results] = await db.query(
        `SELECT DISTINCT name, symbol
         FROM tokens 
         WHERE (name = ? OR symbol = ?) AND name IS NOT NULL AND symbol IS NOT NULL
         LIMIT 1`,
        [value, value]
      );

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("验证代币失败:", error.message);
      return null;
    }
  }

  /**
   * 获取代币统计信息
   * @returns {Promise<Object>} 统计信息
   */
  static async getTokenStats() {
    try {
      const [stats] = await db.query(
        `SELECT 
           COUNT(DISTINCT CONCAT(COALESCE(name, ''), '|', COALESCE(symbol, ''))) as unique_tokens,
           COUNT(DISTINCT name) as unique_names,
           COUNT(DISTINCT symbol) as unique_symbols,
           COUNT(*) as total_records
         FROM tokens 
         WHERE name IS NOT NULL OR symbol IS NOT NULL`
      );

      return (
        stats[0] || {
          unique_tokens: 0,
          unique_names: 0,
          unique_symbols: 0,
          total_records: 0,
        }
      );
    } catch (error) {
      console.error("获取代币统计失败:", error.message);
      return {
        unique_tokens: 0,
        unique_names: 0,
        unique_symbols: 0,
        total_records: 0,
      };
    }
  }
}

module.exports = TokenSearchService;
