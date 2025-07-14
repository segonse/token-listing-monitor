const { Markup } = require("telegraf");
const FeedbackService = require("../feedbackService");
const menus = require("./menus");
const queries = require("./queries");

function setupCommands(bot) {
  // 处理/start命令
  bot.bot.command("start", async (ctx) => {
    const telegramChatId = ctx.chat.id.toString();
    const telegramUsername = ctx.from.username || "";
    const userId = `tg_${telegramChatId}`;

    try {
      await queries.createOrUpdateUser(telegramChatId, telegramUsername);

      // 检查是否为管理员
      const isAdmin = await FeedbackService.isAdmin(userId);

      let welcomeMessage = "欢迎使用代币监控机器人！";
      if (isAdmin) {
        welcomeMessage += "\n\n🔧 您拥有管理员权限";
      }
      welcomeMessage += "\n\n请选择以下功能：";

      return ctx.reply(welcomeMessage, menus.getMainMenu(isAdmin));
    } catch (error) {
      console.error("创建/更新Telegram用户失败:", error);
      return ctx.reply("初始化失败，请稍后重试。");
    }
  });

  // 处理/help命令
  bot.bot.command("help", (ctx) => {
    return ctx.reply(
      "可用命令:\n" +
        "/start - 显示主菜单\n" +
        "/help - 显示帮助信息\n" +
        "/status - 查看系统状态\n" +
        "/exchanges - 查看支持的交易所\n" +
        "您也可以点击菜单按钮使用更多功能"
    );
  });

  // 处理/status命令
  bot.bot.command("status", async (ctx) => {
    try {
      const telegramChatId = ctx.chat.id.toString();
      const userId = `tg_${telegramChatId}`;

      const stats = await queries.getUserStats(userId);
      if (!stats) {
        return ctx.reply("您尚未注册，请发送 /start 开始使用");
      }

      return ctx.reply(stats.message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("获取状态失败:", error);
      return ctx.reply("获取状态信息失败");
    }
  });

  // 处理/exchanges命令
  bot.bot.command("exchanges", async (ctx) => {
    try {
      const exchanges = await queries.getExchangesList();
      let message = "支持的交易所列表:\n";

      exchanges.forEach((exchange) => {
        message += `- ${exchange}\n`;
      });

      return ctx.reply(
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback("查询公告", "check_history_announcements")],
        ])
      );
    } catch (error) {
      console.error("获取交易所列表失败:", error);
      return ctx.reply("获取交易所列表失败，请稍后再试");
    }
  });
}

function getMainMenu(isAdmin = false) {
  return menus.getMainMenu(isAdmin);
}

module.exports = {
  setupCommands,
  getMainMenu,
};
