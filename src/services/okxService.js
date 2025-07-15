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
   - jumpstart: OKX Jumpstart项目
   - 空投: 空投相关
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
- 如果是交易对格式（如BTC/USDT），不提取代币信息，但需要注意提取对应分类
- perpetual代表永续合约，一般属于合约类型公告
- 如果某个公告是jumpstart分类，那么就不必添加其他分类了
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

        let processedAnnouncements = [];

        // 使用AI分析器处理公告（避免重复调用）
        const aiAnalyzer = new AIAnalyzerService();

        for (const item of announcements) {
          const title = item.title;

          // 使用AI分析公告（一次调用获得分类和代币信息）
          const prompt = this.getOkxPrompt(title, "OKX");
          const aiAnalysis = await aiAnalyzer.analyzeAnnouncement(
            title,
            "OKX",
            prompt
          );

          // 转换AI分析结果为tokenInfoArray格式
          const tokenInfoArray = aiAnalysis.tokens
            ? aiAnalysis.tokens.map((token) => ({
                tokenName: token.symbol,
                projectName: token.name,
              }))
            : [];

          // 创建基本公告对象
          const baseAnnouncement = {
            exchange: "OKX",
            title: item.title,
            description: "", // OKX没有description字段
            url: item.url,
            publishTime: new Date(parseInt(item.pTime)),
            tokenInfoArray: tokenInfoArray,
            aiAnalysis: aiAnalysis, // 保存AI分析结果
          };

          // 使用AI分析结果中的分类
          const types =
            aiAnalysis.categories && aiAnalysis.categories.length > 0
              ? aiAnalysis.categories
              : ["未分类"];

          // 为每个类型创建一条公告
          for (const type of types) {
            const announcementWithType = { ...baseAnnouncement, type: type };
            processedAnnouncements.push(announcementWithType);
          }

          // 添加延迟避免AI API限制
          if (announcements.indexOf(item) < announcements.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        return processedAnnouncements;
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

        let processedAnnouncements = [];

        // 使用AI分析器处理公告
        const aiAnalyzer = new AIAnalyzerService();

        for (const item of announcements) {
          const title = item.title;

          // 使用AI分析公告
          const prompt = this.getOkxPrompt(title, "OKX");
          const aiAnalysis = await aiAnalyzer.analyzeAnnouncement(
            title,
            "OKX",
            prompt
          );

          // 转换AI分析结果为tokenInfoArray格式
          const tokenInfoArray = aiAnalysis.tokens
            ? aiAnalysis.tokens.map((token) => ({
                tokenName: token.symbol,
                projectName: token.name,
              }))
            : [];

          const announcement = {
            exchange: "OKX",
            title: item.title,
            description: "",
            type: "jumpstart", // 所有Jumpstart公告统一分类
            url: item.url,
            publishTime: new Date(parseInt(item.pTime)),
            tokenInfoArray: tokenInfoArray,
            aiAnalysis: aiAnalysis, // 保存AI分析结果
          };

          processedAnnouncements.push(announcement);

          // 添加延迟避免AI API限制
          if (announcements.indexOf(item) < announcements.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        return processedAnnouncements;
      }

      return [];
    } catch (error) {
      console.error("获取OKX Jumpstart公告失败:", error.message);
      return [];
    }
  }
}

module.exports = OkxService;
