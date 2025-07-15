const express = require("express");
const path = require("path");
const db = require("./config/database");
const { initDatabase } = require("./utils/dbInit");
const { scheduleMonitor } = require("./utils/scheduler");
const routes = require("./routes");
const adminRoutes = require("./web/routes/adminRoutes");
const MonitorService = require("./services/monitorService");
const telegramBot = require("./services/telegramBot/index");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3153;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于管理界面）
app.use("/admin", express.static(path.join(__dirname, "web/admin")));

// 路由
app.use("/api", routes);
app.use("/admin", adminRoutes);

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
    // scheduleMonitor();

    // 启动Telegram Bot
    telegramBot.launch();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口: ${PORT}`);
      console.log(`API可通过 http://localhost:${PORT}/api 访问`);
    });

    // 首次启动时检查是否需要获取历史数据
    try {
      // 获取各交易所的公告数量
      const [binanceCount] = await db.query(
        "SELECT COUNT(*) as count FROM announcements WHERE exchange = 'Binance'"
      );
      const [okxCount] = await db.query(
        "SELECT COUNT(*) as count FROM announcements WHERE exchange = 'OKX'"
      );
      const [bitgetCount] = await db.query(
        "SELECT COUNT(*) as count FROM announcements WHERE exchange = 'Bitget'"
      );

      const needsHistoricalData = {
        binance: binanceCount[0].count === 1,
        okx: okxCount[0].count === 1,
        bitget: bitgetCount[0].count === 1,
      };

      // 如果任何一个交易所需要历史数据，则进行获取
      if (
        needsHistoricalData.binance ||
        needsHistoricalData.okx ||
        needsHistoricalData.bitget
      ) {
        console.log("首次启动，自动获取历史数据...");
        console.log(
          `需要获取: ${needsHistoricalData.binance ? "Binance " : ""}${
            needsHistoricalData.okx ? "OKX " : ""
          }${needsHistoricalData.bitget ? "Bitget" : ""}`
        );

        setTimeout(async () => {
          // 传入需要获取的交易所参数
          await MonitorService.fetchHistoricalAnnouncements(
            needsHistoricalData
          );
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
