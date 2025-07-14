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

// HTML页面的身份验证中间件（检查localStorage）
const htmlAuthMiddleware = (req, res, next) => {
  // 直接返回带认证的HTML页面
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>管理员认证</title>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: #f5f5f5;
        }
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .auth-form {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .auth-form h2 {
          color: #2c3e50;
          margin-bottom: 20px;
        }
        .auth-form input {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          box-sizing: border-box;
        }
        .auth-form button {
          width: 100%;
          padding: 12px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 10px;
        }
        .auth-form button:hover {
          background: #2980b9;
        }
        .error {
          color: #e74c3c;
          margin-top: 10px;
          display: none;
        }
        .loading {
          display: none;
          color: #7f8c8d;
        }
        #main-content {
          display: none;
        }
        #loading-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .loading-content {
          text-align: center;
          color: #7f8c8d;
        }
      </style>
    </head>
    <body>
      <!-- 初始加载页面 -->
      <div id="loading-page">
        <div class="loading-content">
          <h3>🔄 正在加载...</h3>
          <p>检查认证状态中</p>
        </div>
      </div>

      <div id="auth-page" class="auth-container">
        <div class="auth-form">
          <h2>🔐 管理员认证</h2>
          <p>请输入访问令牌：</p>
          <input type="password" id="token" placeholder="输入令牌" onkeypress="handleKeyPress(event)">
          <button onclick="authenticate()">登录</button>
          <div id="loading" class="loading">正在验证...</div>
          <div id="error" class="error">令牌无效，请重试</div>
        </div>
      </div>

      <div id="main-content">
        <!-- 这里将加载实际的管理界面 -->
      </div>

      <script>
        // 检查是否已有有效token
        function checkExistingAuth() {
          const token = localStorage.getItem('adminToken');
          if (token) {
            // 验证token有效性
            fetch('/admin/api/stats', {
              headers: {
                'Authorization': 'Bearer ' + token
              }
            })
            .then(response => {
              if (response.ok) {
                loadMainContent();
              } else {
                localStorage.removeItem('adminToken');
                showAuthForm();
              }
            })
            .catch(() => {
              localStorage.removeItem('adminToken');
              showAuthForm();
            });
          } else {
            showAuthForm();
          }
        }

        function hideLoading() {
          document.getElementById('loading-page').style.display = 'none';
        }

        function showAuthForm() {
          hideLoading();
          document.getElementById('auth-page').style.display = 'flex';
          document.getElementById('main-content').style.display = 'none';
        }

        function loadMainContent() {
          hideLoading();
          document.getElementById('auth-page').style.display = 'none';
          document.getElementById('main-content').style.display = 'block';

          // 加载实际的管理界面
          fetch('/admin/feedback-content')
            .then(response => response.text())
            .then(html => {
              document.getElementById('main-content').innerHTML = html;

              // 加载并执行JavaScript
              const script = document.createElement('script');
              script.src = '/admin/feedback.js';
              script.onload = function() {
                // JavaScript加载完成后，初始化页面
                if (typeof window.initializeFeedbackPage === 'function') {
                  setTimeout(window.initializeFeedbackPage, 200);
                }
              };
              document.head.appendChild(script);
            })
            .catch(error => {
              console.error('加载管理界面失败:', error);
              showAuthForm();
            });
        }

        function authenticate() {
          const token = document.getElementById('token').value.trim();
          if (!token) return;

          document.getElementById('loading').style.display = 'block';
          document.getElementById('error').style.display = 'none';

          // 验证token
          fetch('/admin/api/stats', {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          })
          .then(response => {
            document.getElementById('loading').style.display = 'none';
            if (response.ok) {
              // 认证成功，存储token
              localStorage.setItem('adminToken', token);
              loadMainContent();
            } else {
              document.getElementById('error').style.display = 'block';
            }
          })
          .catch(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
          });
        }

        function handleKeyPress(event) {
          if (event.key === 'Enter') {
            authenticate();
          }
        }

        // 页面加载时检查认证状态
        document.addEventListener('DOMContentLoaded', checkExistingAuth);
      </script>
    </body>
    </html>
  `);
};

// 反馈管理页面（带认证）
router.get("/feedback", htmlAuthMiddleware);

// 反馈管理内容页面（无认证，由前端JavaScript控制）
router.get("/feedback-content", (req, res) => {
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
