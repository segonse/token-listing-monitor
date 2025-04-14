const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class OkxService {
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

        return announcements
          .map((item) => {
            // 基本公告信息
            const baseAnnouncement = {
              exchange: "OKX",
              title: item.title,
              description: item.title, // OKX没有description字段，使用title代替
              url: item.url,
              publishTime: new Date(parseInt(item.pTime)),
              // 提取代币信息
              tokenInfoArray: this.extractTokenInfo(item.title),
            };

            // 判断公告类型
            const types = this.determineAnnouncementTypes(item.title);

            // 将每种类型创建一个独立的公告对象
            return types.map((type) => ({
              ...baseAnnouncement,
              type,
            }));
          })
          .flat(); // 展平数组
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

        return announcements.map((item) => {
          return {
            exchange: "OKX",
            title: item.title,
            description: item.title,
            type: "jumpstart", // 所有Jumpstart公告统一分类
            url: item.url,
            publishTime: new Date(parseInt(item.pTime)),
            tokenInfoArray: this.extractTokenInfo(item.title),
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取OKX Jumpstart公告失败:", error.message);
      return [];
    }
  }

  // 判断公告类型
  static determineAnnouncementTypes(title) {
    const lowerTitle = title.toLowerCase();
    const types = [];

    // 判断是否是盘前交易
    if (lowerTitle.includes("pre-market")) {
      types.push("盘前");
    }

    // 判断是否是上新公告
    if (
      (lowerTitle.includes("list") || lowerTitle.includes("add")) &&
      (lowerTitle.includes("for spot trading") ||
        lowerTitle.includes("spot trading pair"))
    ) {
      types.push("上新");
    }

    // 判断是否是合约相关
    if (
      lowerTitle.includes("perpetual") ||
      lowerTitle.includes("futures") ||
      lowerTitle.includes("contracts") ||
      lowerTitle.includes("margin trading")
    ) {
      types.push("合约");
    }

    // 判断是否是分发空投
    if (lowerTitle.includes("airdrop") && lowerTitle.includes("completed")) {
      types.push("空投");
    }

    // 如果没有识别出类型，则标记为其他
    if (types.length === 0) {
      types.push("未分类");
    }

    return types;
  }

  // 提取代币信息
  static extractTokenInfo(title) {
    // 跳过不需要处理的公告类型
    if (
      title.includes("Will Launch") ||
      title.includes("Perpetual Contract") ||
      title.includes("Perpetual Contracts") ||
      title.includes("Trading Bots") ||
      title.includes("Trading Bot") ||
      (title.includes("Margin") && !title.includes("Simple Earn"))
    ) {
      return [];
    }

    const tokens = [];

    // 预处理标题
    let processedTitle = title
      .replace(/OKX (Will|Has|to|completed|Updates|delays)\s+/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // 模式1：处理标准格式 "Project Name (TOKEN)"
    const regex = /([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9]+)\)/g;
    let match;

    while ((match = regex.exec(processedTitle)) !== null) {
      const projectName = match[1].trim();
      const tokenSymbol = match[2].trim();

      // 过滤掉基础货币和已知的非代币符号
      if (
        !tokenSymbol.endsWith("USDT") &&
        !["USD", "USDC", "BTC", "ETH", "BNB", "BUSD"].includes(tokenSymbol)
      ) {
        // 避免添加重复代币
        if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
          tokens.push({
            tokenName: tokenSymbol,
            projectName: projectName,
          });
        }
      }
    }

    // 模式2：处理带数字前缀的代币
    const alternateRegex = /([A-Za-z0-9'\s\.\-&]+?)\s*\((\d+[A-Za-z0-9]+)\)/g;
    while ((match = alternateRegex.exec(processedTitle)) !== null) {
      const projectName = match[1].trim();
      const tokenSymbol = match[2].trim();

      // 避免添加重复代币
      if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
        tokens.push({
          tokenName: tokenSymbol,
          projectName: projectName,
        });
      }
    }

    // 模式3：处理Jumpstart公告
    if (title.includes("Introducing") && title.includes("on OKX Jumpstart")) {
      const jumpstartRegex =
        /Introducing\s+([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9•\-\.]+)\)/i;
      const jumpstartMatch = title.match(jumpstartRegex);

      if (jumpstartMatch) {
        const projectName = jumpstartMatch[1].trim();
        const tokenSymbol = jumpstartMatch[2].trim();

        // 对于特殊情况如 RSIC•GENESIS•RUNE，取最后一部分作为代币名
        const finalTokenSymbol = tokenSymbol.split("•").pop();

        if (!tokens.some((t) => t.tokenName === finalTokenSymbol)) {
          tokens.push({
            tokenName: finalTokenSymbol,
            projectName: projectName,
          });
        }
      }
    }

    return tokens;
  }
}

module.exports = OkxService;
