const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class HtxService {
  // 获取HTX新币上线公告
  static async getAnnouncements() {
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
        "https://www.htx.com/-/x/support/public/getList/v2",
        {
          params: {
            language: "zh-cn",
            page: 1,
            limit: 20,
            oneLevelId: 360000031902,
            twoLevelId: 360000039942,
            "x-b3-traceid": "6a52bbb4ad127139cb8bd611052d40bb",
          },
          // 添加代理配置
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === 200 &&
        response.data.data &&
        response.data.data.list
      ) {
        const announcements = response.data.data.list || [];

        return announcements.map((item) => {
          // 判断公告类型
          let type = "others"; // 默认为其他类型

          // 检查是否为现货上市
          if (item.dealPair && item.dealPair.startsWith("spot_")) {
            type = "spot-listing";
          }

          // 构建URL
          const url = `https://www.htx.com/support/zh-cn/detail/${item.id}`;

          return {
            exchange: "HTX",
            title: item.title,
            description: item.title, // HTX没有description字段，使用title代替
            type: type,
            url: url,
            publishTime: new Date(parseInt(item.showTime)),
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取HTX公告失败:", error.message);
      return [];
    }
  }
}

module.exports = HtxService;
