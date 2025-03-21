const express = require("express");
const router = express.Router();
const TokenController = require("../controllers/tokenController");
const AnnouncementController = require("../controllers/announcementController");

// Token相关路由
router.get("/tokens", TokenController.getAllTokens);
router.post("/tokens", TokenController.addToken);
router.delete("/tokens/:id", TokenController.deleteToken);

// 公告相关路由
router.get("/announcements", AnnouncementController.getAllAnnouncements);
router.get(
  "/announcements/token/:tokenId",
  AnnouncementController.getAnnouncementsByTokenId
);

module.exports = router;
