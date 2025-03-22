const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class OkxService {
  // 获取OKX新币上线公告
  static async getAnnouncements() {
    try {
      // 获取随机代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: proxyConfig,
      });

      const response = await axios.get(
        "https://www.okx.com/api/v5/support/announcements",
        {
          params: {
            page: 1,
            annType: "announcements-new-listings",
          },
          // 添加代理配置
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
          // 判断公告类型
          let type = "others"; // 默认为其他
          if (item.title.toLowerCase().includes("pre-market")) {
            type = "pre-market";
          } else if (item.title.toLowerCase().includes("spot trading")) {
            type = "spot-listing";
          }

          return {
            exchange: "OKX",
            title: item.title,
            description: item.title, // OKX没有description字段，使用title代替
            type: type,
            url: item.url,
            publishTime: new Date(parseInt(item.pTime)),
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取OKX公告失败:", error.message);
      return [];
    }
  }
}

module.exports = OkxService;
