const cron = require("node-cron");
const MonitorService = require("../services/monitorService");

// 每10分钟检查一次
const scheduleMonitor = () => {
  // 每10分钟检查一次新公告
  cron.schedule("*/10 * * * *", async () => {
    console.log(`[${new Date().toLocaleString()}] 开始定时任务: 检查新公告...`);
    try {
      await MonitorService.checkNewAnnouncements();
    } catch (error) {
      console.error("定时任务执行失败:", error);
    }
  });

  console.log("启动定时监控任务，每10分钟检查一次新公告");
  return true;
};

module.exports = { scheduleMonitor };
