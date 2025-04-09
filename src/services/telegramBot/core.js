const { Telegraf } = require("telegraf");
require("dotenv").config();
const commands = require("./commands");
const actions = require("./actions");

class TelegramBot {
  constructor() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("错误: 未设置TELEGRAM_BOT_TOKEN环境变量");
      return;
    }

    this.bot = new Telegraf(botToken);
    this.userSelections = {};
    this.userStates = {};

    // 初始化命令和动作
    commands.setupCommands(this);
    actions.setupActions(this);

    // 处理未知命令
    this.bot.on("text", (ctx) => {
      const text = ctx.message.text;
      const chatId = ctx.chat.id.toString();

      // 检查是否是等待输入模式
      if (this.userStates && this.userStates[chatId]) {
        // 这部分由actions模块处理
        return actions.handleTextInput(this, ctx);
      }

      // 未知命令或文本消息
      if (text.startsWith("/")) {
        // 未知命令
        ctx.reply("未识别的命令。发送 /help 获取可用命令列表。");
      } else {
        // 普通文本消息
        ctx.reply(
          "您好！请使用菜单按钮或发送 /help 查看可用命令。",
          commands.getMainMenu()
        );
      }
    });
  }

  launch() {
    if (!this.bot) {
      console.error("无法启动Telegram Bot: 配置不完整");
      return false;
    }

    try {
      this.bot.launch();
      console.log("Telegram Bot 已启动");

      // 优雅地处理停止信号
      process.once("SIGINT", () => this.bot.stop("SIGINT"));
      process.once("SIGTERM", () => this.bot.stop("SIGTERM"));

      return true;
    } catch (error) {
      console.error("启动Telegram Bot失败:", error);
      return false;
    }
  }
}

module.exports = TelegramBot;
