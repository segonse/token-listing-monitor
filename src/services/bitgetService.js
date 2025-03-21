const axios = require("axios");

class BitgetService {
  // 获取Bitget新币上线公告
  static async getAnnouncements() {
    try {
      const response = await axios.get(
        "https://api.bitget.com/api/v2/public/annoucements",
        {
          params: {
            language: "en_US",
            annType: "coin_listings",
          },
          timeout: 30000,
        }
      );

      if (
        response.data &&
        response.data.code === "00000" &&
        response.data.data
      ) {
        const announcements = response.data.data || [];

        return announcements.map((item) => {
          // 判断公告类型
          let type = "others"; // 默认为其他
          const title = item.annTitle.toLowerCase();

          if (title.includes("pre-market")) {
            type = "pre-market";
          } else if (title.includes("list")) {
            type = "spot-listing";
          }

          return {
            exchange: "Bitget",
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
      console.error("获取Bitget公告失败:", error.message);
      return [];
    }
  }
}

module.exports = BitgetService;
