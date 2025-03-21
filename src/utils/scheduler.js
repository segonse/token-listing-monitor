const cron = require("node-cron");
const MonitorService = require("../services/monitorService");

// 每10分钟检查一次
const scheduleMonitor = () => {
  console.log("启动定时监控任务，每10分钟检查一次新公告");

  cron.schedule("*/10 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] 执行定时检查任务`);
    await MonitorService.checkNewAnnouncements();
  });
};

module.exports = { scheduleMonitor };
