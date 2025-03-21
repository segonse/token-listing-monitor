const axios = require("axios");
const tunnel = require("tunnel");

class BinanceService {
  // 获取Binance新币上线公告
  static async getAnnouncements() {
    try {
      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: process.env.PROXY_HOST || "192.168.1.33",
          port: parseInt(process.env.PROXY_PORT || "7890"),
          proxyAuth: `${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}`,
        },
      });

      const response = await axios.get(
        "https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query",
        {
          params: {
            type: 1,
            pageNo: 1,
            pageSize: 50,
            catalogId: 48, // 新币上线分类
          },
          // 添加代理配置
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
          // 判断公告类型
          let type = "others"; // 默认为其他

          const title = item.title.toLowerCase();

          // 处理特殊情况：先检查是否是结束盘前并上新币的公告
          if (
            title.includes("end the") &&
            title.includes("pre-market") &&
            title.includes("list")
          ) {
            type = "spot-listing";
          }
          // 处理同时包含盘前和launchpool的情况
          else if (
            title.includes("pre-market") &&
            (title.includes("launchpool") || title.includes("launchpad"))
          ) {
            // 区分launchpool和launchpad
            if (title.includes("launchpool")) {
              type = "盘前交易+launchpool";
            } else {
              type = "盘前交易+launchpad";
            }
          }
          // 检查是否是普通上币公告
          else if (title.includes("list") && !title.includes("pre-market")) {
            type = "spot-listing";
          }
          // 检查是否是盘前公告
          else if (title.includes("pre-market")) {
            type = "pre-market";
          }
          // 区分launchpool和launchpad
          else if (title.includes("launchpool")) {
            type = "launchpool";
          } else if (title.includes("launchpad")) {
            type = "launchpad";
          }

          // 构建公告对象
          return {
            exchange: "Binance",
            title: item.title,
            description: item.title, // Binance API中没有返回描述，使用标题代替
            type: type,
            url: `https://www.binance.com/zh-CN/support/announcement/detail/${item.code}`,
            publishTime: new Date(parseInt(item.releaseDate)),
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取Binance公告失败:", error.message);
      return [];
    }
  }
}

module.exports = BinanceService;
