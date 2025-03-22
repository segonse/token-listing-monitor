const axios = require("axios");

class KucoinService {
  // 获取KuCoin新币上线公告
  static async getAnnouncements() {
    try {
      const response = await axios.get(
        "https://api.kucoin.com/api/v3/announcements",
        {
          params: {
            pageSize: 50,
            lang: "en_US",
          },
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === "200000" &&
        response.data.data &&
        response.data.data.items
      ) {
        // 不再过滤特定类型，直接使用所有公告
        const announcements = response.data.data.items;

        return announcements.map((item) => {
          // 判断公告类型
          let type = "others"; // 默认为其他
          const title = item.annTitle.toLowerCase();

          if (title.includes("pre-market")) {
            type = "pre-market";
          } else if (
            title.includes("listed") ||
            title.includes("gets listed")
          ) {
            type = "spot-listing";
          } else if (
            title.includes("futures") ||
            title.includes("perpetual contract")
          ) {
            type = "futures";
          }

          return {
            exchange: "KuCoin",
            title: item.annTitle,
            description: item.annDesc || item.annTitle,
            type: type,
            url: item.annUrl,
            publishTime: new Date(parseInt(item.cTime)),
          };
        });
      }

      return [];
    } catch (error) {
      console.error("获取KuCoin公告失败:", error.message);
      return [];
    }
  }
}

module.exports = KucoinService;
