const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// 配置文件
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.zhizengzeng.com/v1",
  },
  coingecko: {
    baseURL: "https://api.coingecko.com/api/v3",
    apiKey: process.env.COINGECKO_API_KEY || "", // 免费版可以不填
  },
  coinmarketcap: {
    baseURL: "https://pro-api.coinmarketcap.com/v1",
    apiKey: process.env.CMC_API_KEY || "your-cmc-api-key",
  },
};

class AnnouncementAnalyzer {
  constructor() {
    this.results = [];
  }

  // 1. 使用GPT-4分析公告分类和提取代币信息
  async analyzeAnnouncement(title, exchange = "unknown") {
    const prompt = `
请分析以下交易所公告标题，执行两个任务：

1. 分类公告类型（从以下选择一个或多个）：
   - NEW_LISTING: 新代币上线
   - CONTRACT: 合约
   - LEVERAGE: 杠杆
   - DELISTING: 代币下线
   - TRADING_PAIR: 新交易对添加
   - MAINTENANCE: 系统维护
   - PROMOTION: 活动推广
   - AIRDROP: 空投相关
   - ALPHA: 币安alpha (binance特有)
   - OTHER: 其他类型

2. 如果包含NEW_LISTING类型，提取代币信息：
   - 代币名称 (name)
   - 代币符号 (symbol)

公告标题: "${title}"
交易所: ${exchange}

请严格按照以下JSON格式返回结果：
{
  "categories": ["分类结果1", "分类结果2"],
  "confidence": 0.95,
  "tokens": [
    {
      "name": "代币全名",
      "symbol": "代币符号"
    }
  ],
  "exchange": "${exchange}",
  "analysis": "简短分析说明"
}

注意：
- categories是数组，可以包含多个分类
- 如果不包含NEW_LISTING，tokens数组为空
- OTHER类型只有在无法归类到其他类型时才使用
`;

    try {
      const response = await axios.post(
        `${config.openai.baseURL}/chat/completions`,
        {
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的加密货币交易所公告分析专家，擅长准确分类公告类型和提取代币信息。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${config.openai.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      console.log("GPT-4 原始响应:", content);

      // 尝试解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析GPT-4响应为JSON格式");
      }
    } catch (error) {
      console.error("GPT-4 分析失败:", error.message);
      return {
        categories: ["ERROR"],
        confidence: 0,
        tokens: [],
        exchange: exchange,
        analysis: `分析失败: ${error.message}`,
      };
    }
  }

  // 2. 从CoinGecko获取代币信息
  async getTokenInfoFromCoinGecko(symbol) {
    try {
      const searchUrl = `${config.coingecko.baseURL}/search?query=${symbol}`;
      const headers = config.coingecko.apiKey
        ? { "x-cg-demo-api-key": config.coingecko.apiKey }
        : {};

      const searchResponse = await axios.get(searchUrl, { headers });
      const coins = searchResponse.data.coins;

      if (coins.length === 0) {
        return { source: "coingecko", found: false, data: null };
      }

      // 取第一个匹配的代币
      const coin = coins[0];
      const detailUrl = `${config.coingecko.baseURL}/coins/${coin.id}`;
      const detailResponse = await axios.get(detailUrl, { headers });
      const coinData = detailResponse.data;

      return {
        source: "coingecko",
        found: true,
        data: {
          id: coinData.id,
          name: coinData.name,
          symbol: coinData.symbol.toUpperCase(),
          contract_address: coinData.contract_address,
          current_price: coinData.market_data?.current_price?.usd,
          market_cap: coinData.market_data?.market_cap?.usd,
          total_supply: coinData.market_data?.total_supply,
          circulating_supply: coinData.market_data?.circulating_supply,
          homepage: coinData.links?.homepage?.[0],
          whitepaper: coinData.links?.whitepaper,
          blockchain_site: coinData.links?.blockchain_site?.[0],
          description: coinData.description?.en?.substring(0, 200) + "...",
        },
      };
    } catch (error) {
      console.error(`CoinGecko API错误 (${symbol}):`, error.message);
      return { source: "coingecko", found: false, error: error.message };
    }
  }

  // 3. 从CoinMarketCap获取代币信息
  async getTokenInfoFromCMC(symbol) {
    try {
      const url = `${config.coinmarketcap.baseURL}/cryptocurrency/quotes/latest`;
      const response = await axios.get(url, {
        headers: {
          "X-CMC_PRO_API_KEY": config.coinmarketcap.apiKey,
          Accept: "application/json",
        },
        params: {
          symbol: symbol.toUpperCase(),
          convert: "USD",
        },
      });

      const data = response.data.data[symbol.toUpperCase()];
      if (!data) {
        return { source: "coinmarketcap", found: false, data: null };
      }

      return {
        source: "coinmarketcap",
        found: true,
        data: {
          id: data.id,
          name: data.name,
          symbol: data.symbol,
          price: data.quote.USD.price,
          market_cap: data.quote.USD.market_cap,
          volume_24h: data.quote.USD.volume_24h,
          percent_change_24h: data.quote.USD.percent_change_24h,
          circulating_supply: data.circulating_supply,
          total_supply: data.total_supply,
          max_supply: data.max_supply,
        },
      };
    } catch (error) {
      console.error(`CoinMarketCap API错误 (${symbol}):`, error.message);
      return { source: "coinmarketcap", found: false, error: error.message };
    }
  }

  // 4. 聚合代币信息
  async aggregateTokenInfo(tokens) {
    const aggregatedTokens = [];

    for (const token of tokens) {
      console.log(`\n正在聚合代币信息: ${token.symbol}`);

      const [coingeckoInfo, cmcInfo] = await Promise.all([
        this.getTokenInfoFromCoinGecko(token.symbol),
        this.getTokenInfoFromCMC(token.symbol),
      ]);

      const aggregated = {
        ...token,
        external_data: {
          coingecko: coingeckoInfo,
          coinmarketcap: cmcInfo,
        },
        // 合并价格信息（优先使用CoinGecko）
        price_usd: coingeckoInfo.found
          ? coingeckoInfo.data?.current_price
          : cmcInfo.found
          ? cmcInfo.data?.price
          : null,
        market_cap: coingeckoInfo.found
          ? coingeckoInfo.data?.market_cap
          : cmcInfo.found
          ? cmcInfo.data?.market_cap
          : null,
        contract_address: coingeckoInfo.found
          ? coingeckoInfo.data?.contract_address
          : null,
        homepage: coingeckoInfo.found ? coingeckoInfo.data?.homepage : null,
        description: coingeckoInfo.found
          ? coingeckoInfo.data?.description
          : null,
      };

      aggregatedTokens.push(aggregated);
    }

    return aggregatedTokens;
  }

  // 5. 处理单个公告
  async processAnnouncement(title, exchange = "unknown") {
    console.log(`\n=== 处理公告 ===`);
    console.log(`标题: ${title}`);
    console.log(`交易所: ${exchange}`);

    // 步骤1: AI分析
    const analysis = await this.analyzeAnnouncement(title, exchange);
    console.log("\n--- AI分析结果 ---");
    console.log(JSON.stringify(analysis, null, 2));

    // 步骤2: 如果包含新代币上线，获取详细信息
    let enrichedTokens = [];
    // if (
    //   analysis.categories &&
    //   analysis.categories.includes("NEW_LISTING") &&
    //   analysis.tokens.length > 0
    // ) {
    //   console.log("\n--- 聚合代币信息 ---");
    //   enrichedTokens = await this.aggregateTokenInfo(analysis.tokens);
    // }

    const result = {
      timestamp: new Date().toISOString(),
      original_title: title,
      exchange: exchange,
      analysis: analysis,
      enriched_tokens: enrichedTokens,
    };

    this.results.push(result);
    return result;
  }

  // 6. 批量处理公告
  async processAnnouncements(announcements) {
    console.log(`开始批量处理 ${announcements.length} 个公告...\n`);

    for (let i = 0; i < announcements.length; i++) {
      const announcement = announcements[i];
      console.log(`\n[${i + 1}/${announcements.length}]`);

      await this.processAnnouncement(
        announcement.title,
        announcement.exchange || "unknown"
      );

      // 避免API限制，添加延迟
      if (i < announcements.length - 1) {
        console.log("等待1秒...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return this.results;
  }

  // 7. 保存结果
  saveResults(filename = "analysis_results.json") {
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2), "utf8");
    console.log(`\n结果已保存到: ${filepath}`);
  }

  // 8. 生成报告
  generateReport() {
    const total = this.results.length;
    const categories = {};
    const newListings = [];

    this.results.forEach((result) => {
      const analysisCategories = result.analysis.categories || [
        result.analysis.category,
      ];

      // 统计每个分类
      analysisCategories.forEach((category) => {
        categories[category] = (categories[category] || 0) + 1;
      });

      // 收集包含NEW_LISTING的公告
      if (analysisCategories.includes("NEW_LISTING")) {
        newListings.push(result);
      }
    });

    console.log("\n=== 分析报告 ===");
    console.log(`总公告数: ${total}`);
    console.log("分类统计:");
    Object.entries(categories).forEach(([category, count]) => {
      console.log(
        `  ${category}: ${count} (${((count / total) * 100).toFixed(1)}%)`
      );
    });

    console.log(`\n新代币上线: ${newListings.length} 个`);
    newListings.forEach((listing, index) => {
      console.log(`\n${index + 1}. ${listing.original_title}`);
      listing.enriched_tokens.forEach((token) => {
        console.log(`   代币: ${token.name} (${token.symbol})`);
        console.log(`   价格: $${token.price_usd || "N/A"}`);
        console.log(
          `   市值: $${
            token.market_cap
              ? (token.market_cap / 1000000).toFixed(2) + "M"
              : "N/A"
          }`
        );
      });
    });
  }
}

// 使用示例
async function main() {
  const analyzer = new AnnouncementAnalyzer();

  // 示例公告数据 - 您可以替换为实际的公告标题
  const sampleAnnouncements = [
    {
      title: "Binance Will List Pepe (PEPE) in the Innovation Zone",
      exchange: "binance",
    },
    {
      title: "OKX Will List Arbitrum (ARB) for Spot Trading",
      exchange: "okx",
    },
    {
      title: "Notice on Bybit Spot Listing of BLUR/USDT Trading Pair",
      exchange: "bybit",
    },
    {
      title: "Scheduled System Maintenance - 2024-01-15",
      exchange: "binance",
    },
    {
      title: "Gate.io Startup: Participate in SUI Token Sale",
      exchange: "gate",
    },
  ];

  try {
    // 处理公告
    await analyzer.processAnnouncements(sampleAnnouncements);

    // 生成报告
    analyzer.generateReport();

    // 保存结果
    analyzer.saveResults();
  } catch (error) {
    console.error("处理失败:", error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = AnnouncementAnalyzer;
