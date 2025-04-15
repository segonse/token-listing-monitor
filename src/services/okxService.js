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

    let tokens = []; // 使用 let 声明，因为后面会重新赋值

    // 预处理标题
    let processedTitle = title
      .replace(
        /OKX (Will|Has|to|completed|Updates|delays|will|suspends)\s+/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

    // 定义修正表
    const corrections = {
      // 代币名: { project: "正确的项目名" }
      L3: { project: "Layer3" },
      MAJOR: { project: "Major" },
      MONKY: { project: "Wise Monkey" },
      APE: { project: "ApeCoin" },
      DUCK: { project: "DuckChain" },
      NC: { project: "Nodecoin" },
      J: { project: "Jambo" },
      MOVE: { project: "Movement" },
      BABY: { project: "Babylon" },
      RUNECOIN: { project: "RSIC•GENESIS•RUNE" },
      MEMEFI: { project: "MemeFi" },
      SCR: { project: "Scroll" },
      MORPHO: { project: "Morpho" },
      PROMPT: { project: "Wayfinder" },
      ULTI: { project: "Ultiverse" },
      ZK: { project: "Polyhedra Network" }, // 注意：可能有多个ZK，这个修正可能需要更精确的上下文
      GPT: { project: "QnA3.AI" },
      ZETA: { project: "ZetaChain" },
      SLN: { project: "Smart Layer Network" },
      DMAIL: { project: "Dmail" },
      ICE: { project: "Ice" },
      FOXY: { project: "Foxy" },
      ZEUS: { project: "Zeus Network" },
      VENOM: { project: "Venom" },
      ZERO: { project: "ZeroLend" },
      MSN: { project: "Meson Network" },
      MERL: { project: "Merlin Chain" },
      PRCL: { project: "Parcl" },
      BLOCK: { project: "BlockGames" },
      ATH: { project: "Aethir" },
      MAX: { project: "Matr1x" }, // 更新MAX项目名
      UXLINK: { project: "UXLINK" },
      XR: { project: "Xraders" },
      CATI: { project: "Catizen" },
      PYUSD: { project: "PayPal USD" },
      SWELL: { project: "Swell" },
      CAT: { project: "Simons Cat" },
      ANIME: { project: "Animecoin" },
      WCT: { project: "WalletConnect" },
      FLUID: { project: "Fluid" },
      NOT: { project: "Notcoin" },
      // ... 可根据需要继续添加旧公告的修正 ...
    };

    // 1. 优先检查修正表
    let handledByCorrection = false;
    for (const [tokenName, info] of Object.entries(corrections)) {
      // 检查标题中是否明确包含 "项目名 (代币名)" 或 "代币名 (项目名)" 格式
      const regex1 = new RegExp(
        `\\b${tokenName}\\s*\\((${info.project})\\)`,
        "i"
      ); // TOKEN (Project)
      const regex2 = new RegExp(
        `\\b${info.project}\\s*\\((${tokenName})\\)`,
        "i"
      ); // Project (TOKEN)
      const regex3 = new RegExp(`\\b${tokenName}\\b`, "i"); // 仅检查代币名是否存在

      if (
        regex1.test(processedTitle) ||
        regex2.test(processedTitle) ||
        (title.includes(info.project) && regex3.test(processedTitle))
      ) {
        if (!tokens.some((t) => t.tokenName === tokenName)) {
          tokens.push({ tokenName: tokenName, projectName: info.project });
          handledByCorrection = true;
        }
      }
    }

    // 2. 如果未被修正表处理，则使用通用正则匹配 (优先新格式)
    if (!handledByCorrection) {
      // 特殊处理：Jumpstart公告 (保持之前的逻辑，因为它格式相对固定)
      if (title.includes("Introducing") && title.includes("on OKX Jumpstart")) {
        const jumpstartRegex =
          /Introducing\s+([A-Za-z0-9'\s\.\-&•]+?)\s*\(([A-Za-z0-9•\-\.]+)\)/i;
        const jumpstartMatch = title.match(jumpstartRegex);
        if (jumpstartMatch) {
          let name1 = jumpstartMatch[1].trim();
          let name2 = jumpstartMatch[2].trim();
          let tokenSymbol, projectName;
          if (name2 === "RSIC•GENESIS•RUNE" || name1 === "RUNECOIN") {
            tokenSymbol = "RUNECOIN";
            projectName = "RSIC•GENESIS•RUNE";
          } else if (/^[A-Z0-9•]+$/.test(name2) && name2.length < 15) {
            tokenSymbol = name2.split("•").pop();
            projectName = name1;
          } else if (/^[A-Z0-9•]+$/.test(name1) && name1.length < 15) {
            tokenSymbol = name1;
            projectName = name2;
          } else {
            tokenSymbol = name1.length < name2.length ? name1 : name2;
            projectName = name1.length < name2.length ? name2 : name1;
          }
          projectName = this.cleanProjectName(projectName);
          if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
            tokens.push({ tokenName: tokenSymbol, projectName: projectName });
          }
        }
      } else {
        // 处理标准公告格式，优先 TOKEN (ProjectName)
        const standardRegex =
          /([A-Za-z0-9'\s\.\-&•]+?)\s*\(([A-Za-z0-9•\-\.]+)\)/g;
        let match;

        while ((match = standardRegex.exec(processedTitle)) !== null) {
          let part1 = match[1].trim(); // 括号外部分
          let part2 = match[2].trim(); // 括号内部分

          let tokenSymbol, projectName;

          // 默认优先新格式: part1 = TOKEN, part2 = ProjectName
          tokenSymbol = part1;
          projectName = part2;

          // 检查是否更像旧格式: part2是全大写/数字且较短，part1较长或包含空格/混合大小写
          const part2LooksLikeToken =
            /^[A-Z0-9•]+$/.test(part2) && part2.length < 15;
          const part1LooksLikeProject =
            part1.length > part2.length ||
            /\s/.test(part1) ||
            /[a-z]/.test(part1);

          if (part2LooksLikeToken && part1LooksLikeProject) {
            // 如果符合旧格式特征，则交换
            tokenSymbol = part2;
            projectName = part1;
          }

          // 清理代币符号前缀 - 新增：移除前缀"list"、"add"等
          tokenSymbol = tokenSymbol.replace(/^(list|add|support)\s+/i, "");

          // 清理代币符号中的特殊字符
          if (tokenSymbol.includes("•")) {
            tokenSymbol = tokenSymbol.split("•").pop();
          }

          // 清理项目名
          projectName = this.cleanProjectName(projectName);

          // 过滤基础货币并去重
          if (
            !tokenSymbol.endsWith("USDT") &&
            !["USD", "USDC", "BTC", "ETH", "BNB", "BUSD"].includes(
              tokenSymbol
            ) &&
            !tokens.some((t) => t.tokenName === tokenSymbol)
          ) {
            tokens.push({
              tokenName: tokenSymbol,
              projectName: projectName,
            });
          }
        }
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
          // 清理可能的前缀（如list，虽然不太可能出现在这里）
          const cleanedItem = item.replace(/^(list|add|support)\s+/i, "");

          // 如果是单个代币标识符(全大写或含数字的标识符)
          if (/^[A-Z0-9]+$/.test(cleanedItem) && cleanedItem !== "AND") {
            // 确保不是已经提取的
            if (!tokens.some((t) => t.tokenName === cleanedItem)) {
              // 尝试从标题中提取项目名称
              let projectName = this.findProjectNameForToken(
                cleanedItem,
                processedTitle
              );

              tokens.push({
                tokenName: cleanedItem,
                projectName: projectName,
              });
            }
          }
        }
      }
    }

    // 模式4：处理交易对格式
    const pairRegex = /([A-Z0-9]+)\/([A-Z0-9]+)/g;
    let pairMatch;
    while ((pairMatch = pairRegex.exec(processedTitle)) !== null) {
      const baseToken = pairMatch[1];
      const quoteToken = pairMatch[2];

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

    // 3. 最终清理和修正 (对所有提取到的 tokens 应用)
    tokens = tokens
      .map((token) => {
        // 应用修正表（再次确保，以防通用逻辑覆盖了修正）
        if (corrections[token.tokenName]) {
          token.projectName = corrections[token.tokenName].project;
        }

        // 清理项目名中的前缀
        if (token.projectName) {
          token.projectName = this.cleanProjectName(token.projectName); // 确保调用清理函数
          token.projectName = token.projectName
            .replace(
              /^(listing|distributing|airdrop|pre-market futures for|pre-market for)\s+/i,
              ""
            )
            .trim();
        }
        return token;
      })
      .filter((token) => token.tokenName); // 过滤掉没有提取到 tokenName 的情况

    // 移除重复的代币条目（基于 tokenName）
    const uniqueTokens = [];
    const seenTokenNames = new Set();
    for (const token of tokens) {
      if (!seenTokenNames.has(token.tokenName)) {
        uniqueTokens.push(token);
        seenTokenNames.add(token.tokenName);
      }
    }

    return uniqueTokens;
  }

  // 新增辅助方法：清理项目名
  static cleanProjectName(rawName) {
    if (!rawName) return null;

    return (
      rawName
        // 移除开头的常见前缀词，增加"Announcement on Listing"
        .replace(
          /^(list|listing|add|adding|support|supporting|on|for|the|delay|delays|completed|distributing|open|introducing|pre-market futures for|pre-market for|pre-market|Announcement on Listing|OKX Announcement on Listing|OKX Announcement)\s+/i,
          ""
        )
        // 移除中间的常见连接词
        .replace(
          /\s+(list|listing|of|on|for|with|and|by|crypto|futures|airdrop)\s+/i,
          " "
        )
        // 移除后缀
        .replace(/\s+(crypto|token)$/i, "")
        .replace(/\s+$/, "")
        .trim()
    );
  }

  // 新增辅助方法：根据代币符号在标题中查找项目名
  static findProjectNameForToken(tokenSymbol, title) {
    if (!tokenSymbol || !title) return null;

    // 对于特定公告格式的处理，例如 "pre-market futures for MAJOR (Major)"
    if (title.includes("pre-market futures for")) {
      const preMarketPattern = new RegExp(
        `pre-market futures for\\s+${tokenSymbol}\\s*\\(([^)]+)\\)`,
        "i"
      );
      const preMarketMatch = title.match(preMarketPattern);
      if (preMarketMatch) {
        return this.cleanProjectName(preMarketMatch[1]);
      }
    }

    // OKX格式：TOKEN (Project)
    const okxPattern1 = new RegExp(`\\b${tokenSymbol}\\s*\\(([^)]+)\\)`, "i");
    const okxMatch1 = title.match(okxPattern1);
    if (okxMatch1) {
      return this.cleanProjectName(okxMatch1[1]);
    }

    // 反向格式：Project (TOKEN)
    const okxPattern2 = new RegExp(`([^(]+)\\s*\\(${tokenSymbol}\\)`, "i");
    const okxMatch2 = title.match(okxPattern2);
    if (okxMatch2) {
      return this.cleanProjectName(okxMatch2[1]);
    }

    // 其他特殊情况处理...

    return null;
  }
}

module.exports = OkxService;
