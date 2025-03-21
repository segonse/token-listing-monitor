const axios = require("axios");

class BybitService {
  // 获取盘前交易公告
  static async getPreMarketAnnouncements() {
    try {
      const response = await axios.get(
        "https://api.bybit.com/v5/announcements/index",
        {
          params: {
            locale: "zh-TW",
            limit: 100,
            tag: "Pre-Market",
          },
        }
      );

      if (response.data && response.data.retCode === 0) {
        return response.data.result.list.map((item) => ({
          exchange: "Bybit",
          title: item.title,
          description: item.description,
          type: "pre-market",
          url: item.url,
          publishTime: new Date(parseInt(item.publishTime)),
        }));
      }

      return [];
    } catch (error) {
      console.error("获取Bybit盘前交易公告失败:", error.message);
      return [];
    }
  }

  // 获取现货上币公告
  static async getSpotListingAnnouncements() {
    try {
      const response = await axios.get(
        "https://api.bybit.com/v5/announcements/index",
        {
          params: {
            locale: "zh-TW",
            limit: 100,
            tag: "Spot Listings",
          },
        }
      );

      if (response.data && response.data.retCode === 0) {
        return response.data.result.list.map((item) => ({
          exchange: "Bybit",
          title: item.title,
          description: item.description,
          type: "spot-listing",
          url: item.url,
          publishTime: new Date(parseInt(item.publishTime)),
        }));
      }

      return [];
    } catch (error) {
      console.error("获取Bybit现货上币公告失败:", error.message);
      return [];
    }
  }

  // 获取所有相关公告
  static async getAllAnnouncements() {
    const preMarketAnnouncements = await this.getPreMarketAnnouncements();
    const spotListingAnnouncements = await this.getSpotListingAnnouncements();

    return [...preMarketAnnouncements, ...spotListingAnnouncements];
  }
}

module.exports = BybitService;
