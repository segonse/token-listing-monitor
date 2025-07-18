const { query } = require("../config/fundingRateDatabase");

class FundingRateService {
  // 缓存相关属性
  static exchangeQuoteCache = null;
  static cacheTimestamp = null;
  static CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 获取所有交易所和计价币种组合
  static async getAllExchangeQuoteCombinations() {
    const now = Date.now();

    // 检查缓存是否有效
    if (
      this.exchangeQuoteCache &&
      this.cacheTimestamp &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.exchangeQuoteCache;
    }

    try {
      const sql = `
        SELECT base_asset as baseAsset, exchange, quote_asset as quoteAsset
        FROM funding_rate_new
        WHERE base_asset IS NOT NULL
          AND exchange IS NOT NULL
          AND quote_asset IS NOT NULL
        GROUP BY base_asset, exchange, quote_asset
        ORDER BY exchange, quote_asset, base_asset
      `;

      const results = await query(sql, []);

      // 更新缓存
      this.exchangeQuoteCache = results;
      this.cacheTimestamp = now;

      return results;
    } catch (error) {
      console.error("获取交易所计价币种组合失败:", error.message);
      return [];
    }
  }
  // 获取可用交易所列表
  static async getAvailableExchanges() {
    try {
      const combinations = await this.getAllExchangeQuoteCombinations();
      const exchanges = [...new Set(combinations.map((item) => item.exchange))];
      return exchanges.sort();
    } catch (error) {
      console.error("获取交易所列表失败:", error.message);
      return [];
    }
  }

  // 获取可用计价币种列表
  static async getAvailableQuoteAssets(exchange) {
    try {
      const combinations = await this.getAllExchangeQuoteCombinations();
      const quoteAssets = [
        ...new Set(
          combinations
            .filter((item) => item.exchange === exchange)
            .map((item) => item.quoteAsset)
        ),
      ];
      return quoteAssets.sort();
    } catch (error) {
      console.error("获取计价币种列表失败:", error.message);
      return [];
    }
  }

  // 基于缓存数据获取币种列表（用于热门币种）
  static async getAvailableSymbols(exchange, quoteAsset) {
    try {
      const combinations = await this.getAllExchangeQuoteCombinations();
      const symbols = combinations
        .filter(
          (item) => item.exchange === exchange && item.quoteAsset === quoteAsset
        )
        .map((item) => ({
          symbol: `${item.baseAsset}${item.quoteAsset}`, // 构造symbol
          baseAsset: item.baseAsset,
          displayName: `${item.baseAsset} (${item.baseAsset}${item.quoteAsset})`,
        }));
      return symbols;
    } catch (error) {
      console.error("获取币种列表失败:", error.message);
      return [];
    }
  }

  // 搜索交易币种（基于缓存数据）
  static async searchSymbols(exchange, quoteAsset, keyword) {
    try {
      // 从缓存获取所有可用币种
      const availableSymbols = await this.getAvailableSymbols(
        exchange,
        quoteAsset
      );

      if (availableSymbols.length === 0) {
        return [];
      }

      const upperKeyword = keyword.toUpperCase();

      // 在内存中进行搜索和排序
      const matchedSymbols = availableSymbols
        .filter(
          (item) =>
            item.baseAsset.includes(upperKeyword) ||
            item.symbol.includes(upperKeyword)
        )
        .sort((a, b) => {
          // 排序优先级：
          // 1. baseAsset 完全匹配
          // 2. baseAsset 前缀匹配
          // 3. symbol 前缀匹配
          // 4. 其他包含匹配
          const aBaseExact = a.baseAsset === upperKeyword ? 1 : 0;
          const bBaseExact = b.baseAsset === upperKeyword ? 1 : 0;
          if (aBaseExact !== bBaseExact) return bBaseExact - aBaseExact;

          const aBasePrefix = a.baseAsset.startsWith(upperKeyword) ? 1 : 0;
          const bBasePrefix = b.baseAsset.startsWith(upperKeyword) ? 1 : 0;
          if (aBasePrefix !== bBasePrefix) return bBasePrefix - aBasePrefix;

          const aSymbolPrefix = a.symbol.startsWith(upperKeyword) ? 1 : 0;
          const bSymbolPrefix = b.symbol.startsWith(upperKeyword) ? 1 : 0;
          if (aSymbolPrefix !== bSymbolPrefix)
            return bSymbolPrefix - aSymbolPrefix;

          // 最后按字母顺序排序
          return a.baseAsset.localeCompare(b.baseAsset);
        })
        .slice(0, 15); // 限制返回数量

      return matchedSymbols;
    } catch (error) {
      console.error("搜索币种失败:", error.message);
      return [];
    }
  }

  // 查询资金费率
  static async queryFundingRate(params) {
    try {
      const { exchange, symbol, quoteAsset, startDate, endDate } = params;

      const sql = `
        SELECT
          SUM(funding_rate) as total_rate,
          COUNT(*) as periods_count,
          AVG(funding_rate) as avg_rate,
          MIN(funding_time) as start_time,
          MAX(funding_time) as end_time
        FROM funding_rate_new
        WHERE exchange = ?
          AND symbol = ?
          AND quote_asset = ?
          AND DATE(CONVERT_TZ(FROM_UNIXTIME(funding_time/1000), @@session.time_zone, '+08:00')) BETWEEN ? AND ?
      `;

      const results = await query(sql, [
        exchange,
        symbol,
        quoteAsset,
        startDate,
        endDate,
      ]);

      if (results.length === 0) {
        return null;
      }

      const result = results[0];

      // 如果没有数据
      if (result.periods_count === 0 || result.periods_count === null) {
        return {
          total_rate: 0,
          periods_count: 0,
          avg_rate: 0,
          start_time: null,
          end_time: null,
          hasData: false,
        };
      }

      return {
        total_rate: parseFloat(result.total_rate) || 0,
        periods_count: parseInt(result.periods_count) || 0,
        avg_rate: parseFloat(result.avg_rate) || 0,
        start_time: result.start_time,
        end_time: result.end_time,
        hasData: true,
      };
    } catch (error) {
      console.error("查询资金费率失败:", error.message);
      throw error;
    }
  }

  // 获取数据可用时间范围
  static async getDataTimeRange(exchange, symbol, quoteAsset) {
    try {
      const sql = `
        SELECT
          MIN(CONVERT_TZ(FROM_UNIXTIME(funding_time/1000), @@session.time_zone, '+08:00')) as earliest_time,
          MAX(CONVERT_TZ(FROM_UNIXTIME(funding_time/1000), @@session.time_zone, '+08:00')) as latest_time,
          COUNT(*) as total_records
        FROM funding_rate_new
        WHERE exchange = ?
          AND symbol = ?
          AND quote_asset = ?
      `;

      const results = await query(sql, [exchange, symbol, quoteAsset]);

      if (results.length === 0) {
        return null;
      }

      return results[0];
    } catch (error) {
      console.error("获取数据时间范围失败:", error.message);
      return null;
    }
  }

  // 格式化日期
  static formatDate(date) {
    if (!date) return "";

    const d = new Date(date);
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai", // 使用中国时区
    });
  }

  // 格式化百分比
  static formatPercentage(rate, decimals = 6) {
    if (rate === null || rate === undefined) return "0.0000%";
    return (rate * 100).toFixed(decimals) + "%";
  }

  // 计算日期范围
  static getDateRange(type) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (type) {
      case "today":
        return {
          startDate: today.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };

      case "7d":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return {
          startDate: sevenDaysAgo.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };

      case "30d":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };

      default:
        return {
          startDate: today.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
    }
  }
}

module.exports = FundingRateService;
