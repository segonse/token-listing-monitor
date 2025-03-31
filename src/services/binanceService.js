const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class BinanceService {
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

        return articles.map((item) => {
          const title = item.title;
          const lowerTitle = title.toLowerCase();

          // 判断公告类型
          let type = "未分类"; // 默认为未分类

          // 处理特殊情况：先检查是否是结束盘前并上新币的公告
          if (
            lowerTitle.includes("end the") &&
            lowerTitle.includes("pre-market") &&
            lowerTitle.includes("list")
          ) {
            type = "上新";
          }
          // 处理同时包含盘前和launchpool/launchpad的情况
          else if (
            lowerTitle.includes("pre-market") &&
            (lowerTitle.includes("launchpool") ||
              lowerTitle.includes("launchpad"))
          ) {
            // 区分launchpool和launchpad
            if (lowerTitle.includes("launchpool")) {
              type = "盘前+launchpool";
            } else {
              type = "盘前+launchpad";
            }
          }
          // 检查是否是普通上币公告
          else if (
            lowerTitle.includes("list") &&
            !lowerTitle.includes("pre-market")
          ) {
            type = "上新";
          }
          // 检查是否是盘前公告
          else if (lowerTitle.includes("pre-market")) {
            type = "盘前";
          }
          // 区分launchpool和launchpad
          else if (lowerTitle.includes("launchpool")) {
            type = "launchpool";
          } else if (lowerTitle.includes("launchpad")) {
            type = "launchpad";
          }
          // 检查是否是合约公告
          else if (
            (lowerTitle.includes("future") || lowerTitle.includes("futures")) &&
            (lowerTitle.includes("contract") ||
              lowerTitle.includes("contracts"))
          ) {
            type = "合约";
          }
          // 检查是否是创新区公告
          else if (lowerTitle.includes("innovation zone")) {
            type = "创新";
          }

          // 提取代币信息，现在返回数组
          const tokenInfoArray = this.extractTokenInfo(title);

          // 构建公告对象，不再包含单个代币信息
          return {
            exchange: "Binance",
            title: item.title,
            description: "", // Binance API中没有返回描述
            type: type,
            url: `https://www.binance.com/zh-CN/support/announcement/${item.code}`,
            publishTime: new Date(parseInt(item.releaseDate)),
            code: item.code,
            // 保留完整的代币信息数组，供后续处理
            tokenInfoArray: tokenInfoArray,
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取Binance公告失败:", error.message);
      return [];
    }
  }

  // 从标题中提取代币和项目信息，返回数组
  static extractTokenInfo(title) {
    // 跳过不需要处理的公告类型
    if (
      // 跳过合约相关公告
      title.includes("Futures Will Launch") ||
      title.includes("Perpetual Contract") ||
      title.includes("Perpetual Contracts") ||
      title.includes("Delivery Contracts") ||
      // 跳过通知类公告
      title.includes("Notice on New Trading") ||
      title.includes("Notice on Trading") ||
      title.includes("Trading Bots Services") ||
      title.includes("Copy Trading") ||
      title.includes("Trading Pair") ||
      title.includes("Will Open Trading for") ||
      title.includes("Auto-Invest Adds") ||
      // 跳过Options相关公告
      title.includes("Options RFQ") ||
      // 跳过Margin相关公告
      title.includes("Cross Margin") ||
      title.includes("Isolated Margin") ||
      (title.includes("Margin") &&
        !title.includes("on Earn") &&
        !title.includes("Convert"))
    ) {
      return [];
    }

    // 返回数组，可以包含多个代币信息
    const tokens = [];

    // 预处理标题，移除多种前缀词组
    let processedTitle = title
      // 移除公告通用前缀
      .replace(
        /Binance (Will|Has|Adds|Added|Announced|Will Continue to|Will End the|Will List)\s+/gi,
        ""
      )
      .replace(/Introducing\s+/gi, "")
      // 移除"Subscription for"和类似前缀
      .replace(/Subscription\s+for\s+(the\s+)?/gi, "")
      .replace(/Token\s+Sale\s+on/gi, "on")
      .replace(/Is\s+Now\s+Open/gi, "")
      // 移除项目名称中的各种前缀
      .replace(/\b(Add|Added|List)\s+/gi, "")
      .replace(/\d{4}-\d{2}-\d{2}/g, "") // 移除日期格式 YYYY-MM-DD
      .replace(/\(\d{4}-\d{2}-\d{2}\)/g, "") // 移除括号中的日期
      .replace(/\b\d{4}\b/g, "") // 仅移除独立的四位数年份，不影响代币名称
      .replace(/\s+/g, " ") // 合并多个空格
      .trim();

    // 处理从Launchpool或HODLer Airdrops公告中提取代币信息
    if (title.includes("Launchpool") || title.includes("HODLer Airdrops")) {
      // 正则表达式匹配形如 "Introducing Xai (XAI) on Binance Launchpool" 的模式
      const specialRegex =
        /(?:Introducing|Binance Will Add|Binance Adds)\s+([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9]+)\)/i;
      const specialMatch = title.match(specialRegex);

      if (specialMatch) {
        const projectName = specialMatch[1].trim();
        const tokenSymbol = specialMatch[2].trim();

        // 确保不是基础货币
        if (
          !["USD", "USDC", "BTC", "ETH", "BNB", "FDUSD"].includes(
            tokenSymbol
          ) &&
          !tokenSymbol.endsWith("USDT")
        ) {
          tokens.push({
            tokenName: tokenSymbol,
            projectName: projectName,
          });
          // 提取到代币信息后直接进入后处理阶段
          // 不再尝试其他模式，确保不会提取到错误的代币如TUSD
        }
      }

      // 如果通过特殊模式未找到代币信息，则继续使用其他模式
      if (tokens.length === 0) {
        // 通用的括号提取模式
        const regex = /([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9]+)\)/i;
        const match = processedTitle.match(regex);
        if (match) {
          const projectName = match[1].trim();
          const tokenSymbol = match[2].trim();

          // 确保不是基础货币
          if (
            !["USD", "USDC", "BTC", "ETH", "BNB", "FDUSD"].includes(
              tokenSymbol
            ) &&
            !tokenSymbol.endsWith("USDT")
          ) {
            tokens.push({
              tokenName: tokenSymbol,
              projectName: projectName,
            });
          }
        }
      }
    } else {
      // 模式1：标准格式 "Project Name (TOKEN)"，可能有多个
      // 修改正则表达式，确保能匹配包含特殊字符的项目名
      const regex = /([A-Za-z0-9'\s\.\-&]+?)\s*\(([A-Za-z0-9]+)\)/g;
      let match;

      // 使用处理后的标题进行匹配
      while ((match = regex.exec(processedTitle)) !== null) {
        const projectName = match[1].trim();
        const tokenSymbol = match[2].trim();

        // 检查代币是否是已知的合约后缀或基础货币
        if (
          tokenSymbol.endsWith("USDT") ||
          ["USD", "USDC", "BTC", "ETH", "BNB", "FDUSD", "BUSD", "JPY"].includes(
            tokenSymbol
          )
        ) {
          continue;
        }

        // 过滤掉一些不应该被当作项目名的词汇
        if (
          !projectName.match(
            /^(Binance|Will|on|in|to|and|by|Market|with|Add|Added|List)$/i
          ) &&
          tokenSymbol.length > 0
        ) {
          // 检查是否有重复添加
          if (!tokens.some((t) => t.tokenName === tokenSymbol)) {
            tokens.push({
              tokenName: tokenSymbol,
              projectName: projectName,
            });
          }
        }
      }

      // 模式2：查找带数字前缀的代币名，例如"1000CHEEMS"
      const alternateRegex = /([A-Za-z0-9'\s\.\-&]+?)\s*\((\d+[A-Za-z0-9]+)\)/g;
      while ((match = alternateRegex.exec(title)) !== null) {
        const projectName = match[1]
          .trim()
          .replace(
            /^(Binance Will Add|Binance Will List|Binance Adds|Add|Added|List)\s+/gi,
            ""
          );
        const tokenSymbol = match[2].trim();

        // 避免添加重复代币
        if (
          !tokens.some((t) => t.tokenName === tokenSymbol) &&
          tokenSymbol.length > 0
        ) {
          tokens.push({
            tokenName: tokenSymbol,
            projectName: projectName,
          });
        }
      }

      // 模式3：处理特殊情况 "代币1 and 代币2"
      if (processedTitle.includes(" and ")) {
        const parts = processedTitle.split(" and ");

        // 检查每个部分是否包含代币信息
        parts.forEach((part) => {
          part = part.trim();

          // 如果该部分不包含括号 (已经被模式1处理)，尝试提取代币信息
          if (!part.includes("(") && part.length > 0) {
            // 查找全大写的词作为可能的代币名，也支持数字前缀
            const symbolMatch = part.match(/\b(\d*[A-Z][A-Z0-9]{1,9})\b/);
            if (symbolMatch) {
              const tokenSymbol = symbolMatch[1];

              // 排除已知的非代币标识符
              if (
                !tokenSymbol.endsWith("USDT") &&
                ![
                  "USD",
                  "USDC",
                  "BTC",
                  "ETH",
                  "BNB",
                  "FDUSD",
                  "RFQ",
                  "AND",
                  "THE",
                  "TUSD",
                ].includes(tokenSymbol)
              ) {
                // 移除代币名后的其余部分可能是项目名
                let projectName = part
                  .replace(new RegExp("\\b" + tokenSymbol + "\\b", "g"), "")
                  .trim();

                // 删除可能存在的标点符号和前缀词
                projectName = projectName
                  .replace(/^[,.\s]+|[,.\s]+$/g, "")
                  .replace(/^(Add|Added|List)\s+/i, "");

                // 避免添加重复代币
                if (
                  !tokens.some((t) => t.tokenName === tokenSymbol) &&
                  tokenSymbol.length > 0
                ) {
                  tokens.push({
                    tokenName: tokenSymbol,
                    projectName: projectName.length > 0 ? projectName : null,
                  });
                }
              }
            }
          }
        });
      }
    }

    // 后处理：清理项目名称
    tokens.forEach((token) => {
      if (token.projectName) {
        // 移除项目名中的各种前缀词
        token.projectName = token.projectName
          .replace(/^(and|by|with|the|Add|Added|List|Subscription for)\s+/i, "")
          .replace(/\s+(and|by|with|the)\s+/i, " ")
          .replace(/\s+Token\s+Sale\s+on.*$/i, "") // 移除"Token Sale on"及其后面的内容
          .replace(/\s+Is\s+Now\s+Open.*$/i, "") // 移除"Is Now Open"及其后面的内容
          .trim();

        // 如果项目名只有一两个字符，可能不是有效的项目名
        if (token.projectName.length < 3) {
          token.projectName = null;
        }
      }
    });

    return tokens;
  }
}

module.exports = BinanceService;
