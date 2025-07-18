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
   - 创新: Innovation Zone，以及Seed Tag
   - HODLer: HODLer Airdrops
   - Megadrop: Binance Megadrop
   - Alpha: Binance Alpha
   - 未分类: 其他类型

2. 提取代币信息（增强版）：
   - 优先提取同时具有name和symbol的代币信息
   - 公告如果只有symbol，就单独提取symbol，公告没有name不要自行生成
   - 代币名称 (name): 项目全名（如果有的话）
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

需要遵循的规则：
- categories是数组，可以包含多个分类
- 如果公告中不包含代币信息（甚至symbol都没有），tokens数组为空
- 未分类类型只有在无法归类到其他类型时才使用
- 置信度低于0.9（不包括0.9）直接归为未分类
- "Binance Will Add xx on Earn, Buy Crypto, Convert & Margin" 这种公告格式一般是上新类型，如果有Futures则为上新和合约类型
- "Binance Futures Will Launch xx" 这种公告格式一般是合约类型，不会和上新同时存在
- 如"Cross Margin" "Isolated Margin"，一般是单独出现，这条公告可以归到未分类
- "Notice on New Trading Pairs xxx" 这种公告暂时都归到未分类
`;
  }

  // 获取Binance原始公告数据（不进行AI分析）
  static async getRawAnnouncements(page = 1) {
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

        // 返回原始公告数据，不进行AI分析
        return articles.map((item) => ({
          exchange: "Binance",
          title: item.title,
          description: "", // Binance API中没有返回描述
          url: `https://www.binance.com/zh-CN/support/announcement/${item.code}`,
          publishTime: new Date(parseInt(item.releaseDate)),
          code: item.code,
          // 不包含AI分析结果，这些将在后续步骤中添加
        }));
      }

      return [];
    } catch (error) {
      console.error("获取Binance原始公告失败:", error.message);
      return [];
    }
  }

  /**
   * 对单个公告进行AI分析
   * @param {Object} rawAnnouncement - 原始公告对象
   * @returns {Promise<Array>} 分析后的公告数组（可能包含多个类型）
   */
  static async analyzeAnnouncementWithAI(rawAnnouncement) {
    try {
      const aiAnalyzer = new AIAnalyzerService();

      // 使用AI分析公告
      const prompt = BinanceService.getBinancePrompt(
        rawAnnouncement.title,
        "Binance"
      );
      const aiAnalysis = await aiAnalyzer.analyzeAnnouncement(
        rawAnnouncement.title,
        "Binance",
        prompt
      );

      // 转换AI分析结果为tokenInfoArray格式
      const tokenInfoArray = aiAnalysis.tokens.map((token) => ({
        name: token.name, // 代币完整名称
        symbol: token.symbol, // 代币符号
      }));

      // 创建基本公告对象
      const baseAnnouncement = {
        ...rawAnnouncement,
        tokenInfoArray: tokenInfoArray,
        aiAnalysis: aiAnalysis, // 保存AI分析结果
      };

      // 使用AI分析结果中的分类
      const types = aiAnalysis.categories || ["未分类"];

      // 为每个类型创建一条公告
      const processedAnnouncements = [];
      for (const type of types) {
        const announcementWithType = { ...baseAnnouncement, type: type };
        processedAnnouncements.push(announcementWithType);
      }

      return processedAnnouncements;
    } catch (error) {
      console.error(
        `Binance公告AI分析失败: ${rawAnnouncement.title}`,
        error.message
      );
      // 返回未分类的公告
      return [
        {
          ...rawAnnouncement,
          type: "未分类",
          tokenInfoArray: [],
          aiAnalysis: null,
        },
      ];
    }
  }
}

module.exports = BinanceService;
