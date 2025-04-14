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
              description: "", // OKX没有description字段
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
            description: "",
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

    // Jumpstart特殊处理
    if (title.includes("on OKX Jumpstart")) {
      types.push("jumpstart");
      return types; // Jumpstart是独立分类，直接返回
    }

    // 判断是否是盘前交易
    if (lowerTitle.includes("pre-market")) {
      types.push("盘前");
    }

    // 判断是否是上新公告 - 改进判断逻辑
    if (
      // 标准上新公告
      ((lowerTitle.includes("list") || lowerTitle.includes("add")) &&
        (lowerTitle.includes("for spot trading") ||
          lowerTitle.includes("spot trading pair"))) ||
      // 新增支持交易对的公告
      (lowerTitle.includes("support") &&
        (lowerTitle.includes("spot trading pair") ||
          lowerTitle.includes("trading pairs"))) ||
      // 将要上线的交易对公告
      (lowerTitle.includes("will launch") &&
        lowerTitle.includes("/") &&
        lowerTitle.includes("for spot trading"))
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
      (title.includes("Will Launch") && !title.includes("spot trading")) ||
      title.includes("Perpetual Contract") ||
      title.includes("Perpetual Contracts") ||
      title.includes("Trading Bots") ||
      title.includes("Trading Bot") ||
      (title.includes("Margin") &&
        !title.includes("Simple Earn") &&
        !title.includes("for spot trading"))
    ) {
      return [];
    }

    const tokens = [];

    // 预处理标题
    let processedTitle = title
      .replace(
        /OKX (Will|Has|to|completed|Updates|delays|will|suspends)\s+/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

    // 模式1：处理标准格式 "Project Name (TOKEN)"
    const regex = /([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9]+)\)/g;
    let match;

    while ((match = regex.exec(processedTitle)) !== null) {
      const rawProjectName = match[1].trim();
      const tokenSymbol = match[2].trim();

      // 过滤掉基础货币和已知的非代币符号
      if (
        !tokenSymbol.endsWith("USDT") &&
        !["USD", "USDC", "BTC", "ETH", "BNB", "BUSD"].includes(tokenSymbol)
      ) {
        // 清理项目名称，移除常见前缀
        let projectName = this.cleanProjectName(rawProjectName);

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
      const rawProjectName = match[1].trim();
      const tokenSymbol = match[2].trim();

      // 清理项目名称
      let projectName = this.cleanProjectName(rawProjectName);

      // 避免添加重复代币
      if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
        tokens.push({
          tokenName: tokenSymbol,
          projectName: projectName,
        });
      }
    }

    // 模式3：处理多代币列表
    if (
      processedTitle.includes("list") &&
      processedTitle.includes("for spot trading")
    ) {
      // 提取列表部分
      const listMatch = processedTitle.match(/list\s+([A-Z0-9,\s]+)\s+for/i);
      if (listMatch) {
        const tokenList = listMatch[1];
        // 分割并清理代币列表
        const tokenItems = tokenList.split(",").map((item) => item.trim());

        for (const item of tokenItems) {
          // 如果是单个代币标识符(全大写或含数字的标识符)
          if (/^[A-Z0-9]+$/.test(item) && item !== "AND") {
            // 确保不是已经提取的
            if (!tokens.some((t) => t.tokenName === item)) {
              // 尝试从标题中提取项目名称
              let projectName = this.findProjectNameForToken(
                item,
                processedTitle
              );

              tokens.push({
                tokenName: item,
                projectName: projectName,
              });
            }
          }
        }
      }
    }

    // 模式4：处理交易对格式
    const pairRegex = /([A-Z0-9]+)\/([A-Z0-9]+)/g;
    while ((match = pairRegex.exec(processedTitle)) !== null) {
      const baseToken = match[1];
      const quoteToken = match[2];

      // 基础货币通常是USDT, USDC等
      const baseIsBaseCurrency = ["USDT", "USDC", "BTC", "ETH", "BNB"].includes(
        baseToken
      );
      const quoteIsBaseCurrency = [
        "USDT",
        "USDC",
        "BTC",
        "ETH",
        "BNB",
      ].includes(quoteToken);

      // 如果基础货币是标准货币，则提取计价货币作为代币
      if (baseIsBaseCurrency && !quoteIsBaseCurrency) {
        if (!tokens.some((t) => t.tokenName === quoteToken)) {
          // 尝试从标题中找到项目名
          let projectName = this.findProjectNameForToken(
            quoteToken,
            processedTitle
          );

          tokens.push({
            tokenName: quoteToken,
            projectName: projectName,
          });
        }
      }
      // 如果计价货币是标准货币，则提取基础货币作为代币
      else if (!baseIsBaseCurrency && quoteIsBaseCurrency) {
        if (!tokens.some((t) => t.tokenName === baseToken)) {
          // 尝试从标题中找到项目名
          let projectName = this.findProjectNameForToken(
            baseToken,
            processedTitle
          );

          tokens.push({
            tokenName: baseToken,
            projectName: projectName,
          });
        }
      }
    }

    // 模式5：处理Jumpstart公告
    if (title.includes("Introducing") && title.includes("on OKX Jumpstart")) {
      const jumpstartRegex =
        /Introducing\s+([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9•\-\.]+)\)/i;
      const jumpstartMatch = title.match(jumpstartRegex);

      if (jumpstartMatch) {
        const rawProjectName = jumpstartMatch[1].trim();
        let tokenSymbol = jumpstartMatch[2].trim();

        // 清理项目名称
        let projectName = this.cleanProjectName(rawProjectName);

        // 对于特殊情况处理分隔符
        if (tokenSymbol.includes("•")) {
          // 对于RUNECOIN特殊情况
          if (tokenSymbol === "RSIC•GENESIS•RUNE") {
            tokenSymbol = "RUNE";
          } else {
            // 其他情况取最后一部分
            tokenSymbol = tokenSymbol.split("•").pop();
          }
        }

        if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
          tokens.push({
            tokenName: tokenSymbol,
            projectName: projectName,
          });
        }
      }
    }

    // 模式6：通过其他特定模式查找项目名
    // 检查特殊模式如 "airdrop" 和 "completed distributing"
    if (tokens.length > 0) {
      for (let i = 0; i < tokens.length; i++) {
        if (!tokens[i].projectName) {
          // 尝试从特殊模式中提取项目名
          if (title.includes("airdrop")) {
            const airdropMatch = title.match(
              /distributing\s+([A-Za-z0-9\s]+)\s+\(([A-Z0-9]+)\)/i
            );
            if (airdropMatch && airdropMatch[2] === tokens[i].tokenName) {
              tokens[i].projectName = this.cleanProjectName(airdropMatch[1]);
            }
          }

          // 尝试从其他标题模式提取
          if (!tokens[i].projectName) {
            tokens[i].projectName = this.findProjectNameForToken(
              tokens[i].tokenName,
              title
            );
          }
        }
      }
    }

    return tokens;
  }

  // 新增辅助方法：清理项目名
  static cleanProjectName(rawName) {
    if (!rawName) return null;

    return rawName
      .replace(
        /^(list|listing|add|adding|support|supporting|on|for|the|delay|delays|completed|distributing|open|Introducing)\s+/i,
        ""
      )
      .replace(/\s+(list|listing|of|on|for|with|and|by)\s+/i, " ")
      .replace(/\s+$/, "")
      .trim();
  }

  // 新增辅助方法：根据代币符号在标题中查找项目名
  static findProjectNameForToken(tokenSymbol, title) {
    if (!tokenSymbol || !title) return null;

    // 尝试各种模式匹配
    // 1. TOKEN (Project Name)
    const pattern1 = new RegExp(`${tokenSymbol}\\s*\\(([^)]+)\\)`, "i");
    const match1 = title.match(pattern1);
    if (match1) return this.cleanProjectName(match1[1]);

    // 2. Project Name (TOKEN)
    const pattern2 = new RegExp(
      `([A-Za-z0-9'\\s\\.\\-&]+?)\\s*\\(${tokenSymbol}\\)`,
      "i"
    );
    const match2 = title.match(pattern2);
    if (match2) return this.cleanProjectName(match2[1]);

    // 3. list PROJECT for spot trading
    if (title.toLowerCase().includes(`list ${tokenSymbol.toLowerCase()} for`)) {
      return tokenSymbol;
    }

    // 4. 特殊模式：completed distributing Project (TOKEN)
    if (title.includes("completed distributing")) {
      const pattern4 = new RegExp(
        `completed distributing\\s+([A-Za-z0-9'\\s\\.\\-&]+?)\\s*\\(${tokenSymbol}\\)`,
        "i"
      );
      const match4 = title.match(pattern4);
      if (match4) return this.cleanProjectName(match4[1]);
    }

    // 5. will launch / open / list TOKEN
    const pattern5 = new RegExp(
      `(will launch|open|list)\\s+([A-Za-z0-9'\\s\\.\\-&]+?)\\s*\\(${tokenSymbol}\\)`,
      "i"
    );
    const match5 = title.match(pattern5);
    if (match5) return this.cleanProjectName(match5[2]);

    return null;
  }
}

module.exports = OkxService;
