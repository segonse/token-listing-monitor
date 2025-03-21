const Announcement = require("../models/Announcement");
const db = require("../config/database");

class AnnouncementController {
  // 获取所有公告
  static async getAllAnnouncements(req, res) {
    try {
      const announcements = await Announcement.findAll();
      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      console.error("获取公告列表失败:", error.message);
      res.status(500).json({
        success: false,
        message: "获取公告列表失败",
      });
    }
  }

  // 获取特定代币的公告
  static async getAnnouncementsByTokenId(req, res) {
    try {
      const { tokenId } = req.params;

      // 查询数据库
      const [announcements] = await db.query(
        "SELECT * FROM announcements WHERE token_id = ? ORDER BY publishTime DESC",
        [tokenId]
      );

      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      console.error("获取代币公告失败:", error.message);
      res.status(500).json({
        success: false,
        message: "获取代币公告失败",
      });
    }
  }
}

module.exports = AnnouncementController;
