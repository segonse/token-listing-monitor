const axios = require("axios");

class OkxService {
  // 获取OKX新币上线公告
  static async getAnnouncements() {
    try {
      const response = await axios.get(
        "https://www.okx.com/api/v5/support/announcements",
        {
          params: {
            page: 1,
            annType: "announcements-new-listings",
          },
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
          let type = "spot-listing"; // 默认为现货上币
          if (item.title.toLowerCase().includes("pre-market")) {
            type = "pre-market";
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
