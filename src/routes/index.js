const express = require("express");
const router = express.Router();
const TokenController = require("../controllers/tokenController");
const AnnouncementController = require("../controllers/announcementController");

// Token相关路由
router.get("/tokens", TokenController.getAllTokens);
router.get("/tokens/search", TokenController.searchTokens); // 搜索代币
router.get("/tokens/:id", TokenController.getTokenById); // 获取代币详情
router.post("/tokens", TokenController.addToken);
router.delete("/tokens/:id", TokenController.deleteToken);

// 公告相关路由
router.get("/announcements", AnnouncementController.getAllAnnouncements);
// 新增: 根据筛选条件获取历史公告
router.post(
  "/announcements/filter",
  AnnouncementController.getFilteredAnnouncements
);

module.exports = router;
