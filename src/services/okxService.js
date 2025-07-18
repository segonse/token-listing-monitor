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
- perpetual代表永续合约，一般属于合约类型公告
- 如果某个公告是jumpstart分类，那么就不必添加其他分类了
`;
  }
  // 获取OKX原始公告数据（不进行AI分析）
  static async getRawAnnouncements(page = 1) {
    try {
      const newListings = await this.getRawNewListingsAnnouncements(page);

      // 只有在获取第一页时才获取jumpstart公告
      let jumpstartAnnouncements = [];
      if (page === 1) {
        jumpstartAnnouncements = await this.getRawJumpstartAnnouncements();
      }

      return [...newListings, ...jumpstartAnnouncements];
    } catch (error) {
      console.error("获取OKX原始公告失败:", error.message);
      return [];
    }
  }

  // 获取OKX新币上线原始公告数据
  static async getRawNewListingsAnnouncements(page = 1) {
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

        // 返回原始公告数据，不进行AI分析
        return announcements.map((item) => ({
          exchange: "OKX",
          title: item.title,
          description: "", // OKX没有description字段
          url: item.url,
          publishTime: new Date(parseInt(item.pTime)),
          // 不包含AI分析结果，这些将在后续步骤中添加
        }));
      }

      return [];
    } catch (error) {
      console.error("获取OKX新币上线原始公告失败:", error.message);
      return [];
    }
  }

  // 获取OKX Jumpstart原始公告数据
  static async getRawJumpstartAnnouncements() {
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

        // 返回原始公告数据，不进行AI分析
        return announcements.map((item) => ({
          exchange: "OKX",
          title: item.title,
          description: "",
          url: item.url,
          publishTime: new Date(parseInt(item.pTime)),
          // 标记为jumpstart类型，但不进行AI分析
          originalType: "jumpstart",
        }));
      }

      return [];
    } catch (error) {
      console.error("获取OKX Jumpstart原始公告失败:", error.message);
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

      // 如果是jumpstart类型，直接使用固定分类
      if (rawAnnouncement.originalType === "jumpstart") {
        return [
          {
            ...rawAnnouncement,
            type: "jumpstart",
            tokenInfoArray: [],
            aiAnalysis: null,
          },
        ];
      }

      // 使用AI分析公告
      const prompt = this.getOkxPrompt(rawAnnouncement.title, "OKX");
      const aiAnalysis = await aiAnalyzer.analyzeAnnouncement(
        rawAnnouncement.title,
        "OKX",
        prompt
      );

      // 转换AI分析结果为tokenInfoArray格式
      const tokenInfoArray = aiAnalysis.tokens
        ? aiAnalysis.tokens.map((token) => ({
            name: token.name,
            symbol: token.symbol,
          }))
        : [];

      // 创建基本公告对象
      const baseAnnouncement = {
        ...rawAnnouncement,
        tokenInfoArray: tokenInfoArray,
        aiAnalysis: aiAnalysis,
      };

      // 使用AI分析结果中的分类
      const types =
        aiAnalysis.categories && aiAnalysis.categories.length > 0
          ? aiAnalysis.categories
          : ["未分类"];

      // 为每个类型创建一条公告
      const processedAnnouncements = [];
      for (const type of types) {
        const announcementWithType = { ...baseAnnouncement, type: type };
        processedAnnouncements.push(announcementWithType);
      }

      return processedAnnouncements;
    } catch (error) {
      console.error(
        `OKX公告AI分析失败: ${rawAnnouncement.title}`,
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

module.exports = OkxService;
