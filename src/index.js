const express = require("express");
const db = require("./config/database");
const { initDatabase } = require("./utils/dbInit");
const { scheduleMonitor } = require("./utils/scheduler");
const routes = require("./routes");
const MonitorService = require("./services/monitorService");
const Announcement = require("./models/Announcement");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3153;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use("/api", routes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 立即执行一次检查（手动触发）
app.post("/api/monitor/check-now", async (req, res) => {
  try {
    console.log("手动触发检查");
    await MonitorService.checkNewAnnouncements();
    res.json({ success: true, message: "检查完成" });
  } catch (error) {
    console.error("手动检查失败:", error.message);
    res.status(500).json({ success: false, message: "检查失败" });
  }
});

// 手动获取历史数据
app.post("/api/monitor/fetch-history", async (req, res) => {
  try {
    console.log("手动获取历史数据");
    const success = await MonitorService.fetchHistoricalAnnouncements();
    if (success) {
      res.json({ success: true, message: "历史数据获取完成" });
    } else {
      res.status(500).json({ success: false, message: "历史数据获取失败" });
    }
  } catch (error) {
    console.error("获取历史数据失败:", error.message);
    res.status(500).json({ success: false, message: "历史数据获取失败" });
  }
});

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error("数据库初始化失败，应用无法启动");
      process.exit(1);
    }

    // 启动定时任务
    scheduleMonitor();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口: ${PORT}`);
      console.log(`API可通过 http://localhost:${PORT}/api 访问`);
    });

    // 首次启动时检查是否需要获取历史数据
    try {
      const [existingAnnouncements] = await db.query(
        "SELECT COUNT(*) as count FROM announcements"
      );

      if (existingAnnouncements[0].count === 0) {
        console.log("首次启动，自动获取历史数据...");
        setTimeout(async () => {
          await MonitorService.fetchHistoricalAnnouncements();
        }, 5000); // 延迟5秒后开始获取历史数据
      }
    } catch (error) {
      console.error("检查历史数据失败:", error.message);
      // 不要让这个错误影响服务启动
    }
  } catch (error) {
    console.error("服务器启动失败:", error.message);
    process.exit(1);
  }
};

startServer();
