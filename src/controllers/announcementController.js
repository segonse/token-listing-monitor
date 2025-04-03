const Announcement = require("../models/Announcement");
const db = require("../config/database");

class AnnouncementController {
  // 获取所有公告
  static async getAllAnnouncements(req, res) {
    try {
      const announcements = await Announcement.findAll();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 新增: 根据筛选条件获取公告
  static async getFilteredAnnouncements(req, res) {
    try {
      const {
        exchanges, // 字符串"all"或交易所数组
        types, // 字符串"all"或类型数组
        tokenName, // 可选的代币名称
        projectName, // 可选的项目名称
        limit = 5, // 默认获取5条公告
      } = req.body;

      // 检查参数
      if (!exchanges) {
        return res.status(400).json({
          success: false,
          message: "交易所参数是必需的",
        });
      }

      if (!types) {
        return res.status(400).json({
          success: false,
          message: "公告类型参数是必需的",
        });
      }

      // 处理参数转换
      const filters = {
        exchanges:
          exchanges === "all"
            ? "all"
            : Array.isArray(exchanges)
            ? exchanges
            : [exchanges],
        types: types === "all" ? "all" : Array.isArray(types) ? types : [types],
        tokenName,
        projectName,
        limit: parseInt(limit),
      };

      const announcements = await Announcement.getFilteredAnnouncements(
        filters
      );

      res.json({
        success: true,
        count: announcements.length,
        data: announcements,
      });
    } catch (error) {
      console.error("获取筛选公告失败:", error.message);
      res.status(500).json({
        success: false,
        message: "获取筛选公告失败",
        error: error.message,
      });
    }
  }
}

module.exports = AnnouncementController;
