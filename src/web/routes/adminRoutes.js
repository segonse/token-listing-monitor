const express = require("express");
const path = require("path");
const FeedbackService = require("../../services/feedbackService");

const router = express.Router();

// 简单的身份验证中间件
const authMiddleware = (req, res, next) => {
  // 这里可以实现更复杂的身份验证
  // 目前使用简单的密码验证
  const auth = req.headers.authorization;

  if (!auth || auth !== "Bearer admin1234gsq") {
    res.status(401).json({ error: "未授权访问" });
    return;
  }

  next();
};

// HTML页面的身份验证中间件（更宽松）
const htmlAuthMiddleware = (req, res, next) => {
  // 检查查询参数中的token
  const token = req.query.token;
  const auth = req.headers.authorization;

  if (token === "admin1234gsq" || (auth && auth === "Bearer admin1234gsq")) {
    next();
  } else {
    // 返回简单的认证页面
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>管理员认证</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .auth-form { max-width: 400px; margin: 0 auto; }
          input { padding: 10px; margin: 10px; width: 200px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="auth-form">
          <h2>🔐 管理员认证</h2>
          <p>请输入访问令牌：</p>
          <input type="password" id="token" placeholder="输入令牌">
          <br>
          <button onclick="authenticate()">访问</button>
        </div>
        <script>
          function authenticate() {
            const token = document.getElementById('token').value;
            if (token) {
              window.location.href = '/admin/feedback?token=' + token;
            }
          }
        </script>
      </body>
      </html>
    `);
  }
};

// 反馈管理页面
router.get("/feedback", htmlAuthMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "../admin/feedback.html"));
});

// 获取反馈列表API
router.get("/api/feedback", authMiddleware, async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    const filters = { limit: parseInt(limit) };

    if (status) filters.status = status;
    if (type) filters.type = type;

    const feedbacks = await FeedbackService.getAllFeedbacks(filters);
    const stats = await FeedbackService.getFeedbackStats();

    res.json({
      success: true,
      data: {
        feedbacks,
        stats,
        total: feedbacks.length,
      },
    });
  } catch (error) {
    console.error("获取反馈列表失败:", error);
    res.status(500).json({
      success: false,
      error: "获取反馈列表失败",
    });
  }
});

// 获取反馈详情API
router.get("/api/feedback/:id", authMiddleware, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const [feedbacks] = await require("../../config/database").query(
      `SELECT f.*, u.user_id as telegram_user_id, a.name as admin_name
       FROM user_feedback f
       JOIN users u ON f.user_id = u.id
       LEFT JOIN admins a ON f.admin_id = a.id
       WHERE f.id = ?`,
      [feedbackId]
    );

    if (feedbacks.length === 0) {
      return res.status(404).json({
        success: false,
        error: "反馈不存在",
      });
    }

    res.json({
      success: true,
      data: feedbacks[0],
    });
  } catch (error) {
    console.error("获取反馈详情失败:", error);
    res.status(500).json({
      success: false,
      error: "获取反馈详情失败",
    });
  }
});

// 更新反馈状态API
router.put("/api/feedback/:id/status", authMiddleware, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { status } = req.body;

    if (!["pending", "in_progress", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "无效的状态值",
      });
    }

    const success = await FeedbackService.updateFeedbackStatus(
      feedbackId,
      status
    );

    if (success) {
      res.json({ success: true, message: "状态更新成功" });
    } else {
      res.status(500).json({
        success: false,
        error: "状态更新失败",
      });
    }
  } catch (error) {
    console.error("更新反馈状态失败:", error);
    res.status(500).json({
      success: false,
      error: "更新反馈状态失败",
    });
  }
});

// 添加管理员回复API
router.post("/api/feedback/:id/reply", authMiddleware, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "回复内容不能为空",
      });
    }

    // 这里应该获取当前管理员ID，暂时使用1
    const adminId = 1;

    const success = await FeedbackService.addAdminReply(
      feedbackId,
      reply.trim(),
      adminId
    );

    if (success) {
      res.json({ success: true, message: "回复添加成功" });
    } else {
      res.status(500).json({
        success: false,
        error: "回复添加失败",
      });
    }
  } catch (error) {
    console.error("添加管理员回复失败:", error);
    res.status(500).json({
      success: false,
      error: "添加管理员回复失败",
    });
  }
});

// 获取反馈统计API
router.get("/api/stats", authMiddleware, async (req, res) => {
  try {
    const stats = await FeedbackService.getFeedbackStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("获取反馈统计失败:", error);
    res.status(500).json({
      success: false,
      error: "获取反馈统计失败",
    });
  }
});

module.exports = router;
