const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");
const AIAnalyzerService = require("./aiAnalyzerService");

class OkxService {
  constructor() {
    this.aiAnalyzer = new AIAnalyzerService();
  }

  // OKX专用的AI分析提示词
  static getOkxPrompt(title, exchange) {
    return `
请分析以下OKX交易所公告标题，执行两个任务：

1. 分类公告类型（从以下选择一个或多个）：
   - 上新: 新代币上线/现货交易
   - 盘前: 盘前交易
   - 合约: 合约/期货相关
   - 下架: 代币或交易对下线/退市
   - launchpool: OKX Jumpstart项目
   - 创新: 创新区上线
   - 活动: 交易活动/奖励
   - 维护: 系统维护/升级
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
- 如果无法确定代币信息，tokens数组为空
- 如果是交易对格式（如BTC/USDT），不提取代币信息
- 置信度要根据标题的明确程度给出
- 分析说明要简洁明了
`;
  }
  // 获取OKX所有公告（包括new-listings和jumpstart）
  static async getAnnouncements(page = 1) {
    try {
      const newListings = await this.getNewListingsAnnouncements(page);

      // 只有在获取第一页时才获取jumpstart公告
      let jumpstartAnnouncements = [];
      if (page === 1) {
        jumpstartAnnouncements = await this.getJumpstartAnnouncements();
      }

      return [...newListings, ...jumpstartAnnouncements];
    } catch (error) {
      console.error("获取OKX公告失败:", error.message);
      return [];
    }
  }

  // 获取OKX新币上线公告
  static async getNewListingsAnnouncements(page = 1) {
    try {
      // 获取随机代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 修改配置中的 username，将 BR 替换为 TR
      proxyConfig.auth.username = proxyConfig.auth.username
        .replace("region-BR", "region-TR")
        .replace("sessid-BR", "sessid-TR");

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.get(
        "https://www.okx.com/api/v5/support/announcements",
        {
          params: {
            page: page,
            annType: "announcements-new-listings",
          },
          headers: {
            "Accept-Language": "en-US",
          },
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === "0" &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const announcements = response.data.data[0].details || [];

        const processedAnnouncements = await Promise.all(
          announcements.map(async (item) => {
            // 基本公告信息
            const baseAnnouncement = {
              exchange: "OKX",
              title: item.title,
              description: "", // OKX没有description字段
              url: item.url,
              publishTime: new Date(parseInt(item.pTime)),
              // 提取代币信息
              tokenInfoArray: await this.extractTokenInfo(item.title),
            };

            // 判断公告类型
            const types = await this.determineAnnouncementTypes(item.title);

            // 将每种类型创建一个独立的公告对象
            return types.map((type) => ({
              ...baseAnnouncement,
              type,
            }));
          })
        );

        return processedAnnouncements.flat(); // 展平数组
      }

      return [];
    } catch (error) {
      console.error("获取OKX新币上线公告失败:", error.message);
      return [];
    }
  }

  // 获取OKX Jumpstart公告
  static async getJumpstartAnnouncements() {
    try {
      // 获取随机代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 修改配置中的 username，将 BR 替换为 TR
      proxyConfig.auth.username = proxyConfig.auth.username
        .replace("region-BR", "region-TR")
        .replace("sessid-BR", "sessid-TR");

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.get(
        "https://www.okx.com/api/v5/support/announcements",
        {
          params: {
            page: 1,
            annType: "announcements-jumpstart",
          },
          headers: {
            "Accept-Language": "en-US",
          },
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === "0" &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const announcements = response.data.data[0].details || [];

        return await Promise.all(
          announcements.map(async (item) => {
            return {
              exchange: "OKX",
              title: item.title,
              description: "",
              type: "jumpstart", // 所有Jumpstart公告统一分类
              url: item.url,
              publishTime: new Date(parseInt(item.pTime)),
              tokenInfoArray: await this.extractTokenInfo(item.title),
            };
          })
        );
      }

      return [];
    } catch (error) {
      console.error("获取OKX Jumpstart公告失败:", error.message);
      return [];
    }
  }

  // 使用AI分析判断公告类型
  static async determineAnnouncementTypes(title) {
    const aiAnalyzer = new AIAnalyzerService();
    const prompt = this.getOkxPrompt(title, "OKX");
    const analysis = await aiAnalyzer.analyzeAnnouncement(title, "OKX", prompt);

    if (analysis && analysis.categories && Array.isArray(analysis.categories)) {
      return analysis.categories.length > 0 ? analysis.categories : ["未分类"];
    }

    return ["未分类"];
  }

  // 使用AI分析提取代币信息
  static async extractTokenInfo(title) {
    const aiAnalyzer = new AIAnalyzerService();
    const prompt = this.getOkxPrompt(title, "OKX");
    const analysis = await aiAnalyzer.analyzeAnnouncement(title, "OKX", prompt);

    if (analysis && analysis.tokens && Array.isArray(analysis.tokens)) {
      return analysis.tokens.map((token) => ({
        tokenName: token.symbol,
        projectName: token.name,
      }));
    }

    return [];
  }
}

module.exports = OkxService;
