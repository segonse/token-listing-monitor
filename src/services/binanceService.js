const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");
const AIAnalyzerService = require("./aiAnalyzerService");

class BinanceService {
  constructor() {
    this.aiAnalyzer = new AIAnalyzerService();
  }

  // Binance专用的AI分析提示词
  static getBinancePrompt(title, exchange) {
    return `
请分析以下Binance交易所公告标题，执行两个任务：

1. 分类公告类型（从以下选择一个或多个）：
   - 上新: 新代币上线/现货交易
   - 盘前: 盘前交易
   - 合约: 合约/期货相关
   - 下架: 代币或交易对下线/退市
   - launchpool: Binance Launchpool项目
   - launchpad: Binance Launchpad项目
   - 创新: 创新区上线
   - HODLer: HODLer Airdrops
   - Megadrop: Binance Megadrop
   - Alpha: Binance Alpha
   - 未分类: 其他类型

2. 如果公告同时具有代币的name和symbol，才提取代币信息。如果是交易对类型（包括上线和下线）则不提取代币信息且如果不是合约等分类则归到未分类：
   - 代币名称 (name): 项目全名
   - 代币符号 (symbol): 代币符号

公告标题: "${title}"
交易所: ${exchange}

请严格按照以下JSON格式返回结果：
{
  "categories": ["分类结果1", "分类结果2"],
  "confidence": 0-1之间的小数，表示置信度,
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
- 如果不包含新代币上线相关内容，tokens数组为空
- 未分类类型只有在无法归类到其他类型时才使用
- "Binance Will Add xx on Earn, Buy Crypto, Convert & Margin" 这种公告格式一般是上新类型，如果有Futures则为上新和合约类型
- "Binance Futures Will Launch xx" 这种公告格式一般是合约类型，不会和上新同时存在
`;
  }

  // 获取Binance公告
  static async getAnnouncements(page = 1) {
    try {
      // 获取随机代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.get(
        "https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query",
        {
          params: {
            type: 1,
            pageNo: page,
            pageSize: 50,
            catalogId: 48, // 新币上线分类
          },
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.catalogs &&
        response.data.data.catalogs.length > 0
      ) {
        const articles = response.data.data.catalogs[0].articles || [];
        let processedAnnouncements = [];

        // 使用AI分析器处理公告
        const aiAnalyzer = new AIAnalyzerService();

        for (const item of articles) {
          const title = item.title;

          // 使用AI分析公告
          const prompt = BinanceService.getBinancePrompt(title, "Binance");
          const aiAnalysis = await aiAnalyzer.analyzeAnnouncement(
            title,
            "Binance",
            prompt
          );

          // 转换AI分析结果为tokenInfoArray格式
          // AI分析结果: token.name=代币完整名称, token.symbol=代币符号
          // 数据库字段: tokens.name=代币完整名称, tokens.symbol=代币符号
          const tokenInfoArray = aiAnalysis.tokens.map((token) => ({
            name: token.name, // 代币完整名称
            symbol: token.symbol, // 代币符号
          }));

          // 创建基本公告对象
          const baseAnnouncement = {
            exchange: "Binance",
            title: item.title,
            description: "", // Binance API中没有返回描述
            url: `https://www.binance.com/zh-CN/support/announcement/${item.code}`,
            publishTime: new Date(parseInt(item.releaseDate)),
            code: item.code,
            tokenInfoArray: tokenInfoArray,
            aiAnalysis: aiAnalysis, // 保存AI分析结果
          };

          // 使用AI分析结果中的分类
          const types = aiAnalysis.categories || ["未分类"];

          // 为每个类型创建一条公告
          for (const type of types) {
            const announcementWithType = { ...baseAnnouncement, type: type };
            processedAnnouncements.push(announcementWithType);
          }

          // 添加延迟避免AI API限制
          if (articles.indexOf(item) < articles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        return processedAnnouncements;
      }

      return [];
    } catch (error) {
      console.error("获取Binance公告失败:", error.message);
      return [];
    }
  }
}

module.exports = BinanceService;
